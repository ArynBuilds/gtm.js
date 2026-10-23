import { ArrowLeft, ArrowRight, Check, CircleDashed, Loader2, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { type Step, useSetup } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ease, rail, type StepId } from './state'

// The pieces every step of the setup is made of.

export function Rail({ at }: { at: StepId }) {
  const now = rail.findIndex(r => r.id === at)
  return (
    <ol className="ml-auto hidden items-center gap-1 sm:flex">
      {rail.map((r, i) => (
        <li key={r.id} className="flex items-center gap-1">
          {i > 0 && <span className={cn('h-px w-5 transition-colors duration-500', i <= now ? 'bg-muted-foreground/50' : 'bg-border')} />}
          <span className={cn('flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-colors duration-300',
            i === now ? 'text-foreground' : i < now ? 'text-muted-foreground' : 'text-quiet')}>
            {i < now ? <Check className="size-3 text-good" strokeWidth={3} />
              : <span className={cn('size-1.5 rounded-full', i === now ? 'bg-primary' : 'bg-quiet/60')} />}
            {r.name}
          </span>
        </li>
      ))}
    </ol>
  )
}

export function Title({ eyebrow, title, sub }: { eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      {eyebrow && <p className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-primary">{eyebrow}</p>}
      <h1 className="text-balance text-[2rem] font-semibold leading-[1.15] tracking-tight">{title}</h1>
      {sub && <p className="mt-4 text-pretty text-[15px] leading-relaxed text-muted-foreground">{sub}</p>}
    </div>
  )
}

// Inside a form the main button submits it, so Enter works too; elsewhere it
// is pressed.
export function Nav({ back, next, form, label = 'Continue', disabled, busy, hint }: {
  back?: () => void; next?: () => void; form?: boolean; label?: string; disabled?: boolean; busy?: boolean; hint?: string
}) {
  return (
    <div className="mt-12 flex items-center gap-3">
      {back && <Button type="button" variant="ghost" onClick={back} className="h-11 rounded-xl px-4 text-muted-foreground"><ArrowLeft /> Back</Button>}
      <div className="flex-1" />
      {hint && <span className="text-xs text-quiet">{hint}</span>}
      {(next || form) && (
        <Button type={form ? 'submit' : 'button'} onClick={form ? undefined : next} disabled={disabled || busy} className="h-11 rounded-xl px-5 text-[15px]">
          {busy ? <Loader2 className="animate-spin" /> : null}{label}{!busy && <ArrowRight />}
        </Button>
      )}
    </div>
  )
}

export function Mark({ state }: { state: 'ok' | 'busy' | 'fail' | 'wait' }) {
  if (state === 'ok') return <span className="grid size-5 shrink-0 place-items-center rounded-full bg-good/15 text-good"><Check className="size-3" strokeWidth={3} /></span>
  if (state === 'fail') return <span className="grid size-5 shrink-0 place-items-center rounded-full bg-destructive/15 text-destructive"><X className="size-3" strokeWidth={3} /></span>
  if (state === 'busy') return <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
  return <CircleDashed className="size-5 shrink-0 text-quiet" />
}

export function Problem({ text, retry, back }: { text: string; retry: () => void; back: () => void }) {
  return (
    <div>
      <Title title="That did not work" sub="Nothing was lost. What you typed is still here." />
      <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 font-mono text-xs leading-relaxed text-destructive">{text || 'No answer came back.'}</div>
      <Nav back={back} next={retry} label="Try again" />
    </div>
  )
}

// Waiting, honestly: every line is a step the service has really started.
export function Working({ task, title, sub }: { task: string; title: string; sub: string }) {
  const { data } = useSetup(true)
  const seen = useRef<Step[]>([])
  const live = data?.progress.task === task ? data.progress.steps : null
  if (live?.length) seen.current = live
  const steps = live ?? seen.current.map(st => ({ ...st, done: true }))
  const [seconds, setSeconds] = useState(0)
  useEffect(() => { const t = setInterval(() => setSeconds(n => n + 1), 1000); return () => clearInterval(t) }, [])
  return (
    <div>
      <div className="relative grid size-11 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/15 [animation-duration:2.2s]" />
        <span className="size-2.5 rounded-full bg-primary" />
      </div>
      <div className="mt-8"><Title title={title} sub={sub} /></div>
      <ul className="mt-10 space-y-3.5">
        {steps.map(st => (
          <motion.li key={st.text} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease }}
            className="flex items-center gap-3 text-[15px]">
            <Mark state={st.done ? 'ok' : 'busy'} />
            <span className={st.done ? 'text-muted-foreground' : ''}>{st.text}</span>
          </motion.li>
        ))}
      </ul>
      <p className="mt-12 text-xs tabular-nums text-quiet">{seconds}s, usually under a minute. Claude Code is doing the reading.</p>
    </div>
  )
}


export const field = 'h-12 w-full rounded-xl border bg-card px-4 text-[15px] outline-none transition-[border-color,box-shadow] placeholder:text-quiet focus:border-primary/50 focus:ring-4 focus:ring-primary/10'

export function Label({ name, hint, optional, children }: { name: string; hint?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-baseline gap-2 text-sm font-medium">{name}{optional && <span className="text-xs font-normal text-quiet">optional</span>}</span>
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
      <span className="mt-2.5 block">{children}</span>
    </label>
  )
}


export function Switch({ on, onChange, name, hint }: { on: boolean; onChange: (on: boolean) => void; name: string; hint: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-secondary/30">
      <span className="min-w-0 flex-1">
        <span className="block text-sm">{name}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      </span>
      <span className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200', on ? 'bg-primary' : 'bg-secondary')}>
        <span className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left] duration-200', on ? 'left-[1.125rem]' : 'left-0.5')} />
      </span>
    </button>
  )
}


export function Chips({ items, onChange, prefix = '', placeholder }: { items: string[]; onChange: (items: string[]) => void; prefix?: string; placeholder: string }) {
  const [word, setWord] = useState('')
  const add = () => {
    const w = word.trim().replace(/^r\//i, '')
    if (w && !items.includes(w)) onChange([...items, w])
    setWord('')
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map(item => (
        <span key={item} className="flex items-center gap-1 rounded-full bg-secondary py-1 pl-3 pr-1 text-[13px]">
          {prefix}{item}
          <button type="button" title="Remove" onClick={() => onChange(items.filter(i => i !== item))}
            className="grid size-5 place-items-center rounded-full text-quiet transition-colors hover:bg-background hover:text-foreground"><X className="size-3" /></button>
        </span>
      ))}
      <input value={word} onChange={e => setWord(e.target.value)} onBlur={add} placeholder={placeholder}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        className="h-7 w-40 rounded-full bg-transparent px-3 text-[13px] outline-none transition-colors placeholder:text-quiet focus:bg-secondary/50" />
    </div>
  )
}

export function Part({ title, hint, count, children }: { title: string; hint: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-6">
      <div className="flex items-baseline gap-2.5">
        <h2 className="text-[15px] font-medium">{title}</h2>
        {count !== undefined && <span className="text-xs tabular-nums text-quiet">{count}</span>}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}
