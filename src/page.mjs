import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import {
  brain, config, db, draft, joinPeople, keepApart, now, root,
  saveBrain, saveConfig, updateDraft,
} from './store.mjs'
import * as view from './view.mjs'
import { busy, runJob } from './jobs.mjs'
import { talk } from './talk.mjs'
import { setToken, tg } from './telegram.mjs'
import { publish } from './pages.mjs'
import { pressed } from './winotch.mjs'
import * as setup from './setup.mjs'
import { connections, machine, notYet } from './connections.mjs'

// The screen is the built React app in ui/dist (npm run build inside ui).
const files = join(root, 'ui', 'dist')
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml',
}

const reads = {
  today: () => view.today(),
  status: () => ({ ...view.status(), telegram: tg, busy: busy(), next: config().everyMinutes }),
  people: () => view.people(),
  trace: id => view.trace(Number(id)),
  heard: () => view.heard(),
  reports: () => view.reports(),
  chat: () => view.chat(),
  problems: () => view.problems(),
  brain: () => ({ text: brain(), topics: config().topics, rooms: config().redditRooms }),
  setup: () => setup.state(),
  connections: async () => ({ list: await connections(), notYet, machine: await machine() }),
}

// The folders and names a person can change from the Connections page.
// A folder that does not exist is refused, so a typo is caught at once.
function settings(body) {
  const c = config()
  for (const key of ['repo', 'docs']) {
    if (!(key in body)) continue
    const folder = String(body[key] || '').trim()
    if (folder && !existsSync(folder)) throw new Error(`${folder} was not found on this computer.`)
    c[key] = folder || null
  }
  if (body.me && typeof body.me === 'object') {
    c.me = Object.fromEntries(Object.entries({ ...c.me, ...body.me })
      .map(([k, v]) => [k, String(v || '').trim().replace(/^@|^u\//, '')]).filter(([, v]) => v))
  }
  saveConfig(c)
}

// The two lists a person edits: the topic words a post must contain, and
// the Reddit rooms that are read.
function words(key, change) {
  const c = config()
  const list = new Set(c[key])
  for (const p of change.add || []) list.add(key === 'topics' ? p.trim().toLowerCase() : p.trim().replace(/^r\//, ''))
  for (const p of change.remove || []) list.delete(p)
  list.delete('')
  saveConfig({ ...c, [key]: [...list] })
}

const writes = {
  draft: (id, body) => { if (draft(Number(id))) updateDraft(Number(id), body) },
  // A button pressed in winotch on a draft, in its feed or its list (body.type
  // 'item'): Posted or Drop. Both carry the same action ids.
  winotch: (_, body) => {
    const press = pressed(body.action)
    if (press && draft(press.id)) updateDraft(press.id, { status: press.status })
  },
  join: (_, body) => joinPeople(Number(body.keep), Number(body.gone)),
  apart: (_, body) => keepApart(Number(body.a), Number(body.b)),
  topics: (_, body) => words('topics', body),
  rooms: (_, body) => words('redditRooms', body),
  brain: (_, body) => { if (typeof body.text === 'string' && body.text.trim()) saveBrain(body.text) },
  run: id => { runJob(id) },
  telegram: (_, body) => setToken(body.token),
  settings: (_, body) => settings(body),
  // The setup's steps, in order: test, interview, draft, finish.
  setup: (step, body) => ({ test: setup.test, interview: setup.interview, draft: setup.draft, finish: setup.finish })[step]?.(body),
  // An answer page: the founder's edit, and whether it may go on the public site.
  answerpage: (id, body) => {
    if (typeof body.body === 'string') db.prepare('update pages set body = ? where id = ?').run(body.body, Number(id))
    if (['draft', 'approved', 'dropped'].includes(body.status)) db.prepare('update pages set status = ? where id = ?').run(body.status, Number(id))
    publish()
  },
  // The founder's word on a verdict: kept as given, and not judged again
  // unless the document behind it changes.
  verdict: (id, body) => {
    if (!['planned', 'partly', 'not_found', 'unclear', 'out_of_scope'].includes(body.verdict)) return
    db.prepare(`insert into verdicts (theme_id, verdict, why, confirmed, at) values (?, ?, 'Set by you.', 1, ?)
      on conflict (theme_id) do update set verdict = excluded.verdict, confirmed = 1, at = excluded.at`)
      .run(Number(id), body.verdict, now())
  },
  // On the screen the drafts are already in the Inbox, so a pipeline asked
  // for here only needs the work done; nothing is handed over one by one.
  talk: async (_, body) => {
    const { reply, then } = await talk(String(body.text || '').slice(0, 4000), 'screen')
    if (then === 'pipeline') runJob('cycle').then(() => runJob('daily'))
    return { reply }
  },
}

const json = (res, value, status = 200) => {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(value ?? { ok: true }))
}

const body = req => new Promise((resolve, reject) => {
  let text = ''
  req.on('data', chunk => { text += chunk })
  req.on('end', () => { try { resolve(JSON.parse(text || '{}')) } catch (err) { reject(err) } })
})

export function page() {
  const { port } = config()
  const server = createServer(async (req, res) => {
    // Only this computer's own screen may talk to it, never another site in the browser.
    if (req.headers.host !== `localhost:${port}` && req.headers.host !== `127.0.0.1:${port}`) return json(res, { error: 'no' }, 403)
    const [, first, name, id] = new URL(req.url, 'http://x').pathname.split('/')
    try {
      if (first === 'api' && req.method === 'GET' && reads[name]) return json(res, await reads[name](id))
      if (first === 'api' && req.method === 'POST' && writes[name]) {
        if (!String(req.headers['content-type']).startsWith('application/json')) return json(res, { error: 'no' }, 415)
        return json(res, await writes[name](id, await body(req)))
      }
      if (req.method !== 'GET') return json(res, { error: 'not found' }, 404)
      const file = normalize(join(files, first ? new URL(req.url, 'http://x').pathname : 'index.html'))
      if (!file.startsWith(files) || !types[extname(file)]) return json(res, { error: 'not found' }, 404)
      if (!existsSync(join(files, 'index.html'))) {
        res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' })
        return res.end('The screen is not built yet. Run "npm run build" in the gtm.js folder, then reload this page.')
      }
      res.writeHead(200, { 'content-type': types[extname(file)], 'cache-control': 'no-store' })
      res.end(readFileSync(file))
    } catch (err) {
      json(res, { error: err.message }, err.code === 'ENOENT' ? 404 : 500)
    }
  })
  // A second copy must not run beside the first: it leaves, and says so with its exit code.
  server.on('error', err => { if (err.code === 'EADDRINUSE') process.exit(3); throw err })
  server.listen(port, '127.0.0.1', () => console.log(`gtm.js is on http://localhost:${port}`))
}
