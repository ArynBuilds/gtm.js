import { config, db, lastReport, mark } from './store.mjs'
import './plan.mjs'
import './verdicts.mjs'
import './outcomes.mjs'
import './pages.mjs'

const week = 7 * 86400000
const iso = ms => new Date(ms).toISOString()

// Where the button sends a post: the platform's own writing box, already filled.
export const compose = {
  x: 'https://x.com/intent/post?text=',
  bluesky: 'https://bsky.app/intent/compose?text=',
  linkedin: 'https://www.linkedin.com/feed/?shareActive=true&text=',
}

export const openDrafts = () => ({
  posts: db.prepare(`select id, platform, text, created from drafts
    where kind = 'post' and status = 'draft' order by id desc`).all(),
  replies: db.prepare(`
    select d.id, d.platform, d.text, d.created, e.kind, e.url, e.title, e.text as said, e.score, e.why, e.at,
           p.name, p.id as person_id
    from drafts d join events e on e.id = d.event_id left join people p on p.id = e.person_id
    where d.kind = 'reply' and d.status = 'draft' order by d.id desc`).all(),
})

// Handles that look like one person on two platforms, unless told otherwise.
function sameHandle() {
  const bare = h => h.toLowerCase().replace(/\.bsky\.social$/, '')
  const rows = db.prepare('select h.platform, h.handle, h.person_id, p.name from handles h join people p on p.id = h.person_id').all()
  const apart = new Set(db.prepare('select a, b from unjoined').all().map(r => `${r.a}:${r.b}`))
  const byName = new Map()
  const pairs = []
  for (const row of rows) {
    const other = byName.get(bare(row.handle))
    if (!other) { byName.set(bare(row.handle), row); continue }
    const [a, b] = [Math.min(other.person_id, row.person_id), Math.max(other.person_id, row.person_id)]
    if (a !== b && !apart.has(`${a}:${b}`)) pairs.push({ a: other, b: row })
  }
  return pairs
}

function numbers(from, to) {
  return db.prepare(`select
    (select count(*) from events where at >= ?1 and at < ?2) as heard,
    (select count(*) from events where at >= ?1 and at < ?2 and score >= 6) as good,
    (select count(distinct person_id) from events where at >= ?1 and at < ?2) as people,
    (select count(*) from drafts where created >= ?1 and created < ?2) as drafted,
    (select count(*) from drafts where posted >= ?1 and posted < ?2) as sent`).get(from, to)
}

export function today() {
  const learn = lastReport('learn')
  return {
    ...openDrafts(), compose, joins: sameHandle(),
    proposals: learn ? {
      at: learn.at, brain: learn.brain, learned: learn.learned,
      drop: (learn.drop || []).filter(p => config().topics.includes(p)),
      add: (learn.add || []).filter(p => !config().topics.includes(p)),
    } : null,
  }
}

export function status() {
  const t = Date.now()
  return {
    heard: mark('ran:cycle') || null,
    waiting: db.prepare('select count(*) as n from events where score is null').get().n,
    thisWeek: numbers(iso(t - week), iso(t)),
    lastWeek: numbers(iso(t - 2 * week), iso(t - week)),
    byPlatform: db.prepare(`select platform, count(*) as heard, sum(case when score >= 6 then 1 else 0 end) as good
      from events group by platform order by heard desc`).all(),
    days: db.prepare(`select substr(at, 1, 10) as day, count(*) as heard,
        sum(case when score >= 6 then 1 else 0 end) as good
      from events where at >= ? group by day order by day`).all(iso(t - 2 * week)),
    log: db.prepare('select job, text, ok, at from log order by id desc limit 40').all(),
  }
}

export const people = () => db.prepare(`
  select p.id, p.name, count(e.id) as events, max(e.score) as best, max(e.at) as last,
    (select group_concat(platform || ':' || handle, '  ') from handles h where h.person_id = p.id) as handles,
    pl.next, pl.why as next_why
  from people p join events e on e.person_id = p.id left join plans pl on pl.person_id = p.id
  group by p.id having max(e.score) >= 4 order by best desc, last desc limit 80`).all()

export const trace = personId => db.prepare(`
  select platform, kind, url, title, text, at, score, why
  from events where person_id = ? order by at desc`).all(personId)

export const heard = () => db.prepare(`
  select e.id, e.platform, e.url, e.title, substr(e.text, 1, 400) as text, e.at, e.score, e.why,
         e.question, e.phrase, p.name
  from events e left join people p on p.id = e.person_id
  where e.score is not null order by e.score desc, e.at desc limit 120`).all()

export const reports = () => ({
  answers: lastReport('answers'), rivals: lastReport('rivals'), learn: lastReport('learn'),
  questions: db.prepare(`select question, url, platform, at from events
    where question is not null order by at desc limit 40`).all(),
  sent: db.prepare('select platform, url, text, at, likes, answers from sent order by at desc limit 40').all(),
  pages: db.prepare("select id, slug, title, body, status from pages where status <> 'dropped' order by status desc, id desc").all(),
})

// The problem board: every theme with how often it comes up inside and
// outside our topics, its verdict with the proof, and who gets blamed.
export function problems() {
  const themes = db.prepare(`
    select t.id, t.name, t.summary,
      sum(case when p.stream = 'inside' then 1 else 0 end) as inside,
      sum(case when p.stream = 'outside' then 1 else 0 end) as outside, max(p.at) as last,
      v.verdict, v.why, v.proof, v.doc, v.confirmed, c.text as capability, c.section
    from themes t join problems p on p.theme_id = t.id
    left join verdicts v on v.theme_id = t.id left join capabilities c on c.id = v.capability_id
    group by t.id order by count(p.id) desc`).all()
  const said = db.prepare('select problem, tools, tried, url, platform, stream, at from problems where theme_id = ? order by at desc limit 12')
  const blamed = {}
  for (const row of db.prepare('select tools from problems').all()) {
    for (const tool of new Set(JSON.parse(row.tools))) blamed[tool] = (blamed[tool] || 0) + 1
  }
  return {
    themes: themes.map(t => ({ ...t, said: said.all(t.id).map(p => ({ ...p, tools: JSON.parse(p.tools) })) })),
    blamed: Object.entries(blamed).sort((a, b) => b[1] - a[1]).slice(0, 14),
    loose: db.prepare('select count(*) as n from problems where theme_id is null').get().n,
    capabilities: db.prepare('select count(*) as n from capabilities').get().n,
  }
}

const verdictWords = { not_found: 'not in our documents', unclear: 'unclear', partly: 'partly planned', planned: 'planned', out_of_scope: 'not ours' }

// The problem board in a few lines: what comes up most, and where we have no answer.
export function boardWords() {
  const { themes, capabilities } = problems()
  if (!themes.length) return 'No problem themes yet. They are grouped once a day.'
  // Verdicts exist only when a docs folder is set (capabilities.mjs).
  const top = themes.slice(0, 6).map(t => `*${t.inside + t.outside}x* ${t.name}${capabilities ? ` (${verdictWords[t.verdict] || 'not judged yet'})` : ''}`)
  const gaps = themes.filter(t => ['not_found', 'unclear'].includes(t.verdict) && t.inside + t.outside >= 2).slice(0, 4).map(t => t.name)
  return [`*What people struggle with, most common first*\n${top.join('\n')}`,
    ...capabilities ? [gaps.length ? `*No clear answer in your documents for*\n${gaps.join('\n')}` : 'Every common problem has an answer in your documents.'] : [],
    'The Problems tab on the screen has the quotes.'].join('\n\n')
}

export const chat = () => db.prepare('select who, via, text, at from talk order by id desc limit 60').all().reverse()
