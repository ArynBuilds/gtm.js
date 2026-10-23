import { ExternalLink, FileBarChart, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { AnswerPages } from '@/components/AnswerPages'
import { Empty, Page, PlatformMark } from '@/components/marks'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type Reports, useAct, useProduct, useReports, useStatus } from '@/lib/api'
import { day } from '@/lib/format'
import { cn } from '@/lib/utils'

const notYet = <Empty icon={<FileBarChart />} title="Not written yet">This is written once a week. Press "Write them now" to get the first one.</Empty>

function Answers({ a }: { a: NonNullable<Reports['answers']> }) {
  const name = useProduct()
  const top = Object.entries(a.tally).sort((x, y) => y[1] - x[1]).slice(0, 10)
  const rows = [[name, a.ours] as [string, number], ...top]
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[280px_1fr] gap-5">
        <div className="rounded-2xl border bg-card p-6">
          <div className="text-sm text-muted-foreground">Answers that named {name}</div>
          <div className="mt-2 text-6xl font-semibold tabular-nums tracking-tight">{a.ours}<span className="text-2xl text-quiet"> / {a.asked}</span></div>
          <p className="mt-4 text-xs leading-relaxed text-quiet">Asked {day(a.at)}. The questions a future user would ask an AI, with no hint of who we are. Before launch, zero is the honest starting line.</p>
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <div className="mb-4 text-sm text-muted-foreground">Who gets named instead</div>
          <div className="space-y-2">
            {rows.map(([name, n], i) => (
              <div key={name} className="grid grid-cols-[140px_1fr_28px] items-center gap-3 text-sm">
                <span className={cn('truncate', i === 0 && 'font-medium')}>{name}</span>
                <span className="h-2 overflow-hidden rounded-full bg-secondary">
                  <span className={cn('block h-full rounded-full', i === 0 ? 'bg-primary' : 'bg-[#9a9a9a]')} style={{ width: `${(n / a.asked) * 100}%` }} />
                </span>
                <span className="text-right tabular-nums text-muted-foreground">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-2xl border bg-card">
        {a.rows.map((row, i) => (
          <div key={i} className="border-b px-6 py-4 last:border-0">
            <div className="text-sm">{row.question}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {row.named.map(n => <span key={n} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">{n}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Rivals({ r }: { r: NonNullable<Reports['rivals']> }) {
  const column = (title: string, lines: string[], strong = false) => (
    <div className={cn('rounded-2xl border p-6', strong ? 'border-primary/30 bg-primary/5' : 'bg-card')}>
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">{lines.map(l => <li key={l}>{l}</li>)}</ul>
    </div>
  )
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {r.stars.map(s => (
          <span key={s.repo} className="rounded-full bg-secondary px-3 py-1 text-xs">
            {s.repo.split('/')[1]} <span className="tabular-nums text-muted-foreground">{Math.round(s.stars / 1000)}k stars</span>
          </span>
        ))}
        <span className="ml-auto self-center text-xs text-quiet">Week to {day(r.at)}</span>
      </div>
      {column('What it means for us', r.forUs, true)}
      <div className="grid grid-cols-2 gap-5">{column('What they shipped', r.shipped)}{column('What people said', r.said)}</div>
    </div>
  )
}

export function Insights() {
  const { data: r } = useReports()
  const name = useProduct()
  const { data: s } = useStatus()
  const act = useAct()
  if (!r) return null
  const working = s?.busy.includes('weekly')
  return (
    <Page title="Insights" sub="Written once a week" action={
      <Button variant="secondary" disabled={working} onClick={() => { act.mutate({ name: 'run/weekly' }); toast('Writing the reports. It takes a few minutes.') }}>
        <RefreshCw className={working ? 'animate-spin' : ''} /> {working ? 'Writing' : 'Write them now'}
      </Button>}>
      <Tabs defaultValue="answers" className="pb-10">
        <TabsList className="mb-5">
          <TabsTrigger value="answers">Do AIs recommend {name}?</TabsTrigger>
          <TabsTrigger value="rivals">Other tools</TabsTrigger>
          <TabsTrigger value="questions">Questions people ask</TabsTrigger>
          <TabsTrigger value="sent">What you sent</TabsTrigger>
          <TabsTrigger value="pages">Answer pages{r.pages.some(p => p.status === 'draft') ? ` (${r.pages.filter(p => p.status === 'draft').length})` : ''}</TabsTrigger>
        </TabsList>
        <TabsContent value="pages"><AnswerPages pages={r.pages} /></TabsContent>
        <TabsContent value="sent">
          {r.sent.length ? (
            <div className="rounded-2xl border bg-card">
              {r.sent.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener" className="flex items-center gap-4 border-b px-6 py-3.5 text-sm last:border-0 hover:bg-secondary/40">
                  <PlatformMark platform={s.platform} />
                  <span className="min-w-0 flex-1 truncate">{s.text}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{s.likes} likes, {s.answers} answers</span>
                  <span className="w-14 shrink-0 text-right text-xs tabular-nums text-quiet">{day(s.at)}</span>
                </a>
              ))}
            </div>
          ) : <Empty icon={<FileBarChart />} title="Nothing found yet">Once a post or reply from the Inbox is really up on Reddit, Bluesky, Hacker News or GitHub, it shows here with its likes and answers, checked every hour.</Empty>}
        </TabsContent>
        <TabsContent value="answers">{r.answers ? <Answers a={r.answers} /> : notYet}</TabsContent>
        <TabsContent value="rivals">{r.rivals ? <Rivals r={r.rivals} /> : notYet}</TabsContent>
        <TabsContent value="questions">
          {r.questions.length ? (
            <div className="rounded-2xl border bg-card">
              {r.questions.map((q, i) => (
                <a key={i} href={q.url} target="_blank" rel="noopener" className="flex items-center gap-4 border-b px-6 py-3.5 text-sm last:border-0 hover:bg-secondary/40">
                  <span className="w-14 shrink-0 text-xs tabular-nums text-quiet">{day(q.at)}</span>
                  <span className="flex-1">{q.question}</span>
                  <ExternalLink className="size-3.5 shrink-0 text-quiet" />
                </a>
              ))}
            </div>
          ) : <Empty icon={<FileBarChart />} title="None caught yet">When someone asks something the {name} docs should answer, the question is kept here.</Empty>}
        </TabsContent>
      </Tabs>
    </Page>
  )
}
