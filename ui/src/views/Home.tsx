import { ArrowRight, Check, ChevronRight, RefreshCw, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { toast } from 'sonner'
import { PlatformMark } from '@/components/marks'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { type Proposals, type Status, type Today, type Week, useAct, useProduct, useReports, useStatus, useToday } from '@/lib/api'
import { clock, count, day, greeting, platformName } from '@/lib/format'

function summary(t: Today) {
  const parts = []
  if (t.posts.length) parts.push(`${count(t.posts.length, 'post is', 'posts are')} ready to send`)
  if (t.replies.length) parts.push(`${count(t.replies.length, 'reply is', 'replies are')} worth sending`)
  return parts.length ? `${parts.join(' and ')}.` : 'Nothing needs you right now. It keeps listening.'
}

const stages: { key: keyof Week; name: string; hint: string }[] = [
  { key: 'heard', name: 'Heard', hint: 'posts on topic' },
  { key: 'good', name: 'Worth a look', hint: 'scored 6 or more' },
  { key: 'drafted', name: 'Drafted', hint: 'written for you' },
  { key: 'sent', name: 'Sent', hint: 'posted by you' },
]

// The whole system as one picture: what came in, what survived, what went out.
function Flow({ s }: { s: Status }) {
  const days = s.days.map(d => ({ ...d, label: day(d.day) }))
  return (
    <section className="rounded-2xl border bg-card">
      <div className="grid grid-cols-4">
        {stages.map((stage, i) => (
          <div key={stage.key} className="relative px-6 py-5">
            {i > 0 && <ChevronRight className="absolute -left-2.5 top-1/2 size-5 -translate-y-1/2 text-quiet" />}
            <div className="text-sm text-muted-foreground">{stage.name}</div>
            <div className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">{s.thisWeek[stage.key]}</div>
            <div className="mt-1 text-xs text-muted-foreground">{stage.hint}</div>
            <div className="text-xs text-quiet">{s.lastWeek[stage.key]} the week before</div>
          </div>
        ))}
      </div>
      <div className="h-28 border-t px-2 pt-3">
        {days.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={days} margin={{ top: 4, right: 16, left: 16, bottom: 0 }}>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--quiet)', fontSize: 11 }} interval="preserveStartEnd" />
              <Tooltip cursor={{ stroke: 'var(--quiet)' }} contentStyle={{ background: 'var(--popover)', border: 0, borderRadius: 10, fontSize: 12 }} />
              <Area isAnimationActive={false} type="monotone" dataKey="heard" name="Heard" stroke="#8a8a8a" fill="#8a8a8a" fillOpacity={0.12} strokeWidth={1.5} />
              <Area isAnimationActive={false} type="monotone" dataKey="good" name="Worth a look" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.18} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <div className="grid h-full place-items-center text-xs text-quiet">The daily chart appears after two days of listening.</div>}
      </div>
    </section>
  )
}

function UpNext({ t }: { t: Today }) {
  const items = [
    ...t.replies.map(r => ({ id: r.id, platform: r.platform, title: `Reply to ${r.name ?? 'someone'}`, text: r.text })),
    ...t.posts.map(p => ({ id: p.id, platform: p.platform, title: `Post on ${platformName[p.platform] ?? p.platform}`, text: p.text })),
  ]
  return (
    <section className="rounded-2xl border bg-card p-2">
      <div className="flex items-center px-4 pb-1 pt-3">
        <h2 className="flex-1 text-sm font-semibold">Waiting for you</h2>
        <Link to="/inbox" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">Open inbox <ArrowRight className="size-3" /></Link>
      </div>
      {items.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">All clear.</p>}
      {items.slice(0, 4).map(item => (
        <Link key={item.id} to={`/inbox?id=${item.id}`} className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-secondary/60">
          <PlatformMark platform={item.platform} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{item.title}</div>
            <div className="truncate text-xs text-muted-foreground">{item.text}</div>
          </div>
        </Link>
      ))}
    </section>
  )
}

function Recommended() {
  const { data: r } = useReports()
  const name = useProduct()
  const a = r?.answers
  const top = a ? Object.entries(a.tally).sort((x, y) => y[1] - x[1]).slice(0, 3) : []
  return (
    <Link to="/insights" className="block rounded-2xl border bg-card p-5 transition-colors hover:bg-secondary/30">
      <h2 className="text-sm font-semibold">Do AI assistants recommend {name}?</h2>
      {a ? (
        <>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tabular-nums tracking-tight">{a.ours}</span>
            <span className="text-sm text-muted-foreground">of {a.asked} answers named {name}</span>
          </div>
          <div className="mt-3 text-xs text-quiet">Named instead: {top.map(([name, n]) => `${name} (${n})`).join(', ')}</div>
        </>
      ) : <p className="mt-3 text-sm text-muted-foreground">Checked once a week. Not run yet.</p>}
    </Link>
  )
}

function Learned({ p }: { p: Proposals }) {
  const act = useAct()
  const accept = (body: object, words: string) => act.mutate({ name: 'topics', body }, { onSuccess: () => toast(words) })
  if (!(p.add.length + p.drop.length + p.learned.length + p.brain.length)) return null
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-sm font-semibold">What it learned, and what it wants to change</h2>
      {p.learned.map(line => <p key={line} className="mt-2 text-sm text-muted-foreground">{line}</p>)}
      {p.add.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-xs text-muted-foreground">It wants to start listening for</div>
          <div className="flex flex-wrap gap-2">
            {p.add.map(x => (
              <Button key={x} variant="secondary" size="sm" className="rounded-full" onClick={() => accept({ add: [x] }, `Now listening for "${x}"`)}>
                <Check className="text-good" /> {x}
              </Button>
            ))}
          </div>
        </div>
      )}
      {p.drop.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-xs text-muted-foreground">It wants to stop listening for these, because they bring noise</div>
          <div className="flex flex-wrap gap-2">
            {p.drop.map(x => (
              <Button key={x} variant="secondary" size="sm" className="rounded-full" onClick={() => accept({ remove: [x] }, `Stopped listening for "${x}"`)}>
                <X className="text-muted-foreground" /> {x}
              </Button>
            ))}
          </div>
        </div>
      )}
      {p.brain.map(line => <p key={line} className="mt-3 border-t pt-3 text-sm">{line}</p>)}
      {p.brain.length > 0 && <p className="mt-3 text-xs text-quiet">To make one of these changes, tell it in the chat.</p>}
    </section>
  )
}

export function Home() {
  const { data: t } = useToday()
  const { data: s } = useStatus()
  const act = useAct()
  if (!t || !s) return <div className="mx-auto max-w-5xl space-y-4 p-8"><Skeleton className="h-10 w-72" /><Skeleton className="h-64" /></div>
  const working = s.busy.includes('cycle')
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-8 py-10">
      <header className="flex items-end gap-4 pb-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold tracking-tight">{greeting()}.</h1>
          <p className="mt-2 text-lg text-muted-foreground">{summary(t)}</p>
        </div>
        <Button variant="secondary" disabled={working} onClick={() => { act.mutate({ name: 'run/cycle' }); toast('Listening now') }}>
          <RefreshCw className={working ? 'animate-spin' : ''} /> {working ? 'Listening' : 'Listen now'}
        </Button>
        {t.posts.length + t.replies.length > 0 && <Button asChild><Link to="/inbox">Open inbox <ArrowRight /></Link></Button>}
      </header>
      <Flow s={s} />
      <div className="grid grid-cols-2 gap-5"><UpNext t={t} /><Recommended /></div>
      {t.proposals && <Learned p={t.proposals} />}
      <section className="pt-4">
        <h2 className="mb-2 text-sm font-semibold">What it has been doing</h2>
        {s.log.slice(0, 10).map((l, i) => (
          <div key={i} className="flex gap-4 py-1.5 text-sm">
            <span className="w-28 shrink-0 tabular-nums text-quiet">{day(l.at)} {clock(l.at)}</span>
            <span className="w-20 shrink-0 text-muted-foreground">{l.job}</span>
            <span className={l.ok ? '' : 'text-destructive'}>{l.text}</span>
          </div>
        ))}
      </section>
    </div>
  )
}
