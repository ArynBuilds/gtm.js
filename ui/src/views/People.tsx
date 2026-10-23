import { ExternalLink, Users } from 'lucide-react'
import { useState } from 'react'
import { Empty, Initial, Page, PlatformMark, ScoreRing } from '@/components/marks'
import { Button } from '@/components/ui/button'
import { type Person, useAct, usePeople, useToday, useTrace } from '@/lib/api'
import { ago, count, day } from '@/lib/format'
import { cn } from '@/lib/utils'

const handles = (p: Person) => p.handles.split(/\s{2,}/).map(h => {
  const [platform, ...rest] = h.split(':')
  return { platform, handle: rest.join(':') }
})

const nextWords = { reply: 'reply now', watch: 'keep watching', invite: 'tell them at launch', leave: 'leave it' }

// Everything one person said that was caught, newest first, across platforms.
function Trace({ person }: { person: Person }) {
  const { data: events = [] } = useTrace(person.id)
  return (
    <div className="h-full overflow-y-auto px-8 pb-8">
      <div className="flex items-center gap-4">
        <Initial name={person.name} className="size-14 text-xl" />
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold tracking-tight">{person.name}</h2>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {handles(person).map(h => (
              <span key={h.platform + h.handle} className="flex items-center gap-1.5 rounded-full bg-secondary py-0.5 pl-0.5 pr-2.5 text-xs">
                <PlatformMark platform={h.platform} className="size-5 rounded-full bg-background" /> {h.handle}
              </span>
            ))}
          </div>
        </div>
      </div>
      {person.next && (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4">
          <div className="text-sm font-semibold">Next step: {nextWords[person.next]}</div>
          <p className="mt-1 text-sm text-muted-foreground">{person.next_why}</p>
        </div>
      )}
      <ol className="mt-8 space-y-6 border-l pl-6">
        {events.map((e, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[29px] top-1.5 size-2 rounded-full bg-quiet ring-4 ring-background" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <PlatformMark platform={e.platform} className="size-5" /> {day(e.at)}
              <a href={e.url} target="_blank" rel="noopener" className="ml-auto flex items-center gap-1 hover:text-foreground">Open <ExternalLink className="size-3" /></a>
            </div>
            {e.title && <div className="mt-2 text-sm font-medium">{e.title}</div>}
            <p className="mt-1.5 line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed">{e.text}</p>
            {e.why && <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><ScoreRing score={e.score} size={26} /> {e.why}</div>}
          </li>
        ))}
      </ol>
    </div>
  )
}

function Joins() {
  const { data: t } = useToday()
  const act = useAct()
  if (!t?.joins.length) return null
  return (
    <div className="space-y-2 px-3 pb-3">
      {t.joins.map(j => (
        <div key={`${j.a.person_id}-${j.b.person_id}`} className="rounded-xl bg-secondary/60 p-3 text-xs">
          <div className="font-medium">Same person?</div>
          <div className="mt-1 text-muted-foreground">{j.a.platform}:{j.a.handle} and {j.b.platform}:{j.b.handle}</div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => act.mutate({ name: 'join', body: { keep: j.a.person_id, gone: j.b.person_id } })}>Join</Button>
            <Button size="sm" variant="ghost" onClick={() => act.mutate({ name: 'apart', body: { a: j.a.person_id, b: j.b.person_id } })}>Different people</Button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function People() {
  const { data: people } = usePeople()
  const [picked, setPicked] = useState<number | null>(null)
  if (!people) return null
  if (!people.length) {
    return <Page title="People"><Empty icon={<Users />} title="Nobody yet">People appear here once someone's post scores 4 or more. Each one keeps a history across every platform.</Empty></Page>
  }
  const current = people.find(p => p.id === picked) ?? people[0]
  return (
    <div className="flex h-full">
      <div className="flex w-80 shrink-0 flex-col border-r">
        <div className="px-6 pb-4 pt-8">
          <h1 className="text-2xl font-semibold tracking-tight">People</h1>
          <p className="mt-1 text-sm text-muted-foreground">{count(people.length, 'person', 'people')} showed the problem</p>
        </div>
        <Joins />
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {people.map(p => (
            <button key={p.id} onClick={() => setPicked(p.id)} className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-secondary/60',
              p.id === current.id && 'bg-secondary')}>
              <Initial name={p.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.next ? nextWords[p.next] : count(p.events, 'post', 'posts')} - {ago(p.last)}</div>
              </div>
              <ScoreRing score={p.best} />
            </button>
          ))}
        </div>
      </div>
      <div className="min-w-0 flex-1 pt-8"><Trace key={current.id} person={current} /></div>
    </div>
  )
}
