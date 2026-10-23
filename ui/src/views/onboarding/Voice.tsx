import { Accounts } from '@/components/Connections'
import { cn } from '@/lib/utils'
import { field, Label, Nav, Switch, Title } from './kit'
import type { Voice } from './state'

export function VoiceStep({ voice: v, me, onVoice, onMe, back, next }: {
  voice: Voice; me: Record<string, string>; onVoice: (v: Voice) => void; onMe: (me: Record<string, string>) => void; back: () => void; next: () => void
}) {
  const rule = (k: keyof Voice['rules']) => (on: boolean) => onVoice({ ...v, rules: { ...v.rules, [k]: on } })
  return (
    <form onSubmit={e => { e.preventDefault(); next() }}>
      <Title title="How you sound" sub="Every draft is written as you. These are the rules it never breaks." />
      <div className="mt-10 space-y-8">
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <Label name="The name you post under"><input autoFocus value={v.founder} onChange={e => onVoice({ ...v, founder: e.target.value })} placeholder="Sam" className={field} /></Label>
          <div className="flex h-12 rounded-xl border bg-card p-1">
            {(['I', 'we'] as const).map(p => (
              <button key={p} type="button" onClick={() => onVoice({ ...v, person: p })} aria-pressed={v.person === p}
                className={cn('rounded-lg px-4 text-sm transition-colors duration-200', v.person === p ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                Says "{p}"
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="text-sm font-medium">House rules</span>
          <div className="mt-2.5 divide-y overflow-hidden rounded-2xl border bg-card">
            <Switch on={v.rules.hype} onChange={rule('hype')} name="No hype words" hint="Never revolutionary, seamless, game-changer, supercharge." />
            <Switch on={v.rules.emoji} onChange={rule('emoji')} name="No emoji" hint="Plain text, the way a person replies in a thread." />
            <Switch on={v.rules.hashtags} onChange={rule('hashtags')} name="No hashtags" hint="Not even on your own posts." />
            <Switch on={v.rules.dashes} onChange={rule('dashes')} name="No dashes as punctuation" hint="Commas and full stops instead. Every draft is checked for it." />
          </div>
        </div>
        <Label name="Something you wrote" optional hint="A post or a reply of yours. It learns how you sound from it.">
          <textarea value={v.sample} onChange={e => onVoice({ ...v, sample: e.target.value })} rows={4} placeholder="Paste it here"
            className={cn(field, 'h-auto min-h-28 resize-none py-3.5 leading-relaxed [field-sizing:content]')} />
        </Label>
        <div>
          <span className="flex items-baseline gap-2 text-sm font-medium">Your public accounts <span className="text-xs font-normal text-quiet">optional</span></span>
          <span className="mt-1 block text-xs text-muted-foreground">So it can find what you posted from its drafts, count likes and answers, and draft the follow up when someone answers you.</span>
          <div className="mt-2.5"><Accounts me={me} onChange={onMe} /></div>
        </div>
      </div>
      <Nav back={back} form label="Build my setup" />
    </form>
  )
}
