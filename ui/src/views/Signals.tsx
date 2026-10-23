import { ChevronDown, ExternalLink, Radio } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Empty, Page, PlatformMark, ScoreRing } from '@/components/marks'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { type Signal, useSignals } from '@/lib/api'
import { day, platformName } from '@/lib/format'
import { cn } from '@/lib/utils'

function Row({ s }: { s: Signal }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={cn('rounded-xl transition-colors', open ? 'bg-card' : 'hover:bg-card/60')}>
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-4 px-4 py-3 text-left">
        <ScoreRing score={s.score} />
        <PlatformMark platform={s.platform} />
        <span className="min-w-0 flex-1 truncate text-sm">{s.why}</span>
        <span className="shrink-0 text-xs tabular-nums text-quiet">{day(s.at)}</span>
        <ChevronDown className={cn('size-4 shrink-0 text-quiet transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4 pl-[4.5rem]">
          <div className="text-xs text-muted-foreground">{s.name ?? 'Someone'} on {platformName[s.platform] ?? s.platform}{s.phrase && <> - found by "{s.phrase}"</>}</div>
          {s.title && <div className="text-sm font-medium">{s.title}</div>}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{s.text}</p>
          {s.question && <div className="rounded-lg bg-secondary/60 px-3 py-2 text-sm"><span className="text-muted-foreground">The question in it: </span>{s.question}</div>}
          <a href={s.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">Open the post <ExternalLink className="size-3" /></a>
        </div>
      )}
    </div>
  )
}

export function Signals() {
  const { data: all } = useSignals()
  const [least, setLeast] = useState('4')
  const [where, setWhere] = useState('all')
  const platforms = useMemo(() => [...new Set((all ?? []).map(s => s.platform))], [all])
  if (!all) return null
  const shown = all.filter(s => s.score >= Number(least) && (where === 'all' || s.platform === where))
  return (
    <Page title="Signals" sub="Every post it read, the score it gave, and why" action={
      <div className="flex gap-3">
        <ToggleGroup type="single" value={where} onValueChange={v => v && setWhere(v)} variant="outline" size="sm">
          <ToggleGroupItem value="all" className="px-3">Everywhere</ToggleGroupItem>
          {platforms.map(p => <ToggleGroupItem key={p} value={p} className="px-3">{platformName[p] ?? p}</ToggleGroupItem>)}
        </ToggleGroup>
        <ToggleGroup type="single" value={least} onValueChange={v => v && setLeast(v)} variant="outline" size="sm">
          <ToggleGroupItem value="0" className="px-3">All</ToggleGroupItem>
          <ToggleGroupItem value="4" className="px-3">4+</ToggleGroupItem>
          <ToggleGroupItem value="6" className="px-3">6+</ToggleGroupItem>
        </ToggleGroup>
      </div>}>
      {shown.length ? <div className="space-y-1 pb-10">{shown.map(s => <Row key={s.id} s={s} />)}</div>
        : <Empty icon={<Radio />} title="Nothing at this score">Lower the score filter to see everything it read, including the noise it threw away.</Empty>}
    </Page>
  )
}
