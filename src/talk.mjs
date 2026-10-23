import { askJson } from './ask.mjs'
import { brain, config, draft, noDashes, saveBrain, saveConfig, said, updateDraft, note } from './store.mjs'
import { chat, compose, openDrafts, people, problems, reports, status } from './view.mjs'
import { runJob } from './jobs.mjs'

const task = `
You are gtm.js, the go-to-market system of the founder described in THE
BRAIN. They are talking to you from their phone or the screen. Answer the
way a sharp colleague would in a chat: plain, no marketing words, in the
brain's voice. Use what you know from STATE. If you do not know, say so.

How to shape every answer so they are informed at a glance:
- The first line is the answer itself, in bold, written *like this* with
  single asterisks.
- Then the facts behind it, each on its own short line, with the real
  numbers from STATE (how many, where from, when). Put the number or the
  label of each line in bold the same way.
- When something did not happen, say why, from "whatHappenedLately".
- End with the one thing they could do next, when there is one.
- Six lines at most unless they ask for more. No long paragraphs.

You can act by listing actions in "do". Only these exist:
- {"act": "edit", "id": 3, "text": "..."}      rewrite an open draft
- {"act": "skip", "id": 3}                     drop an open draft
- {"act": "link", "id": 3}                     give them the one-tap link that opens the draft ready to post
- {"act": "sent", "id": 3}                     they say they posted it
- {"act": "add_topic", "text": "..."}          start listening for a topic word (1 or 2 words; a post is read when it has one topic word and sounds like someone asking or struggling)
- {"act": "remove_topic", "text": "..."}       stop listening for a topic word
- {"act": "run", "job": "cycle"}               listen and think now, in the background ("daily" writes posts and learns; "weekly" writes the reports)
- {"act": "pipeline"}                          the manual pipeline: listen, think and write posts right now while they wait, then hand them every draft one by one to approve
- {"act": "review"}                            hand them every open draft one by one to approve, without listening again
- {"act": "brain", "heading": "Voice", "text": "..."}   replace the body of one section of the brain
- {"act": "remember", "text": "..."}           add a line to the brain's "Notes from the founder" section

Act only on what they asked for. When they ask for a draft to be changed, do
the edit and show them the new text in your reply. Never invent a draft id. When
you use "pipeline" or "review", keep the reply to one short line: the drafts
arrive right after it by themselves, so do not list them. STATE says where
they are talking from: on "telegram" the drafts come as messages with buttons;
on "screen" they land in the Inbox.

Answer with only a JSON object: {"reply": "...", "do": []}
`

function setSection(heading, text) {
  const lines = brain().split('\n')
  const start = lines.findIndex(l => l.trim().toLowerCase() === `## ${heading}`.toLowerCase())
  if (start < 0) return saveBrain(`${brain().trimEnd()}\n\n## ${heading}\n\n${text.trim()}\n`)
  let end = lines.findIndex((l, i) => i > start && l.startsWith('## '))
  if (end < 0) end = lines.length
  lines.splice(start + 1, end - start - 1, '', text.trim(), '')
  saveBrain(lines.join('\n'))
}

function remember(text) {
  const current = brain()
  const has = /^## Notes from /m.test(current)
  saveBrain(`${current.trimEnd()}\n${has ? '' : '\n## Notes from the founder\n\n'}- ${text.trim()}\n`)
}

// Each action returns a line to add to the reply, or nothing.
const acts = {
  edit: a => { if (draft(a.id)) updateDraft(a.id, { text: noDashes(a.text) }) },
  skip: a => { if (draft(a.id)) updateDraft(a.id, { status: 'dropped' }) },
  sent: a => { if (draft(a.id)) updateDraft(a.id, { status: 'posted' }) },
  link: a => {
    const d = draft(a.id)
    if (!d) return
    return d.kind === 'post' ? (compose[d.platform] || '') + encodeURIComponent(d.text) : d.event_url
  },
  add_topic: a => {
    const c = config()
    if (!c.topics.includes(a.text.toLowerCase())) saveConfig({ ...c, topics: [...c.topics, a.text.toLowerCase()] })
  },
  remove_topic: a => { const c = config(); saveConfig({ ...c, topics: c.topics.filter(p => p !== a.text) }) },
  run: a => { runJob(a.job) },
  brain: a => setSection(a.heading, a.text),
  remember: a => remember(a.text),
}

export async function talk(text, via) {
  said('you', via, text)
  const r = reports()
  const now = status()
  const state = {
    now: new Date().toString(), talkingFrom: via, drafts: openDrafts(), topics: config().topics,
    numbers: { thisWeek: now.thisWeek, lastWeek: now.lastWeek, byPlatform: now.byPlatform, waitingToBeRead: now.waiting, lastListened: now.heard },
    whatHappenedLately: now.log.slice(0, 25).map(l => `${l.at.slice(5, 16)} ${l.job}: ${l.ok ? '' : 'FAILED '}${l.text}`),
    listensEvery: `${config().everyMinutes} minutes, Reddit and GitHub once an hour`,
    peopleNextSteps: people().filter(p => p.next).slice(0, 12).map(p => ({ name: p.name, next: p.next, why: p.next_why, best: p.best })),
    problemBoard: problems().themes.slice(0, 10).map(t => ({ theme: t.name, seen: t.inside + t.outside, outsideOurTopics: t.outside, verdict: t.verdict, why: t.why })),
    aiAnswerCheck: r.answers && { asked: r.answers.asked, namedUs: r.answers.ours, at: r.answers.at },
    otherTools: r.rivals && { shipped: r.rivals.shipped, forUs: r.rivals.forUs },
    learned: r.learn && { learned: r.learn.learned, brain: r.learn.brain },
    questionsPeopleAsk: r.questions.slice(0, 15).map(q => q.question),
  }
  const history = chat().slice(-14).map(m => `${m.who === 'you' ? 'FOUNDER' : 'GTM'}: ${m.text}`).join('\n')
  let reply
  let then = null
  try {
    const answer = await askJson(`THE BRAIN\n${brain()}\n\nTHE TASK\n${task}\nSTATE\n${JSON.stringify(state, null, 1)}\n\nTHE CONVERSATION SO FAR (the last line is what they just said)\n${history}`)
    const extra = []
    for (const a of answer.do || []) {
      // These two are carried out by whoever is carrying the conversation,
      // because handing over drafts looks different in each place.
      if (a.act === 'pipeline' || a.act === 'review') { then = a.act; continue }
      const line = acts[a.act]?.(a)
      if (line) extra.push(line)
    }
    if ((answer.do || []).length) note('talk', `did: ${answer.do.map(a => a.act).join(', ')}`)
    reply = [answer.reply, ...extra].join('\n\n')
  } catch (err) {
    note('talk', `failed: ${err.message}`, false)
    reply = 'I could not think that through just now. Try again in a minute.'
  }
  said('gtm', via, reply)
  return { reply, then }
}
