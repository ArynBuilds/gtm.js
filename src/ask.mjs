import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { run } from './claude.mjs'

// The thinking runs on the Claude Code login of this machine: no API key, no
// bill. What it reads comes from strangers on the web, so it gets no tools,
// none of this machine's own instructions, and an empty folder to stand in.
const system = 'You are a careful assistant working inside an automation. Do exactly the task in the message and answer in the form it asks for.'

export async function ask(prompt) {
  const args = ['-p', '--tools', '', '--strict-mcp-config', '--setting-sources', '', '--system-prompt', system]
  const { out, err, code } = await run(args, prompt, { cwd: mkdtempSync(join(tmpdir(), 'gtm-')) })
  if (code !== 0) throw new Error(`claude ended with ${code}: ${err.slice(0, 300)}`)
  return out
}

// The answer is asked for as JSON; this takes the outermost array or object.
export async function askJson(prompt) {
  const text = await ask(prompt)
  const start = text.search(/[[{]/)
  const end = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'))
  if (start < 0 || end < start) throw new Error(`no JSON in the answer: ${text.slice(0, 200)}`)
  return JSON.parse(text.slice(start, end + 1))
}
