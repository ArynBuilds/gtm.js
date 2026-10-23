import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { announceDraft, joinWinotch } from './winotch.mjs'
import { defaults } from './defaults.mjs'

export const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// The workspace: everything that belongs to one product and one person. It
// never goes into the repository. GTM_DATA points a trial run at its own
// folder, so it never touches the real one.
export const data = process.env.GTM_DATA || join(root, 'data')
mkdirSync(data, { recursive: true })
const at = name => join(data, name)

// Read fresh on every use: a chat message or the screen may have changed them.
// Only what differs from the defaults is written back.
const settings = () => existsSync(at('gtm.json')) ? JSON.parse(readFileSync(at('gtm.json'), 'utf8')) : {}
export const config = () => ({ ...defaults, ...settings() })
export const saveConfig = value => writeFileSync(at('gtm.json'), JSON.stringify(Object.fromEntries(
  Object.entries(value).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(defaults[k]))), null, 2) + '\n')
export const brain = () => existsSync(at('brain.md')) ? readFileSync(at('brain.md'), 'utf8') : ''
export const saveBrain = text => writeFileSync(at('brain.md'), text)
export const asks = () => existsSync(at('asks.json')) ? JSON.parse(readFileSync(at('asks.json'), 'utf8')) : []
export const saveAsks = list => writeFileSync(at('asks.json'), JSON.stringify(list, null, 2) + '\n')

// Set up means the setup on the screen has written a product and its brain.
// Until then the screen shows the setup and the clock runs nothing.
export const ready = () => Boolean(config().product?.name) && Boolean(brain().trim())
export const product = () => config().product?.name || 'the product'

// Secrets stay in the data folder, which never leaves this computer.
const keyFile = at('keys.json')
export const keys = () => existsSync(keyFile) ? JSON.parse(readFileSync(keyFile, 'utf8')) : {}
export const saveKeys = value => writeFileSync(keyFile, JSON.stringify(value, null, 2))
export const db = new DatabaseSync(at('gtm.db'))

// One person, many handles. Every event hangs off a person: that is the trace.
db.exec(`
  pragma journal_mode = wal;
  create table if not exists people (
    id integer primary key, name text, created text not null);
  create table if not exists handles (
    platform text not null, handle text not null,
    person_id integer not null references people(id),
    primary key (platform, handle));
  create table if not exists events (
    id integer primary key, key text not null unique,
    person_id integer references people(id),
    platform text not null, kind text not null, phrase text,
    url text, title text, text text, at text not null,
    score integer, why text, question text);
  create table if not exists drafts (
    id integer primary key, kind text not null, platform text not null,
    event_id integer references events(id), text text not null, original text not null,
    status text not null default 'draft', created text not null, posted text);
  create table if not exists talk (
    id integer primary key, who text not null, via text not null, text text not null, at text not null);
  create table if not exists log (
    id integer primary key, job text not null, text text not null, ok integer not null, at text not null);
  create table if not exists reports (
    id integer primary key, kind text not null, body text not null, at text not null);
  create table if not exists unjoined (a integer not null, b integer not null, primary key (a, b));
  create table if not exists marks (name text primary key, value text not null);
`)

export const now = () => new Date().toISOString()

// True when the file was started directly, not imported by another job.
export const isMain = url => Boolean(process.argv[1]) && pathToFileURL(process.argv[1]).href === url

export function mark(name, value) {
  if (value === undefined) {
    return db.prepare('select value from marks where name = ?').get(name)?.value
  }
  db.prepare('insert into marks (name, value) values (?, ?) on conflict (name) do update set value = excluded.value')
    .run(name, String(value))
}

// What every job says about itself. The screen shows it; nothing else prints.
export function note(job, text, ok = true) {
  db.prepare('insert into log (job, text, ok, at) values (?, ?, ?, ?)').run(job, text, ok ? 1 : 0, now())
  console.log(`${job}: ${text}`)
  for (const hear of watchers) hear(job, text, ok)
}

// Lets a conversation follow the work as it happens. Returns the way to stop.
const watchers = new Set()
export function watch(hear) {
  watchers.add(hear)
  return () => watchers.delete(hear)
}

export function personFor(platform, handle, name) {
  const found = db.prepare('select person_id from handles where platform = ? and handle = ?').get(platform, handle)
  if (found) return found.person_id
  const id = Number(db.prepare('insert into people (name, created) values (?, ?)').run(name || handle, now()).lastInsertRowid)
  db.prepare('insert into handles (platform, handle, person_id) values (?, ?, ?)').run(platform, handle, id)
  return id
}

// Returns true when the event is new. `key` is the platform's own id for it.
export function addEvent(e) {
  const person = e.handle ? personFor(e.platform, e.handle, e.name) : null
  // The same post put in several rooms by the same person is one post.
  if (person && e.title && db.prepare('select 1 from events where person_id = ? and substr(text, 1, 200) = ?')
    .get(person, (e.text ?? '').slice(0, 200))) return false
  const done = db.prepare(`
    insert into events (key, person_id, platform, kind, phrase, url, title, text, at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?) on conflict (key) do nothing
  `).run(e.key, person, e.platform, e.kind, e.phrase ?? null, e.url ?? null, e.title ?? null, e.text ?? null, e.at)
  return done.changes === 1
}

// A founder who never uses a dash as punctuation (noDashes in the settings)
// gets drafts without one, whatever the model wrote. A hyphen inside a word
// is left alone.
export const stripDashes = text => text
  .replace(/\s*[—–]\s*/g, ', ')
  .replace(/ +-{1,2} +/g, ', ')
  .replace(/, ,/g, ',')
export const noDashes = text => config().noDashes ? stripDashes(text) : text

export function addDraft(kind, platform, text, eventId = null) {
  const clean = noDashes(text)
  const { lastInsertRowid } = db.prepare('insert into drafts (kind, platform, event_id, text, original, created) values (?, ?, ?, ?, ?, ?)')
    .run(kind, platform, eventId, clean, clean, now())
  // It shows in winotch's feed at once, when winotch runs (winotch.mjs).
  const event = eventId ? db.prepare('select url, title from events where id = ?').get(eventId) : null
  announceDraft(config().port, openDrafts(), {
    id: Number(lastInsertRowid), kind, platform, text: clean, eventUrl: event?.url, eventTitle: event?.title,
  }).catch(() => {})
}

// The drafts still waiting, newest first, as winotch lists them (winotch.mjs).
export const openDrafts = () => db.prepare(`
  select d.id, d.kind, d.platform, d.text, d.created, e.url as eventUrl, e.title as eventTitle
  from drafts d left join events e on e.id = d.event_id where d.status = 'draft' order by d.id desc
`).all()

export function updateDraft(id, fields) {
  const text = typeof fields.text === 'string'
  const status = ['draft', 'posted', 'dropped'].includes(fields.status)
  if (text) db.prepare('update drafts set text = ? where id = ?').run(fields.text, id)
  if (status) {
    db.prepare('update drafts set status = ?, posted = ? where id = ?')
      .run(fields.status, fields.status === 'posted' ? now() : null, id)
  }
  // winotch's pill says how many are still waiting, and its list shows them as they are now.
  if (text || status) joinWinotch(config().port, openDrafts()).catch(() => {})
}

export const draft = id => db.prepare(`
  select d.*, e.url as event_url from drafts d left join events e on e.id = d.event_id where d.id = ?
`).get(id)

export function said(who, via, text) {
  db.prepare('insert into talk (who, via, text, at) values (?, ?, ?, ?)').run(who, via, text, now())
}

export function report(kind, body) {
  db.prepare('insert into reports (kind, body, at) values (?, ?, ?)').run(kind, JSON.stringify(body), now())
}

export function lastReport(kind) {
  const row = db.prepare('select body, at from reports where kind = ? order by id desc limit 1').get(kind)
  return row ? { ...JSON.parse(row.body), at: row.at } : null
}

// Two records become one: everything the second person did moves to the first.
export function joinPeople(keep, gone) {
  if (keep === gone) return
  db.prepare('update handles set person_id = ? where person_id = ?').run(keep, gone)
  db.prepare('update events set person_id = ? where person_id = ?').run(keep, gone)
  db.prepare('delete from people where id = ?').run(gone)
}

export function keepApart(a, b) {
  db.prepare('insert or ignore into unjoined (a, b) values (?, ?)').run(Math.min(a, b), Math.max(a, b))
}
