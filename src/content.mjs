import { spawnSync } from 'node:child_process'
import { askJson } from './ask.mjs'
import { addDraft, brain, config, db, isMain, mark, note, product } from './store.mjs'

const task = () => `
Below is what was done in the ${product()} repository since the last post, as
commit messages. Write build-in-public posts about it for the founder,
following the brain's voice and its rules for our own posts exactly.

Pick the ONE most interesting thing for an outside developer: a decision and
its reason, or a measured number. Leave out internal document numbers,
review rounds and housekeeping. If nothing here would interest an outsider,
answer with an empty array.

Answer with only a JSON array:
[{"platform": "x", "text": "at most 270 characters"},
 {"platform": "bluesky", "text": "at most 290 characters"},
 {"platform": "linkedin", "text": "60 to 120 words, short paragraphs"}]
`

// Only when a repository is set: its new commits become build-in-public posts.
export async function content() {
  if (!config().repo) return 0
  const since = mark('content') || new Date(Date.now() - 2 * 86400000).toISOString()
  const started = new Date().toISOString()
  const log = spawnSync('git', ['-C', config().repo, 'log', `--since=${since}`, '--pretty=format:- %s%n%b'], { encoding: 'utf8' })
  if (log.status !== 0) throw new Error(`git log failed: ${log.stderr}`)
  mark('content', started)
  if (!log.stdout.trim()) return 0
  const before = db.prepare(`select text from drafts where kind = 'post' and platform = 'linkedin'
    order by id desc limit 8`).all().map(d => d.text)
  const posts = await askJson(`THE BRAIN\n${brain()}\n\nTHE TASK\n${task()}
ALREADY WRITTEN ABOUT (never write about the same thing twice; if the commits
only cover these again, answer with an empty array)
${JSON.stringify(before, null, 1)}

COMMITS\n${log.stdout.slice(0, 12000)}`)
  for (const p of posts) if (p.platform && p.text) addDraft('post', p.platform, p.text)
  note('content', posts.length ? `wrote ${posts.length} post drafts from new commits` : 'new commits, nothing worth a post')
  return posts.length
}

if (isMain(import.meta.url)) await content()
