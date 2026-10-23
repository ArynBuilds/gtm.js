// Loads every module of the service in a throwaway workspace, so a broken
// import or a syntax error fails here and not at three in the morning. The
// service itself and its keeper start things when loaded, so they are only parsed.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = join(import.meta.dirname, '..')
const started = new Set(['service.mjs', 'keep.mjs'])
const files = readdirSync(join(root, 'src'), { recursive: true }).filter(f => f.endsWith('.mjs')).map(f => join(root, 'src', f))

process.env.GTM_DATA = mkdtempSync(join(tmpdir(), 'gtm-check-'))
let failed = 0
for (const file of files) {
  const name = relative(root, file)
  try {
    if (started.has(file.split(/[\\/]/).pop())) {
      const parsed = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
      if (parsed.status !== 0) throw new Error(parsed.stderr.trim())
    } else {
      await import(pathToFileURL(file).href)
    }
  } catch (err) {
    failed++
    console.error(`${name}: ${err.message}`)
  }
}
// The database stays open until closed, and Windows will not delete an open file.
;(await import(pathToFileURL(join(root, 'src', 'store.mjs')).href)).db.close()
rmSync(process.env.GTM_DATA, { recursive: true, force: true })
console.log(`${files.length - failed} of ${files.length} modules load`)
process.exit(failed ? 1 : 0)
