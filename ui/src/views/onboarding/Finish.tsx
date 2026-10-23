import { motion } from 'motion/react'
import { ConnectionsList } from '@/components/Connections'
import { Nav, Title } from './kit'
import { ease } from './state'

export function ConnectStep({ next }: { next: () => void }) {
  return (
    <div>
      <Title title="What gtm.js connects to" sub="It is already listening on everything marked On. Add the rest now or later from the Connections page. Nothing here needs a paid account." />
      <div className="mt-10"><ConnectionsList /></div>
      <Nav next={next} label="Finish" />
    </div>
  )
}

export function DoneStep({ name, founder, open }: { name: string; founder: string; open: () => void }) {
  const lines = [
    ['Now', 'Hacker News, Bluesky and GitHub, in seconds.'],
    ['In a few minutes', 'Reddit, which allows one request a minute.'],
    ['Every 30 minutes', 'It listens again and drafts the replies worth sending.'],
    ['Every morning', 'What is waiting, on Telegram if you linked it.'],
    ['Every Monday', `What the alternatives shipped, and whether AI assistants name ${name}.`],
  ]
  return (
    <div>
      <svg viewBox="0 0 52 52" className="size-14">
        <motion.circle cx="26" cy="26" r="24" fill="none" stroke="var(--good)" strokeWidth="2.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease }} />
        <motion.path d="M15 27 l7 7 l15 -16" fill="none" stroke="var(--good)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.45, duration: 0.4, ease }} />
      </svg>
      <div className="mt-8"><Title title={`You are set${founder.trim() ? `, ${founder.trim()}` : ''}.`} sub={`gtm.js is listening for ${name} now. Drafts land in your Inbox, and nothing goes out until you send it.`} /></div>
      <ol className="mt-10 space-y-0">
        {lines.map(([when, what], i) => (
          <motion.li key={when} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.07, duration: 0.3, ease }}
            className="grid grid-cols-[9rem_1fr] gap-4 border-t py-3.5 text-sm">
            <span className="text-quiet">{when}</span><span>{what}</span>
          </motion.li>
        ))}
      </ol>
      <Nav next={open} label="Open gtm.js" />
    </div>
  )
}
