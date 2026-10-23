import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Command } from '@/components/Connections'
import { Button } from '@/components/ui/button'
import { send, useConnections, useSetup } from '@/lib/api'
import { Mark, Nav, Title } from './kit'
import { ease, words } from './state'

export function CheckStep({ next }: { next: () => void }) {
  const { data, isError } = useConnections(true)
  const { data: setup } = useSetup()
  const m = data?.machine
  const [test, setTest] = useState<{ state: 'idle' | 'busy' | 'ok' | 'fail'; ms?: number; error?: string }>({ state: 'idle' })
  const usable = Boolean(m?.claude.installed && m.claude.signedIn !== false)

  const run = async () => {
    setTest({ state: 'busy' })
    try {
      const r = await send<{ ok: boolean; ms: number }>('setup/test')
      setTest(r.ok ? { state: 'ok', ms: r.ms } : { state: 'fail', error: 'It answered, but not with the word it was asked for.' })
    } catch (err) { setTest({ state: 'fail', error: words(err) }) }
  }
  useEffect(() => { if (usable && test.state === 'idle') run() }, [usable])

  const plan = m?.claude.plan ? `${m.claude.plan[0].toUpperCase()}${m.claude.plan.slice(1)} plan` : null
  const rows: { name: string; state: 'ok' | 'busy' | 'fail' | 'wait'; value: string; fix?: React.ReactNode }[] = [
    { name: 'Node.js', state: m ? 'ok' : 'busy', value: m ? `v${m.node}` : 'Looking' },
    {
      name: 'Claude Code', state: !m ? 'wait' : m.claude.installed ? 'ok' : 'fail',
      value: !m ? '' : m.claude.installed ? `Version ${m.claude.version}` : 'Not found on this computer',
      fix: m && !m.claude.installed && <><span>Install it, then open a new terminal and run <span className="font-mono text-foreground">claude</span> once to sign in.</span><Command text="npm install -g @anthropic-ai/claude-code" /></>,
    },
    {
      name: 'Signed in', state: !m?.claude.installed ? 'wait' : m.claude.signedIn === false ? 'fail' : m.claude.signedIn ? 'ok' : test.state === 'ok' ? 'ok' : 'busy',
      value: !m?.claude.installed ? '' : m.claude.signedIn === false ? 'Not signed in' : [m.claude.email, plan].filter(Boolean).join(' · ') || 'Checked by the live test',
      fix: m?.claude.signedIn === false && <><span>Run it once in a terminal and sign in.</span><Command text="claude" /></>,
    },
    {
      name: 'Live test', state: test.state === 'idle' ? 'wait' : test.state,
      value: test.state === 'busy' ? 'Asking it for one word' : test.state === 'ok' ? `Answered in ${((test.ms ?? 0) / 1000).toFixed(1)} s` : test.state === 'fail' ? 'No answer' : '',
      fix: test.state === 'fail' && <><span className="font-mono text-destructive">{test.error}</span><Button size="xs" variant="secondary" onClick={run}>Test again</Button></>,
    },
  ]
  const waiting = m && !usable
  return (
    <form onSubmit={e => { e.preventDefault(); if (test.state === 'ok') next() }}>
      <Title eyebrow="Open source · runs on your computer"
        title={<>Your go-to-market agent.<br /><span className="text-muted-foreground">It finds the people who need what you make.</span></>}
        sub="gtm.js reads Reddit, Hacker News, Bluesky and GitHub for people who have the problem you solve, and drafts a reply to each one in your voice. You approve every word. Nothing is ever posted for you." />
      <div className="mt-10 overflow-hidden rounded-2xl border bg-card">
        {rows.map((r, i) => (
          <motion.div key={r.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 * i, duration: 0.3, ease }}
            className="border-b px-5 py-4 last:border-0">
            <div className="flex items-center gap-3.5">
              <Mark state={r.state} />
              <span className="text-[15px]">{r.name}</span>
              <span className="ml-auto truncate text-sm text-muted-foreground">{r.value}</span>
            </div>
            {r.fix && <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 pl-[2.125rem] text-xs text-muted-foreground">{r.fix}</div>}
          </motion.div>
        ))}
      </div>
      {isError && <p className="mt-4 text-sm text-destructive">The gtm.js service is not answering. Start it with npm start.</p>}
      <p className="mt-5 text-xs leading-relaxed text-quiet">
        The thinking runs on your own Claude Code plan: no API key, no extra bill. It gets no tools and cannot touch your files.
        Everything gtm.js keeps stays in {setup?.workspace ?? 'its data folder'}.
      </p>
      <Nav form disabled={test.state !== 'ok'} label={waiting ? 'Waiting for Claude Code' : 'Set up your product'}
        hint={waiting ? 'Checks again every few seconds' : undefined} />
    </form>
  )
}
