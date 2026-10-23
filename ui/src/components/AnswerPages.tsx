import { Check, FileText } from 'lucide-react'
import { useState } from 'react'
import { Empty } from '@/components/marks'
import { Button } from '@/components/ui/button'
import { type Reports, useAct, useSetup } from '@/lib/api'

type AnswerPage = Reports['pages'][number]

// One answer page for the public site: read it, change it, then let it out or drop it.
function One({ p }: { p: AnswerPage }) {
  const act = useAct()
  const site = useSetup().data?.product.url?.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') || 'your site'
  const [body, setBody] = useState(p.body)
  const set = (status: string) => act.mutate({ name: `answerpage/${p.id}`, body: { body, status } })
  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex items-start gap-3">
        <h3 className="min-w-0 flex-1 text-[15px] font-medium">{p.title}</h3>
        {p.status === 'approved' && <span className="flex shrink-0 items-center gap-1 rounded-full bg-good/15 px-2.5 py-0.5 text-xs font-medium text-good"><Check className="size-3" /> On the site</span>}
      </div>
      <p className="mt-1 font-mono text-xs text-quiet">{site}/answers/{p.slug}</p>
      <textarea value={body} onChange={e => setBody(e.target.value)}
        className="mt-4 w-full resize-none rounded-xl bg-background p-4 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring [field-sizing:content]" />
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={() => set('dropped')} disabled={act.isPending}>Drop it</Button>
        {p.status === 'approved'
          ? <><Button variant="secondary" onClick={() => set('draft')} disabled={act.isPending}>Take it off the site</Button>
            <Button onClick={() => set('approved')} disabled={act.isPending || body === p.body}>Save the change</Button></>
          : <Button onClick={() => set('approved')} disabled={act.isPending}>Approve for the site</Button>}
      </div>
    </div>
  )
}

export function AnswerPages({ pages }: { pages: AnswerPage[] }) {
  if (!pages.length) {
    return <Empty icon={<FileText />} title="No pages yet">Each day a few real questions people asked become draft answer pages. Nothing goes on the public site until you approve it here.</Empty>
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Drafted from real questions. Nothing is public until you approve it. The site itself is built from these when it is published.</p>
      {pages.map(p => <One key={p.id} p={p} />)}
    </div>
  )
}
