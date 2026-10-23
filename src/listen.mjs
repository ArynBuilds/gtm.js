import { addEvent, config, isMain, mark, note } from './store.mjs'
import { asking, worth } from './ears/plain.mjs'
import { addWide } from './problems.mjs'
import * as hackernews from './ears/hackernews.mjs'
import * as bluesky from './ears/bluesky.mjs'
import * as reddit from './ears/reddit.mjs'
import * as github from './ears/github.mjs'

const ears = [hackernews, bluesky, github, reddit]

// Each ear remembers when it last listened, so a run only brings what is new.
// An ear that allows few requests names its own rest, in minutes, and is
// left alone until that has passed.
export async function listen() {
  const settings = config()
  const started = new Date()
  let total = 0
  let tried = 0
  const failed = []
  for (const ear of ears) {
    const last = mark(`heard:${ear.platform}`)
    if (last && ear.rest && started - new Date(last) < ear.rest * 60000) continue
    tried++
    const since = last ? new Date(last) : new Date(started - settings.firstRunDays * 86400000)
    try {
      const found = await ear.listen(settings.phrases, since, settings)
      let fresh = 0
      for (const e of found) {
        const phrase = worth(settings, e.title, e.text)
        if (phrase) { if (addEvent({ ...e, phrase })) fresh++ }
        // The wider stream: a post from one of our rooms, outside our topics.
        else if (ear.rooms && asking(settings, e.title, e.text)) addWide(e)
      }
      mark(`heard:${ear.platform}`, started.toISOString())
      total += fresh
      if (fresh || !last) note('listen', `${ear.platform}: ${fresh} new posts worth reading (${found.length} looked at)`)
    } catch (err) {
      failed.push(`${ear.platform} failed: ${err.message}`)
    }
  }
  // Every ear failing at once means the computer has no internet yet, as in
  // the first seconds after waking. That run must not count as done.
  if (tried > 1 && failed.length === tried) throw Object.assign(new Error('no internet yet'), { again: true })
  for (const line of failed) note('listen', line, false)
  return total
}

if (isMain(import.meta.url)) await listen()
