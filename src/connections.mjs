import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { claudeStatus } from './claude.mjs'
import { config } from './store.mjs'
import { tg } from './telegram.mjs'
import { present as winotch } from './winotch.mjs'

const exec = promisify(execFile)

// What a tool prints about itself, or nothing when it is not on this computer.
async function tool(command, args) {
  try {
    const { stdout, stderr } = await exec(command, args, { windowsHide: true, timeout: 10000 })
    return `${stdout}\n${stderr}`.trim()
  } catch { return null }
}

async function look() {
  const [claude, gh, ghAuth, git, ffmpeg] = await Promise.all([
    claudeStatus(),
    tool('gh', ['--version']),
    tool('gh', ['auth', 'status']),
    tool('git', ['--version']),
    tool('ffmpeg', ['-version']),
  ])
  return {
    node: process.versions.node,
    claude,
    // With several accounts signed in, the active one is the one gtm.js uses.
    gh: {
      installed: Boolean(gh), signedIn: Boolean(ghAuth),
      user: (ghAuth?.match(/account (\S+)[^\n]*\n[^\n]*Active account: true/) ?? ghAuth?.match(/account (\S+)/))?.[1] ?? null,
    },
    git: Boolean(git),
    ffmpeg: Boolean(ffmpeg),
  }
}

// The setup asks every few seconds while someone installs Claude Code, so
// one look at this computer serves everyone who asks in the next four seconds.
let seen = { at: 0, look: null }
export function machine() {
  if (!seen.look || Date.now() - seen.at > 4000) seen = { at: Date.now(), look: look() }
  return seen.look
}

const isGit = folder => Boolean(folder) && existsSync(join(folder, '.git'))
const handles = me => Object.entries(me || {}).filter(([, v]) => v)

// Everything gtm.js can be connected to, what each one does for the founder,
// whether it is on, and the one thing to do when it is not. The order is the
// order the screen shows them in, by group.
export async function connections() {
  const m = await machine()
  const c = config()
  const claudeOn = m.claude.installed && m.claude.signedIn !== false
  return [
    {
      id: 'claude', group: 'required', name: 'Claude Code',
      does: 'Reads every post, scores it, and writes every draft, reply and report. It runs on your own Claude Code plan, so there is no API key and no extra bill. It gets no tools and cannot touch your files.',
      state: claudeOn ? 'on' : 'off',
      detail: !m.claude.installed ? 'Not found on this computer'
        : m.claude.signedIn === false ? `Version ${m.claude.version}, not signed in`
        : [`Version ${m.claude.version}`, m.claude.email, m.claude.plan && `${m.claude.plan[0].toUpperCase()}${m.claude.plan.slice(1)} plan`].filter(Boolean).join(' · '),
      fix: !m.claude.installed ? { text: 'Install Claude Code, then run it once to sign in', command: 'npm install -g @anthropic-ai/claude-code' }
        : m.claude.signedIn === false ? { text: 'Sign in once in a terminal', command: 'claude' } : null,
    },
    {
      id: 'reddit', group: 'listen', name: 'Reddit',
      does: 'Reads the newest posts in the communities you picked and searches them for your phrases, once an hour.',
      state: 'on', detail: c.redditRooms.length ? `${c.redditRooms.length} communities · public feeds, no account` : 'Public feeds, no account',
    },
    {
      id: 'hackernews', group: 'listen', name: 'Hacker News',
      does: 'Searches Ask HN for your phrases every 30 minutes.',
      state: 'on', detail: 'Public search, no account',
    },
    {
      id: 'bluesky', group: 'listen', name: 'Bluesky',
      does: 'Searches every public post for your phrases every 30 minutes.',
      state: 'on', detail: 'Public search, no account',
    },
    {
      id: 'github', group: 'listen', name: 'GitHub Discussions',
      does: 'Reads the discussion boards of the tools your people use, and follows the answers to your own comments there.',
      state: m.gh.signedIn ? 'on' : 'off',
      detail: m.gh.signedIn ? [`Signed in as ${m.gh.user ?? 'you'}`, c.githubRepos.length && `${c.githubRepos.length} boards`].filter(Boolean).join(' · ')
        : m.gh.installed ? 'GitHub CLI found, not signed in' : 'Uses the GitHub CLI, which is not installed',
      fix: m.gh.signedIn ? null : m.gh.installed ? { text: 'Sign in once in a terminal', command: 'gh auth login' }
        : { text: 'Install the GitHub CLI from cli.github.com, then sign in', command: 'gh auth login' },
    },
    {
      id: 'telegram', group: 'you', name: 'Telegram',
      does: 'Talk to gtm.js from your phone. A morning brief, strong threads right after the run that finds them, every draft with one-tap buttons, and voice notes.',
      state: tg.state === 'linked' ? 'on' : tg.state === 'waiting' ? 'waiting' : 'off',
      detail: tg.state === 'linked' ? `@${tg.bot}${tg.owner ? `, linked to ${tg.owner}` : ''}` : tg.state === 'waiting' ? `@${tg.bot} is waiting for you to press Start` : 'Your own private bot',
    },
    {
      id: 'compose', group: 'you', name: 'X, Bluesky and LinkedIn',
      does: 'A post draft opens in the platform\'s own writing box, already filled in. gtm.js never posts anything by itself.',
      state: 'on', detail: 'One press, no account linked',
    },
    {
      id: 'accounts', group: 'you', name: 'Your public accounts',
      does: 'Your names on Reddit, Bluesky, Hacker News and GitHub. gtm.js finds what you really posted, counts likes and answers, and drafts the follow-up when someone answers you.',
      state: handles(c.me).length ? 'on' : 'off',
      detail: handles(c.me).length ? handles(c.me).map(([k, v]) => `${k}: ${v}`).join(' · ') : 'None given yet',
    },
    {
      id: 'repo', group: 'extra', name: 'Your code repository',
      does: 'New commits become build-in-public post drafts once a day. Only commit messages are read.',
      state: isGit(c.repo) ? 'on' : 'off',
      detail: c.repo ? (isGit(c.repo) ? c.repo : `${c.repo} is not a git folder`) : 'No folder set',
      fix: m.git ? null : { text: 'Needs git on this computer, from git-scm.com' },
    },
    {
      id: 'docs', group: 'extra', name: 'Your product documents',
      does: 'A folder of Markdown files about your product. Every problem people raise is checked against it, with a quote from the document as proof.',
      state: c.docs && existsSync(c.docs) ? 'on' : 'off',
      detail: c.docs ? (existsSync(c.docs) ? c.docs : `${c.docs} was not found`) : 'No folder set',
    },
    {
      id: 'voice', group: 'extra', name: 'Voice notes',
      does: 'Voice notes sent on Telegram are turned into text on this computer. The speech model downloads once, on the first note.',
      state: m.ffmpeg ? 'on' : 'off',
      detail: m.ffmpeg ? 'ffmpeg found' : 'Needs ffmpeg',
      fix: m.ffmpeg ? null : { text: 'Install ffmpeg from ffmpeg.org' },
    },
    // winotch is shown only where it already runs.
    ...winotch() ? [{
      id: 'winotch', group: 'extra', name: 'winotch',
      does: 'Every new draft also appears on the island at the top of your screen, with Posted and Drop buttons.',
      state: 'on', detail: 'Running on this computer',
    }] : [],
  ]
}

// Said plainly, so nobody looks for them.
export const notYet = [
  { name: 'Posting for you', why: 'Every post and reply is sent by you, from the platform itself.' },
  { name: 'X and LinkedIn listening', why: 'Neither can be read without a paid or partner account.' },
  { name: 'YouTube and Threads', why: 'Planned.' },
]
