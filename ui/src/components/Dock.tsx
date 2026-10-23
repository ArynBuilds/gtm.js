import { useQueryClient } from '@tanstack/react-query'
import { ArrowUp, ExternalLink } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { type Message, send, useChat } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Telegram } from './Telegram'

const starters = ['What do you have for me today?', 'Do the manual pipeline', 'What did you learn this week?']

// A web address inside a message becomes a button that can be pressed, and
// words written *like this* are shown bold, the same as on Telegram.
function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https?:\/\/\S+)/).map((part, i) => i % 2 ? (
        <a key={i} href={part} target="_blank" rel="noopener" className="my-1 inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground">
          Open {new URL(part).hostname.replace('www.', '')} <ExternalLink className="size-3" />
        </a>
      ) : part.split(/\*([^*\n]+)\*/).map((piece, j) => j % 2
        ? <strong key={`${i}-${j}`} className="font-semibold text-white">{piece}</strong> : piece))}
    </>
  )
}

export function Dock() {
  const { data: history = [] } = useChat()
  const client = useQueryClient()
  const [text, setText] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [history.length, pending])

  async function say(words: string) {
    const clean = words.trim()
    if (!clean || pending) return
    setText('')
    setPending(clean)
    try { await send('talk', { text: clean }) } finally {
      await client.invalidateQueries()
      setPending(null)
    }
  }

  // The service saves a message the moment it arrives, so the list read from
  // it may already hold the one just sent. It is drawn once, never twice.
  const last = history[history.length - 1]
  const saved = last?.who === 'you' && last.text === pending
  const shown: Message[] = pending && !saved ? [...history, { who: 'you', via: 'screen', text: pending, at: '' }] : history
  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l bg-card/60">
      <header className="space-y-2 border-b px-5 py-4">
        <div className="text-[15px] font-semibold tracking-tight">Talk to gtm.js</div>
        <Telegram />
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {shown.length === 0 && (
          <div className="space-y-2 pt-6">
            <p className="pb-2 text-sm text-muted-foreground">Ask it anything, or tell it what to change. It can edit drafts, change what it listens for, and run the whole pipeline now.</p>
            {starters.map(s => (
              <button key={s} onClick={() => say(s)} className="block w-full rounded-xl bg-secondary/60 px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary">{s}</button>
            ))}
          </div>
        )}
        {shown.map((m, i) => (
          <div key={i} className={cn('whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]',
            m.who === 'you' && 'ml-auto w-fit max-w-[85%] rounded-[20px] bg-secondary px-4 py-2')}>
            <Words text={m.text} />
          </div>
        ))}
        {pending && <div className="flex gap-1 py-1">{[0, 1, 2].map(i => <span key={i} className="size-1.5 animate-pulse rounded-full bg-primary" style={{ animationDelay: `${i * 160}ms` }} />)}</div>}
        <div ref={end} />
      </div>
      <form onSubmit={e => { e.preventDefault(); say(text) }} className="p-4">
        <div className="flex items-end gap-2 rounded-3xl bg-secondary p-1.5 pl-4 focus-within:ring-2 focus-within:ring-ring">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={1} placeholder="Message gtm.js"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); say(text) } }}
            className="max-h-32 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground [field-sizing:content]" />
          <Button type="submit" size="icon" disabled={!text.trim() || Boolean(pending)} className="size-8 rounded-full"><ArrowUp /></Button>
        </div>
      </form>
    </aside>
  )
}
