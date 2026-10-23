import { askJson } from './ask.mjs'
import { db, isMain, note, now } from './store.mjs'
import './problems.mjs'

const task = `
Group the PROBLEMS into themes. A theme is one kind of trouble many people
could share, named in up to six plain words (for example "cannot test the
whole thing locally").
- Put a problem into an EXISTING THEME whenever one fits, using its exact name.
- Make a new theme only when none fits. Do not make two themes that mean
  the same thing.
- "summary" is one plain sentence saying what the trouble is. For an
  existing theme, repeat its summary.
Answer with only a JSON array: [{"id": 1, "theme": "name", "summary": "..."}]
`

// Once a day: every problem not yet in a theme is put in one.
export async function themes() {
  const loose = db.prepare('select id, problem from problems where theme_id is null order by at desc limit 120').all()
  if (!loose.length) return
  const known = db.prepare('select name, summary from themes').all()
  const answers = await askJson(`THE TASK\n${task}\nEXISTING THEMES\n${JSON.stringify(known, null, 1)}\n\nPROBLEMS\n${JSON.stringify(loose, null, 1)}`)
  const find = db.prepare('select id from themes where name = ? collate nocase')
  const make = db.prepare('insert into themes (name, summary, created) values (?, ?, ?)')
  const place = db.prepare('update problems set theme_id = ? where id = ? and theme_id is null')
  let fresh = 0
  for (const a of answers) {
    const name = String(a.theme || '').trim()
    if (!name) continue
    let id = find.get(name)?.id
    if (!id) { id = Number(make.run(name, String(a.summary || ''), now()).lastInsertRowid); fresh++ }
    place.run(id, a.id)
  }
  note('themes', `sorted ${answers.length} problems into themes, ${fresh} of them new`)
}

if (isMain(import.meta.url)) await themes()
