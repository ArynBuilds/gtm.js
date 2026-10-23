import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// gtm.js on winotch, the island at the top of the screen, when it runs on
// this computer. Each new draft shows in its feed at once, with a link that opens
// it where it gets posted, and two buttons: Posted and Drop. The drafts still
// open are also its list, shown when gtm.js is expanded on the island, with
// the same buttons. A press comes back to the screen's server (page.mjs,
// /api/winotch). Nothing is posted from here. When winotch is not running,
// every call quietly does nothing.

const APP = { id: 'gtm', name: 'gtm.js', sign: '--.' }

// Where a post is written: the platform's own box, already filled (view.mjs).
const compose = {
  x: 'https://x.com/intent/post?text=',
  bluesky: 'https://bsky.app/intent/compose?text=',
  linkedin: 'https://www.linkedin.com/feed/?shareActive=true&text=',
}

function api() {
  const dir = process.platform === 'win32'
    ? join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'winotch')
    : join(process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'winotch')
  try { return JSON.parse(readFileSync(join(dir, 'api.json'), 'utf8')) } catch { return null }
}

// True while winotch runs on this computer: it leaves this file for its apps.
export const present = () => Boolean(api())

async function call(path, body) {
  const where = api()
  if (!where) return null
  try {
    const res = await fetch(where.url + path, {
      method: 'POST',
      headers: { authorization: `Bearer ${where.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    })
    return res.ok ? res.json() : null
  } catch { return null }
}

const waiting = count => count === 1 ? '1 draft waiting' : `${count} drafts waiting`

// Cut by characters, not UTF-16 halves: a split emoji would make winotch refuse the JSON.
const cut = (text, n) => Array.from(text).slice(0, n).join('')

// Where a draft gets posted: the post it answers, or the platform's own box.
const link = d => d.kind === 'reply'
  ? d.eventUrl || undefined
  : compose[d.platform] ? compose[d.platform] + encodeURIComponent(d.text) : undefined

const headline = d => d.kind === 'reply'
  ? `Reply draft on ${d.platform}${d.eventTitle ? `: ${d.eventTitle}` : ''}`
  : `Post draft for ${d.platform}`

// The same ids as the notifications', so one handler serves both presses.
const buttons = d => [{ id: `posted:${d.id}`, label: 'Posted' }, { id: `drop:${d.id}`, label: 'Drop' }]

// An open draft as a row of winotch's list: its first line, then what it is.
function item(d) {
  const first = d.text.split('\n').map(line => line.trim()).find(Boolean)
  const url = link(d)
  return {
    id: String(d.id),
    title: cut(first || headline(d), 200),
    subtitle: cut(headline(d), 300),
    time: Date.parse(d.created) || undefined,
    // winotch refuses a list with a link past 1024 characters; a long post's box opens from the screen.
    url: url && url.length <= 1024 && /^https?:/.test(url) ? url : undefined,
    actions: buttons(d),
  }
}

// Joins winotch, or says again what the pill shows, then hands over the open
// drafts (openDrafts in store.mjs, newest first) as its list. `port` is the
// screen's, where the buttons' presses come back.
export async function joinWinotch(port, drafts) {
  const joined = await call('/v1/apps', {
    ...APP, callback: `http://127.0.0.1:${port}/api/winotch`, status: waiting(drafts.length),
  })
  if (!joined) return null
  // The list is replaced whole; no drafts clears it. winotch takes at most 50.
  await call('/v1/items', {
    app: APP.id,
    status: waiting(drafts.length),
    sections: drafts.length ? [{ title: 'Drafts', items: drafts.slice(0, 50).map(item) }] : [],
  })
  return joined
}

// A new draft: one notification, with its own link and buttons. `drafts`
// already holds it, so the list gains it too.
export async function announceDraft(port, drafts, d) {
  if (!await joinWinotch(port, drafts)) return
  await call('/v1/notify', {
    app: APP.id,
    title: headline(d),
    body: cut(d.text, 500),
    url: link(d),
    importance: 'normal',
    actions: buttons(d),
  })
}

// "posted:42" → { status: 'posted', id: 42 }, or nothing for anything else.
// The same for a notification's press and a list item's ({ type: 'item', ... }).
export function pressed(action) {
  const [what, id] = String(action || '').split(':')
  const status = { posted: 'posted', drop: 'dropped' }[what]
  return status && Number(id) > 0 ? { status, id: Number(id) } : null
}
