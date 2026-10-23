import { config, mark, note, ready } from './store.mjs'
import { runJob } from './jobs.mjs'
import { boardWords, openDrafts } from './view.mjs'
import { announce, tell } from './telegram.mjs'

const hour = 3600000
const age = name => Date.now() - new Date(mark(name) || 0).getTime()
const day = () => new Date().toLocaleDateString('sv')

function morning() {
  const { posts, replies } = openDrafts()
  if (!posts.length && !replies.length) return '*Good morning.* Nothing is waiting for you today.'
  const lines = [`*Good morning.* ${replies.length} replies and ${posts.length} posts are waiting.`]
  const best = [...replies].sort((a, b) => b.score - a.score)[0]
  if (best) lines.push(`*Best thread* (${best.score}/10), ${best.name || 'someone'} on ${best.platform}:\n${best.why}`)
  return lines.join('\n\n')
}

// Looked at once a minute. Work that was due while the computer was off or
// asleep runs as soon as it is back; nothing depends on being awake on time.
async function tick() {
  // Nothing to listen for until the setup on the screen has written the product.
  if (!ready()) return
  const c = config()
  if (age('ran:cycle') > c.everyMinutes * 60000 && await runJob('cycle')) await announce()
  if (mark('day:daily') !== day()) { await runJob('daily'); mark('day:daily', day()) }
  if (age('ran:weekly') > 7 * 24 * hour && new Date().getDay() === c.weeklyDay) {
    if (await runJob('weekly')) await tell(boardWords())
  }
  if (new Date().getHours() >= c.morningHour && mark('day:told') !== day()) {
    if (await tell(morning(), 'start')) mark('day:told', day())
  }
}

export function schedule() {
  let working = false
  const beat = async () => {
    if (working) return
    working = true
    try { await tick() } catch (err) { note('schedule', `failed: ${err.message}`, false) }
    working = false
  }
  setInterval(beat, 60000)
  beat()
}
