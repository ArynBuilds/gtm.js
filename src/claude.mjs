import { spawn } from 'node:child_process'

// gtm.js thinks with the Claude Code of this computer: its login, its plan,
// no API key. An npm install on Windows leaves claude.cmd, which only starts
// through the shell; the native install leaves claude.exe, which starts
// directly. The first start finds out which, and every later one goes the same way.
let viaShell = null

// cmd.exe joins arguments with spaces, so each one is quoted for it.
const quote = arg => `"${String(arg).replace(/"/g, '""')}"`

// Claude Code refuses to start inside another Claude Code session, which it
// knows from these variables. Its own config folder is still passed on.
const env = () => Object.fromEntries(Object.entries(process.env)
  .filter(([k]) => !k.startsWith('CLAUDE') || k === 'CLAUDE_CONFIG_DIR'))

function start(args, options) {
  if (viaShell) return spawn('claude', args.map(quote), { ...options, env: env(), shell: true, windowsHide: true })
  return spawn('claude', args, { ...options, env: env(), windowsHide: true })
}

// Runs claude once with `input` on its standard input. Resolves with what it
// printed and its exit code; rejects only when claude cannot be found at all.
export function run(args, input = '', options = {}) {
  return new Promise((resolve, reject) => {
    const child = start(args, options)
    let out = '', err = ''
    child.stdout.on('data', d => { out += d })
    child.stderr.on('data', d => { err += d })
    child.on('error', error => {
      if (error.code === 'ENOENT' && process.platform === 'win32' && viaShell === null) {
        viaShell = true
        return run(args, input, options).then(resolve, reject)
      }
      reject(error)
    })
    child.on('close', code => {
      // Through the shell, a missing command is exit code 1 with this message.
      if (viaShell && code !== 0 && /not recognized/i.test(err)) return reject(Object.assign(new Error('claude not found'), { code: 'ENOENT' }))
      if (viaShell === null) viaShell = false
      resolve({ out: out.trim(), err: err.trim(), code })
    })
    child.stdin.on('error', () => {})
    child.stdin.end(input)
  })
}

// Installed, which version, and signed in as whom. `claude auth status`
// answers in JSON and costs nothing; an older Claude Code without it leaves
// `signedIn` unknown, and the live test settles it.
export async function claudeStatus() {
  let version
  try { version = await run(['--version']) } catch { return { installed: false } }
  if (version.code !== 0) return { installed: false }
  const status = { installed: true, version: version.out.split(/\s/)[0], signedIn: null }
  try {
    const auth = JSON.parse((await run(['auth', 'status'])).out)
    Object.assign(status, {
      signedIn: Boolean(auth.loggedIn), email: auth.email || null,
      plan: auth.subscriptionType || null, method: auth.authMethod || null,
    })
  } catch { /* no auth command in this version */ }
  return status
}
