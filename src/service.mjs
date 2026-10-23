import { config, note, openDrafts } from './store.mjs'
import { page } from './page.mjs'
import { schedule } from './schedule.mjs'
import { connect } from './telegram.mjs'
import { joinWinotch } from './winotch.mjs'

// The one program that stays on: the screen, the Telegram line and the clock.
process.on('unhandledRejection', err => note('service', `problem: ${err?.message || err}`, false))

page()
connect()
schedule()
// On winotch's island with the drafts that wait; again every few minutes, in
// case winotch started after gtm.js.
const onWinotch = () => joinWinotch(config().port, openDrafts()).catch(() => {})
onWinotch()
setInterval(onWinotch, 5 * 60_000)
