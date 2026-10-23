import { askJson } from './ask.mjs'
import { addDraft, brain, config, db, isMain, note, now } from './store.mjs'

// Moments when people are open to changing tools: a serious outage at a
// tool they depend on, or that tool making the Hacker News front page.
db.exec(`create table if not exists alerts (
  key text primary key, tool text not null, kind text not null, title text not null,
  url text, why text, at text not null, told integer not null default 0)`)

const task = `
Something just happened at a tool many of our people depend on. Decide for the
founder described in THE BRAIN whether it is a moment worth their attention.
- "worth": true only when its users are really affected or are rethinking
  their choice right now (a serious outage, a price rise, a shutdown, an
  acquisition, a licence change). Routine news is false.
- "why": one plain sentence on what happened and why it matters to them.
- "post": when worth is true, one post they could send, at most 270
  characters, following the brain's voice exactly. It must help or inform
  people who are affected. It must never gloat, never talk down the tool, and
  never use the trouble to promote. Leave it empty when nothing helpful can
  be said.
Answer with only a JSON object: {"worth": false, "why": "", "post": ""}
`

async function statusPages(watch) {
  const found = []
  for (const [tool, url] of Object.entries(watch)) {
    try {
      const page = await (await fetch(url, { signal: AbortSignal.timeout(10000) })).json()
      // Small hiccups happen every day. Only the serious ones count.
      for (const i of page.incidents || []) {
        if (!['major', 'critical'].includes(i.impact)) continue
        found.push({ key: `status:${i.id}`, tool, kind: 'outage', title: i.name, url: i.shortlink || page.page?.url, at: i.created_at })
      }
    } catch { /* a status page that does not answer is not news */ }
  }
  return found
}

async function frontPage(names) {
  const res = await fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=40', { signal: AbortSignal.timeout(10000) })
  const found = []
  for (const h of (await res.json()).hits) {
    const tool = names.find(n => new RegExp(`(^|[^a-z0-9])${n.replace(/[.]/g, '\\.')}([^a-z0-9]|$)`, 'i').test(h.title))
    if (tool) found.push({ key: `hn:${h.objectID}`, tool, kind: 'news', title: h.title, url: `https://news.ycombinator.com/item?id=${h.objectID}`, at: h.created_at })
  }
  return found
}

// Run with every cycle. Anything new is judged once; what is worth their time
// is kept as an alert, with a post drafted when there is something helpful to say.
export async function switching() {
  const { switchStatus = {}, switchNames = [] } = config()
  let found
  try { found = [...await statusPages(switchStatus), ...await frontPage(switchNames)] } catch { return 0 }
  const seen = db.prepare('select 1 from alerts where key = ?')
  const fresh = found.filter(f => !seen.get(f.key))
  let kept = 0
  for (const f of fresh) {
    const a = await askJson(`THE BRAIN\n${brain()}\n\nTHE TASK\n${task}\nWHAT HAPPENED\n${JSON.stringify(f)}`)
    // Kept either way, so it is never judged twice. Only the worthy ones are shown.
    db.prepare('insert into alerts (key, tool, kind, title, url, why, at, told) values (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(f.key, f.tool, f.kind, f.title, f.url ?? null, a.worth ? String(a.why || '') : null, f.at || now(), a.worth ? 0 : 1)
    if (!a.worth) continue
    kept++
    if (a.post) addDraft('post', 'x', String(a.post))
  }
  if (kept) note('switching', `${kept} switching ${kept === 1 ? 'moment' : 'moments'} found`)
  return kept
}

if (isMain(import.meta.url)) await switching()
