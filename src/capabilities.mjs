import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { askJson } from './ask.mjs'
import { config, db, isMain, note, product } from './store.mjs'

// What the product can do, taken only from its own documents (the "docs"
// folder in the settings). Every line keeps the document and section it came
// from; nothing else may be used as proof that the product handles something.
db.exec(`
  create table if not exists docs (name text primary key, hash text not null);
  create table if not exists capabilities (
    id integer primary key, doc text not null, section text not null, text text not null);
`)

const task = () => `
Below is one document about ${product()}. List what ${product()} gives the
people who use it, according to this document only.
- One capability per line of the list: one plain sentence, starting with a
  verb, saying what a builder can do or what is taken care of for them.
- "section": the heading it is written under, copied exactly.
- Only what this document states. Nothing you know from elsewhere, and
  nothing merely implied. Skip how the team works, trials, and internal detail
  a builder never meets.
- Between 5 and 40 lines, depending on how much the document holds.
Answer with only a JSON array: [{"section": "...", "text": "..."}]
`

export const docText = name => readFileSync(join(config().docs, name), 'utf8')
export const docHash = name => createHash('sha256').update(docText(name)).digest('hex')

// Rebuilds the list for every document that changed since last time.
// Returns the names of the changed documents.
export async function capabilities() {
  const changed = []
  if (!config().docs || !existsSync(config().docs)) return changed
  for (const name of readdirSync(config().docs).filter(f => f.endsWith('.md')).sort()) {
    const hash = docHash(name)
    if (db.prepare('select hash from docs where name = ?').get(name)?.hash === hash) continue
    const lines = await askJson(`THE TASK\n${task()}\nDOCUMENT ${name}\n${docText(name)}`)
    db.prepare('delete from capabilities where doc = ?').run(name)
    const add = db.prepare('insert into capabilities (doc, section, text) values (?, ?, ?)')
    for (const l of lines) if (l.text) add.run(name, String(l.section || ''), String(l.text))
    db.prepare('insert into docs (name, hash) values (?, ?) on conflict (name) do update set hash = excluded.hash').run(name, hash)
    changed.push(name)
  }
  if (changed.length) note('capabilities', `read ${changed.length} changed documents, ${db.prepare('select count(*) as n from capabilities').get().n} capabilities known`)
  return changed
}

if (isMain(import.meta.url)) await capabilities()
