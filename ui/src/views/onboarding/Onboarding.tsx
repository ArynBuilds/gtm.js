import { useQueryClient } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { type Draft, type Interview, send, useSetup } from '@/lib/api'
import { cn } from '@/lib/utils'
import { CheckStep } from './Check'
import { ConnectStep, DoneStep } from './Finish'
import { Problem, Rail, Working } from './kit'
import { ProductStep } from './Product'
import { QuestionsStep } from './Questions'
import { ReviewStep } from './Review'
import { ease, fresh, key, load, type Saved, type StepId, store, words } from './state'
import { VoiceStep } from './Voice'

// The first thing a new person sees: it checks Claude Code is here, learns
// the product from what it already says about itself, asks its founder what
// only they know, and writes the workspace. Nothing runs until it is done.

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [s, setS] = useState<Saved>(load)
  const [busy, setBusy] = useState<'interview' | 'draft' | 'finish' | null>(null)
  const [problem, setProblem] = useState('')
  const client = useQueryClient()
  const { data: setup } = useSetup()
  const update = (patch: Partial<Saved>) => setS(v => ({ ...v, ...patch }))
  const go = (step: StepId) => { setProblem(''); update({ step }); scrollTo({ top: 0 }) }

  useEffect(() => { store(s) }, [s])
  // The last two steps need the workspace written; without it, back to the review.
  useEffect(() => {
    if (setup && !setup.ready && (s.step === 'connect' || s.step === 'done')) update({ step: 'review' })
  }, [setup?.ready])

  const draftFor = key({ p: s.product, a: s.answers, v: s.voice, i: s.interview?.summary })

  async function interview() {
    setBusy('interview'); setProblem('')
    try {
      const { name, line, url, repo, stage } = s.product
      const out = await send<Interview>('setup/interview', { name, line, url, repo, stage })
      update({ interview: out, interviewFor: key(s.product), at: 0, answers: {} })
    } catch (err) { setProblem(words(err)) } finally { setBusy(null) }
  }

  async function draft() {
    setBusy('draft'); setProblem('')
    try {
      const out = await send<Draft>('setup/draft', {
        product: s.product, summary: s.interview?.summary, questions: s.interview?.questions, answers: s.answers, voice: s.voice,
      })
      update({ draft: out, draftFor })
    } catch (err) { setProblem(words(err)) } finally { setBusy(null) }
  }

  async function finish() {
    if (!s.draft) return
    setBusy('finish'); setProblem('')
    try {
      await send('setup/finish', { product: s.product, voice: s.voice, me: s.me, brain: s.draft.brain, plan: s.draft.plan })
      await client.invalidateQueries()
      go('connect')
    } catch (err) { setProblem(words(err)) } finally { setBusy(null) }
  }

  // Arriving at a step whose work is missing or out of date starts that work,
  // also after a reload in the middle of it.
  useEffect(() => {
    if (busy || problem) return
    if (s.step === 'questions' && (!s.interview || s.interviewFor !== key(s.product))) interview()
    if (s.step === 'review' && (!s.draft || s.draftFor !== draftFor)) draft()
  }, [s.step])

  const leave = () => { store(null); onDone() }
  const restart = () => { store(null); setS({ ...fresh, step: 'product' }); setProblem('') }

  // A step whose work is due shows the waiting view from its first frame, not
  // only once the work has started.
  const reading = busy === 'interview' || (s.step === 'questions' && !problem && (!s.interview || s.interviewFor !== key(s.product)))
  const building = busy === 'draft' || (s.step === 'review' && !problem && (!s.draft || s.draftFor !== draftFor))
  const view = reading ? 'reading' : building ? 'building' : s.step
  const wide = view === 'review' || view === 'connect'
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-full bg-background">
        <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgb(245_197_24/0.07),transparent)]" />
        <header className="relative mx-auto flex max-w-5xl items-center gap-6 px-8 pt-7">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">g</span>
            <span className="text-[15px] font-semibold tracking-tight">gtm.js</span>
          </div>
          {s.step !== 'done' && <Rail at={s.step} />}
          {['questions', 'voice', 'review'].includes(s.step) && !busy && (
            <button onClick={restart} className="flex items-center gap-1.5 text-xs text-quiet transition-colors hover:text-foreground"><RotateCcw className="size-3" /> Start over</button>
          )}
        </header>
        <main className={cn('relative mx-auto px-8 pb-24 pt-16', wide ? 'max-w-3xl' : 'max-w-xl')}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.32, ease }}>
              {view === 'check' && <CheckStep next={() => go('product')} />}
              {view === 'product' && <ProductStep value={s.product} onChange={product => update({ product })} back={() => go('check')} next={() => go('questions')} />}
              {view === 'reading' && <Working task="interview" title={`Reading about ${s.product.name}`} sub="So it only asks you what it cannot find on its own." />}
              {view === 'questions' && (!s.interview
                ? <Problem text={problem} retry={interview} back={() => go('product')} />
                : <QuestionsStep interview={s.interview} answers={s.answers} at={s.at}
                  onAnswer={(id, text) => update({ answers: { ...s.answers, [id]: text } })}
                  onMove={at => update({ at })} back={() => go('product')} next={() => go('voice')} />)}
              {view === 'voice' && <VoiceStep voice={s.voice} me={s.me} onVoice={voice => update({ voice })} onMe={me => update({ me })}
                back={() => { update({ at: (s.interview?.questions.length ?? 1) - 1 }); go('questions') }} next={() => go('review')} />}
              {view === 'building' && <Working task="draft" title="Building your workspace" sub={`The brain every draft follows, and where the people who need ${s.product.name} talk.`} />}
              {view === 'review' && (!s.draft || s.draftFor !== draftFor
                ? <Problem text={problem} retry={draft} back={() => go('voice')} />
                : s.draft && <ReviewStep draft={s.draft} onChange={d => update({ draft: d })} busy={busy === 'finish'} problem={problem}
                  back={() => go('voice')} next={finish} />)}
              {view === 'connect' && <ConnectStep next={() => go('done')} />}
              {view === 'done' && <DoneStep name={s.product.name} founder={s.voice.founder} open={leave} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </MotionConfig>
  )
}
