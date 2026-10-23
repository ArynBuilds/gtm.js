import { spawn } from 'node:child_process'
import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Starts the service and starts it again whenever it stops. Run at sign-in,
// it is back after every restart of the computer (README.md says how).
const here = dirname(fileURLToPath(import.meta.url))
const out = join(process.env.GTM_DATA || join(here, '..', 'data'), 'service.log')
mkdirSync(dirname(out), { recursive: true })
const write = text => appendFileSync(out, `${new Date().toISOString()} ${text}\n`)

let wait = 5000
function start() {
  const began = Date.now()
  const child = spawn(process.execPath, ['--no-warnings', join(here, 'service.mjs')], { windowsHide: true })
  child.stdout.on('data', d => {
    write(String(d).trim())
    // The one line a person starting it by hand needs to see.
    const on = String(d).match(/gtm\.js is on (\S+)/)
    if (on) console.log(`gtm.js is running. Open ${on[1]}\nIts log is in ${out}`)
  })
  child.stderr.on('data', d => write(String(d).trim()))
  child.on('close', code => {
    if (code === 3) return write('another copy is already running - leaving')
    wait = Date.now() - began > 600000 ? 5000 : Math.min(wait * 2, 300000)
    write(`service stopped with ${code} - starting again in ${wait / 1000}s`)
    setTimeout(start, wait)
  })
}
start()
