import { askJson } from './ask.mjs'
import { brain, db, isMain, note, now, product } from './store.mjs'

db.exec(`create table if not exists plans (
  person_id integer primary key references people(id) on delete cascade,
  next text not null, why text not null, at text not null)`)

const task = () => `
For each person in PEOPLE decide the single best next step for the founder,
following THE BRAIN. Choose "next" from exactly these:
- "reply"   a helpful reply now would be welcome (their latest post is recent and asks or struggles)
- "watch"   interesting, but nothing to say yet; keep an eye on what they post
- "invite"  a strong fit to tell personally about ${product()}, at launch if it is not out yet
- "leave"   not worth more attention
And "why": one short plain sentence.

Answer with only a JSON array: [{"id": 1, "next": "watch", "why": ""}]
`

// Once someone has shown the problem, decide what to do about that person,
// and decide again whenever they say something new.
export async function plan() {
  const people = db.prepare(`
    select p.id, p.name, max(e.at) as last from people p join events e on e.person_id = p.id
    left join plans pl on pl.person_id = p.id
    group by p.id having max(e.score) >= 5 and (pl.at is null or pl.at < max(e.at))
    order by last desc limit 30`).all()
  if (!people.length) return 0
  const posts = db.prepare(`select platform, at, score, why, substr(text, 1, 500) as text,
      (select status from drafts d where d.event_id = events.id limit 1) as draft
    from events where person_id = ? order by at desc limit 5`)
  const asked = people.map(p => ({ id: p.id, name: p.name, posts: posts.all(p.id) }))
  const answers = await askJson(`THE BRAIN\n${brain()}\n\nTHE TASK\n${task()}\nTODAY ${now()}\nPEOPLE\n${JSON.stringify(asked, null, 1)}`)
  const save = db.prepare(`insert into plans (person_id, next, why, at) values (?, ?, ?, ?)
    on conflict (person_id) do update set next = excluded.next, why = excluded.why, at = excluded.at`)
  const known = new Set(people.map(p => p.id))
  for (const a of answers) {
    if (known.has(a.id) && ['reply', 'watch', 'invite', 'leave'].includes(a.next)) save.run(a.id, a.next, String(a.why || ''), now())
  }
  note('plan', `decided the next step for ${answers.length} people`)
  return answers.length
}

if (isMain(import.meta.url)) await plan()
