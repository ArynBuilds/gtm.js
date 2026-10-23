import { ArrowLeft, ArrowRight, Check, Sparkles, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import type { Interview } from '@/lib/api'
import { cn } from '@/lib/utils'
import { field, Problem } from './kit'
import { ease } from './state'

export function QuestionsStep({ interview: iv, answers, at, onAnswer, onMove, back, next }: {
  interview: Interview; answers: Record<string, string>; at: number
  onAnswer: (id: string, text: string) => void; onMove: (at: number) => void; back: () => void; next: () => void
}) {
  const q = iv.questions[Math.min(at, iv.questions.length - 1)]
  const box = useRef<HTMLTextAreaElement>(null)
  const last = at >= iv.questions.length - 1
  const forward = () => last ? next() : onMove(at + 1)
  if (!q) return <Problem text="No questions came back." retry={next} back={back} />
  const answer = answers[q.id] ?? ''
  return (
    <div>
      {at === 0 && (
        <div className="mb-12 rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Sparkles className="size-3.5 text-primary" /> What it understood</div>
          <p className="mt-2.5 text-[15px] leading-relaxed">{iv.summary}</p>
          {iv.sources.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {iv.sources.map(src => (
                <span key={src.name} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs">
                  {src.ok ? <Check className="size-3 text-good" strokeWidth={3} /> : <X className="size-3 text-destructive" strokeWidth={3} />}
                  {src.name} <span className="text-quiet">{src.detail}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="mb-5 flex items-center gap-3 text-xs text-quiet">
        <span className="tabular-nums">Question {at + 1} of {iv.questions.length}</span>
        <span className="flex gap-1">
          {iv.questions.map((x, i) => (
            <span key={x.id} className={cn('h-1 w-5 rounded-full transition-colors duration-300', i < at ? 'bg-muted-foreground/60' : i === at ? 'bg-primary' : 'bg-secondary')} />
          ))}
        </span>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.form key={q.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.26, ease }}
          onSubmit={e => { e.preventDefault(); forward() }}>
          <h1 className="text-balance text-2xl font-semibold leading-snug tracking-tight">{q.question}</h1>
          {q.hint && <p className="mt-3 text-sm text-muted-foreground">{q.hint}</p>}
          {q.suggestions.length > 0 && (
            <div className="mt-7 space-y-2">
              <div className="text-xs text-quiet">Drafted from what it read. Pick one to start from.</div>
              {q.suggestions.map(sug => (
                <button key={sug} type="button" onClick={() => { onAnswer(q.id, sug); box.current?.focus() }}
                  className={cn('block w-full rounded-xl border bg-card px-4 py-3 text-left text-sm leading-relaxed transition-[border-color,background-color] duration-200',
                    answer === sug ? 'border-primary/60 bg-primary/[0.06]' : 'text-muted-foreground hover:border-white/15 hover:text-foreground')}>
                  {sug}
                </button>
              ))}
            </div>
          )}
          <textarea ref={box} autoFocus value={answer} onChange={e => onAnswer(q.id, e.target.value)} rows={3}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); forward() } }}
            placeholder="Your answer, in your own words"
            className={cn(field, 'mt-4 h-auto min-h-28 resize-none py-3.5 leading-relaxed [field-sizing:content]')} />
          <div className="mt-12 flex items-center gap-3">
            <Button type="button" variant="ghost" onClick={() => at > 0 ? onMove(at - 1) : back()} className="h-11 rounded-xl px-4 text-muted-foreground"><ArrowLeft /> Back</Button>
            <div className="flex-1" />
            <span className="hidden text-xs text-quiet sm:inline">Enter to continue, Shift Enter for a new line</span>
            {!answer.trim() && <Button type="button" variant="ghost" onClick={forward} className="h-11 rounded-xl px-4 text-muted-foreground">Skip</Button>}
            <Button type="submit" disabled={!answer.trim()} className="h-11 rounded-xl px-5 text-[15px]">{last ? 'Continue' : 'Next'} <ArrowRight /></Button>
          </div>
        </motion.form>
      </AnimatePresence>
    </div>
  )
}
