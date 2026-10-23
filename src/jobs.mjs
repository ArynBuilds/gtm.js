import { listen } from './listen.mjs'
import { think } from './think.mjs'
import { plan } from './plan.mjs'
import { content } from './content.mjs'
import { answers } from './weekly/answers.mjs'
import { rivals } from './weekly/rivals.mjs'
import { learn } from './learn.mjs'
import { notice } from './problems.mjs'
import { themes } from './themes.mjs'
import { verdicts } from './verdicts.mjs'
import { switching } from './switching.mjs'
import { outcomes } from './outcomes.mjs'
import { publish, writePages } from './pages.mjs'
import { mark, note, now } from './store.mjs'

// The named pieces of work. A failing step is written down and the rest go on.
const steps = {
  cycle: [listen, think, plan, switching, outcomes],
  daily: [content, learn, notice, themes, writePages, publish],
  weekly: [answers, rivals, verdicts],
}

let waiting = null
const running = new Set()
export const busy = () => [...running]

export async function runJob(name) {
  if (!steps[name] || running.has(name)) return false
  running.add(name)
  try {
    for (const step of steps[name]) {
      try { await step() } catch (err) {
        // A step that asks to be tried again ends the job unmarked, so the
        // clock comes back to it in a minute. It is written down once, not every minute.
        if (err.again) {
          if (waiting !== name) note(name, `waiting: ${err.message}`, false)
          waiting = name
          return false
        }
        note(step.name, `failed: ${err.message}`, false)
      }
    }
    waiting = null
    mark(`ran:${name}`, now())
  } finally {
    running.delete(name)
  }
  return true
}
