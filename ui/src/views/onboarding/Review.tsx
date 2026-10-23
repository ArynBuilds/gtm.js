import { X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Draft, Plan } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Chips, Nav, Part, Title } from './kit'

export function ReviewStep({ draft: d, onChange, busy, problem, back, next }: {
  draft: Draft; onChange: (d: Draft) => void; busy: boolean; problem: string; back: () => void; next: () => void
}) {
  const [reading, setReading] = useState(false)
  const plan = (patch: Partial<Plan>) => onChange({ ...d, plan: { ...d.plan, ...patch } })
  const p = d.plan
  return (
    <div>
      <Title title="Here is your setup" sub="Change anything now. All of it can be changed later too, from the Brain page or by telling it in the chat." />
      <div className="mt-10 space-y-4">
        <Part title="The brain" hint="Read before every draft it writes: what you make, who it is for, how you sound, and the rules for replying in someone else's thread.">
          <div className="relative">
            <textarea value={d.brain} readOnly={!reading} onChange={e => onChange({ ...d, brain: e.target.value })} spellCheck={false}
              className={cn('w-full resize-none rounded-xl bg-background p-5 font-mono text-[12.5px] leading-relaxed outline-none',
                reading ? 'min-h-96 [field-sizing:content] focus:ring-2 focus:ring-ring' : 'h-52 overflow-hidden')} />
            {!reading && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 rounded-b-xl bg-gradient-to-t from-background to-transparent" />}
          </div>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => setReading(v => !v)}>{reading ? 'Done' : 'Read and edit'}</Button>
        </Part>
        <Part title="Listening for" count={p.topics.length} hint="A post is read only when it has one of these words and sounds like someone asking or struggling.">
          <Chips items={p.topics} onChange={topics => plan({ topics })} placeholder="Add a word" />
        </Part>
        <Part title="Searches" count={p.phrases.length} hint="Typed into Reddit, Hacker News and Bluesky search, the way someone with the problem would.">
          <Chips items={p.phrases} onChange={phrases => plan({ phrases })} placeholder="Add a search" />
        </Part>
        <Part title="Reddit communities" count={p.redditRooms.length} hint="Their newest posts are read every hour.">
          <Chips items={p.redditRooms} onChange={redditRooms => plan({ redditRooms })} prefix="r/" placeholder="Add a community" />
        </Part>
        <div className="grid gap-4 sm:grid-cols-2">
          <Part title="GitHub discussion boards" count={p.githubRepos.length} hint={`Where your people ask for help. ${d.checked.kept} of ${d.checked.repos} suggested repositories were real and kept.`}>
            {p.githubRepos.length ? <Chips items={p.githubRepos} onChange={githubRepos => plan({ githubRepos })} placeholder="owner/name" />
              : <p className="text-sm text-quiet">None. Your people do not seem to ask on GitHub.</p>}
          </Part>
          <Part title="Alternatives to follow" count={p.rivals.length} hint="What they ship each week, in your Monday report.">
            {p.rivals.length ? <Chips items={p.rivals} onChange={rivals => plan({ rivals })} placeholder="owner/name" />
              : <p className="text-sm text-quiet">None on GitHub.</p>}
          </Part>
        </div>
        <Part title="Switching moments" count={Object.keys(p.switchStatus).length}
          hint={`When a tool your people rely on has a serious outage, you hear at once. ${d.checked.working} of ${d.checked.pages} status pages answered and were kept.`}>
          <Chips items={Object.keys(p.switchStatus)} placeholder="" onChange={keep => plan({ switchStatus: Object.fromEntries(Object.entries(p.switchStatus).filter(([t]) => keep.includes(t))) })} />
        </Part>
        <Part title="The weekly AI check" count={p.asks.length} hint="Asked to an AI every Monday with no hint of who you are. It counts how often your product is named.">
          <ul className="divide-y rounded-xl border">
            {p.asks.map(q => (
              <li key={q} className="group flex items-start gap-3 px-4 py-2.5 text-sm">
                <span className="flex-1 text-muted-foreground">{q}</span>
                <button type="button" title="Remove" onClick={() => plan({ asks: p.asks.filter(x => x !== q) })}
                  className="grid size-5 shrink-0 place-items-center rounded-full text-quiet opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"><X className="size-3" /></button>
              </li>
            ))}
          </ul>
        </Part>
      </div>
      {problem && <p className="mt-6 text-sm text-destructive">{problem}</p>}
      <Nav back={back} next={next} busy={busy} label={busy ? 'Saving' : 'Looks right, start listening'} />
    </div>
  )
}
