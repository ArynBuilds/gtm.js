import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { askJson } from './ask.mjs'
import { brain, config, db, isMain, noDashes, note, now, product, root } from './store.mjs'
import './problems.mjs'

// Pages for the public site. An answer page is drafted from a real question
// someone asked, and is only published after the founder approves it.
db.exec(`create table if not exists pages (
  id integer primary key, slug text not null unique, asked text not null unique,
  title text not null, body text not null, status text not null default 'draft', created text not null)`)

const task = () => `
Below are questions real people asked, the people THE BRAIN describes. For each, write a
short public answer page in the voice described in THE BRAIN.
- "title": the question as anyone might ask it, with nothing personal in it.
- "slug": the title in lowercase words joined by hyphens, at most eight words.
- "body": 150 to 250 words of plain paragraphs separated by blank lines. No
  headings, no lists, no links. A practical answer someone can act on today,
  honest about trade-offs. Never mention ${product()} and never promote anything.
Answer with only a JSON array: [{"id": 1, "title": "", "slug": "", "body": ""}]
`

// Once a day: a few new questions become draft pages.
export async function writePages() {
  const questions = db.prepare(`
    select id, question from events where question is not null and score >= 5
      and question not in (select asked from pages) order by score desc, at desc limit 4`).all()
  if (!questions.length) return
  const pages = await askJson(`THE BRAIN\n${brain()}\n\nTHE TASK\n${task()}\nQUESTIONS\n${JSON.stringify(questions, null, 1)}`)
  const add = db.prepare('insert or ignore into pages (slug, asked, title, body, created) values (?, ?, ?, ?, ?)')
  let made = 0
  for (const p of pages) {
    const q = questions.find(x => x.id === p.id)
    const slug = String(p.slug || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (q && slug && p.body) made += add.run(slug, q.question, noDashes(String(p.title)), noDashes(String(p.body)), now()).changes
  }
  if (made) note('pages', `drafted ${made} answer pages for you to approve`)
}

// Writes what the public site is built from. Only problems in general words
// go out: no names, no links to anyone's post.
export function publish() {
  const themes = db.prepare(`
    select t.id, t.name, t.summary, count(p.id) as seen from themes t join problems p on p.theme_id = t.id
    group by t.id having count(p.id) >= 2 order by seen desc limit 20`).all()
  const said = db.prepare('select problem from problems where theme_id = ? order by at desc limit 3')
  const blamed = {}
  for (const row of db.prepare('select tools from problems').all()) {
    for (const tool of new Set(JSON.parse(row.tools))) blamed[tool] = (blamed[tool] || 0) + 1
  }
  const { name, line, url, stage, founder } = config().product
  const data = {
    built: now(),
    product: { name, line, url, stage, founder, me: config().me },
    report: {
      posts: db.prepare('select (select count(*) from events) + (select count(*) from wide) as n').get().n,
      problems: db.prepare('select count(*) as n from problems').get().n,
      themes: themes.map(t => ({ name: t.name, summary: t.summary, seen: t.seen, said: said.all(t.id).map(p => p.problem) })),
      tools: Object.entries(blamed).sort((a, b) => b[1] - a[1]).slice(0, 12),
    },
    answers: db.prepare("select slug, title, body, created from pages where status = 'approved' order by created desc").all(),
  }
  const folder = join(root, 'site', 'src', 'data')
  mkdirSync(folder, { recursive: true })
  writeFileSync(join(folder, 'site.json'), JSON.stringify(data, null, 1))
  note('pages', `public site data written: ${data.report.themes.length} themes, ${data.answers.length} answer pages`)
}

if (isMain(import.meta.url)) { await writePages(); publish() }
