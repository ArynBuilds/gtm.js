import { askJson } from './ask.mjs'
import { brain, config, db, isMain, note, report } from './store.mjs'

// Looks at what the last days produced and proposes changes. It changes
// nothing itself: the founder accepts each proposal on the screen or in chat.
export async function learn() {
  const topics = db.prepare(`
    select phrase as topic, count(*) as found, round(avg(score), 1) as average,
           sum(case when score >= 6 then 1 else 0 end) as good
    from events where phrase is not null and score is not null group by phrase`).all()
  const rooms = db.prepare(`
    select substr(title, instr(title, '[r/') + 3, length(title) - instr(title, '[r/') - 3) as room,
           count(*) as found, sum(case when score >= 6 then 1 else 0 end) as good
    from events where platform = 'reddit' and score is not null and title like '%[r/%]' group by room`).all()
  const drafts = db.prepare(`
    select status, count(*) as n, sum(case when text <> original then 1 else 0 end) as edited
    from drafts group by status`).all()
  const edits = db.prepare(`
    select kind, platform, original, text from drafts
    where text <> original and status = 'posted' order by id desc limit 6`).all()
  const best = db.prepare(`
    select platform, score, why, question, substr(text, 1, 400) as text
    from events where score >= 6 order by at desc limit 25`).all()

  const read = await askJson(`THE BRAIN\n${brain()}\n
THE TASK
Below is what our listening and drafting produced. A post is read when it
contains one TOPIC word and sounds like someone asking or struggling.
Propose improvements.
- "learned": up to 5 short plain lines on what real people are struggling
  with, in their words, from BEST POSTS.
- "drop": topic words from TOPICS that were found at least 8 times and never
  once scored good. Exact strings. Words found fewer times stay.
- "add": up to 5 new topic words (1 or 2 words each, lowercase) that appear
  in BEST POSTS and are not in TOPIC LIST.
- "brain": up to 3 proposed changes to the brain, each one plain sentence
  saying what to change and why. If the founder's edits in EDITS show a
  pattern in how they rewrite drafts, say it here.
Answer with only a JSON object with those four arrays of strings.

TOPICS ${JSON.stringify(topics)}
TOPIC LIST ${JSON.stringify(config().topics)}
REDDIT ROOMS ${JSON.stringify(rooms)}
DRAFTS ${JSON.stringify(drafts)}
EDITS ${JSON.stringify(edits)}
BEST POSTS ${JSON.stringify(best)}`)
  report('learn', { ...read, topics, rooms })
  note('learn', `${read.drop.length + read.add.length} topic changes and ${read.brain.length} brain changes proposed`)
}

if (isMain(import.meta.url)) await learn()
