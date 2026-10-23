import { Check, ChevronDown, ExternalLink, FileText, Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { Empty, Page, PlatformMark } from '@/components/marks'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { type Theme, type Verdict, useAct, useBoard } from '@/lib/api'
import { day } from '@/lib/format'
import { cn } from '@/lib/utils'

const verdicts: Record<Verdict, { name: string; tone: string }> = {
  not_found: { name: 'Not in our documents', tone: 'bg-destructive/15 text-destructive' },
  unclear: { name: 'Unclear', tone: 'bg-warn/15 text-warn' },
  partly: { name: 'Partly planned', tone: 'bg-warn/15 text-warn' },
  planned: { name: 'Planned', tone: 'bg-good/15 text-good' },
  out_of_scope: { name: 'Not ours to solve', tone: 'bg-secondary text-muted-foreground' },
}

function Chip({ verdict }: { verdict: Verdict | null }) {
  if (!verdict) return <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-quiet">Not judged yet</span>
  return <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', verdicts[verdict].tone)}>{verdicts[verdict].name}</span>
}

function Row({ t, most }: { t: Theme; most: number }) {
  const [open, setOpen] = useState(false)
  const act = useAct()
  const total = t.inside + t.outside
  const set = (verdict: Verdict) => act.mutate({ name: `verdict/${t.id}`, body: { verdict } })
  return (
    <div className={cn('rounded-2xl border transition-colors', open ? 'bg-card' : 'border-transparent hover:bg-card/60')}>
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-4 px-5 py-4 text-left">
        <span className="w-9 shrink-0 text-right text-2xl font-semibold tabular-nums tracking-tight">{total}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium first-letter:uppercase">{t.name}</div>
          <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-secondary" style={{ width: `${Math.max((total / most) * 100, 6)}%` }}>
            <span className="bg-[#9a9a9a]" style={{ width: `${(t.inside / total) * 100}%` }} />
            <span className="bg-primary" style={{ width: `${(t.outside / total) * 100}%` }} />
          </div>
        </div>
        <Chip verdict={t.verdict} />
        <ChevronDown className={cn('size-4 shrink-0 text-quiet transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-5 px-5 pb-5 pl-[4.75rem]">
          <p className="text-sm text-muted-foreground">{t.summary} Seen {t.inside} times inside our topics and {t.outside} outside.</p>
          {t.verdict && (
            <div className="rounded-xl bg-secondary/50 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium"><FileText className="size-4" /> What our documents say{t.confirmed ? <span className="text-xs font-normal text-good">confirmed by you</span> : null}</div>
              <p className="mt-2 text-muted-foreground">{t.why}</p>
              {t.capability && <p className="mt-3">{t.capability}</p>}
              {t.proof && <p className="mt-2 border-l-2 pl-3 italic text-muted-foreground">"{t.proof}"</p>}
              {t.doc && <p className="mt-2 font-mono text-xs text-quiet">{t.doc} - {t.section}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {!t.confirmed && <Button size="sm" onClick={() => set(t.verdict!)}><Check /> This is right</Button>}
                <span className="text-xs text-quiet">or correct it:</span>
                {(Object.keys(verdicts) as Verdict[]).filter(v => v !== t.verdict).map(v => (
                  <Button key={v} size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => set(v)}>{verdicts[v].name}</Button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3">
            {t.said.map((p, i) => (
              <a key={i} href={p.url} target="_blank" rel="noopener" className="group flex items-start gap-3 text-sm">
                <PlatformMark platform={p.platform} className="mt-0.5 size-5" />
                <span className="min-w-0 flex-1">
                  {p.problem}
                  {p.tools.length > 0 && <span className="text-quiet"> ({p.tools.join(', ')})</span>}
                  {p.tried && <span className="block text-xs text-quiet">Tried: {p.tried}</span>}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-quiet">{day(p.at)}</span>
                <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-quiet opacity-0 group-hover:opacity-100" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function Problems() {
  const { data: b } = useBoard()
  const [where, setWhere] = useState('all')
  if (!b) return null
  if (!b.themes.length) {
    return <Page title="Problems"><Empty icon={<Lightbulb />} title="No themes yet">Problems are pulled from every post it reads and grouped once a day. The first board appears after the next daily run.</Empty></Page>
  }
  const shown = b.themes.filter(t => where === 'all' || (where === 'outside' ? t.outside > 0 : t.inside > 0))
  const gaps = b.themes.filter(t => t.verdict === 'not_found' || t.verdict === 'unclear').length
  const most = Math.max(...b.themes.map(t => t.inside + t.outside))
  return (
    <Page title="Problems" sub={b.capabilities ? `What people are struggling with, judged against ${b.capabilities} things your documents promise` : 'What people are struggling with, grouped once a day'} action={
      <ToggleGroup type="single" value={where} onValueChange={v => v && setWhere(v)} variant="outline" size="sm">
        <ToggleGroupItem value="all" className="px-3">All</ToggleGroupItem>
        <ToggleGroupItem value="inside" className="px-3">Inside our topics</ToggleGroupItem>
        <ToggleGroupItem value="outside" className="px-3">Outside</ToggleGroupItem>
      </ToggleGroup>}>
      <div className="grid grid-cols-[1fr_260px] gap-8 pb-10">
        <div>
          <div className="mb-3 flex items-center gap-4 px-5 text-xs text-quiet">
            <span>{b.themes.length} themes{b.capabilities ? `, ${gaps} without a clear answer` : ''}</span>
            <span className="ml-auto flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#9a9a9a]" /> inside our topics</span>
            <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-primary" /> outside</span>
          </div>
          <div className="space-y-1">{shown.map(t => <Row key={t.id} t={t} most={most} />)}</div>
        </div>
        <aside>
          <h2 className="text-sm font-semibold">Tools named in the problems</h2>
          <p className="mt-1 text-xs text-muted-foreground">Who people are using when it hurts.</p>
          <div className="mt-4 space-y-2">
            {b.blamed.map(([name, n]) => (
              <div key={name} className="grid grid-cols-[1fr_70px_20px] items-center gap-2 text-sm">
                <span className="truncate">{name}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-[#9a9a9a]" style={{ width: `${(n / b.blamed[0][1]) * 100}%` }} /></span>
                <span className="text-right text-xs tabular-nums text-muted-foreground">{n}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </Page>
  )
}
