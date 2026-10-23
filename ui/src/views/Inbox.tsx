import { CheckCheck, ExternalLink, Heart, MessageCircle, Repeat2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Empty, Initial, Page, PlatformMark, ScoreRing } from '@/components/marks'
import { Button } from '@/components/ui/button'
import { type PostDraft, type ReplyDraft, useAct, useToday } from '@/lib/api'
import { ago, limit, platformName } from '@/lib/format'
import { cn } from '@/lib/utils'

type Item = { kind: 'post'; draft: PostDraft } | { kind: 'reply'; draft: ReplyDraft }

const title = (item: Item) => item.kind === 'reply'
  ? `${item.draft.kind === 'answer' ? 'Follow up with' : 'Reply to'} ${item.draft.name ?? 'someone'}`
  : `Post on ${platformName[item.draft.platform] ?? item.draft.platform}`

// The draft drawn the way it will look once posted, and editable in place.
function Preview({ platform, text, onChange }: { platform: string; text: string; onChange: (text: string) => void }) {
  const max = limit[platform]
  const over = max !== undefined && text.length > max
  return (
    <div className="rounded-2xl border bg-background p-5">
      <div className="flex items-center gap-3">
        <Initial name="You" className="bg-primary text-primary-foreground" />
        <div className="flex-1 leading-tight">
          <div className="text-sm font-semibold">You</div>
          <div className="text-xs text-muted-foreground">on {platformName[platform] ?? platform} - not posted yet</div>
        </div>
        <PlatformMark platform={platform} />
      </div>
      <textarea value={text} onChange={e => onChange(e.target.value)} spellCheck
        className="mt-4 w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none [field-sizing:content]" />
      <div className="mt-3 flex items-center gap-5 text-quiet">
        <MessageCircle className="size-4" /><Repeat2 className="size-4" /><Heart className="size-4" />
        <span className={cn('ml-auto text-xs tabular-nums', over && 'font-medium text-destructive')}>
          {text.length}{max !== undefined && ` / ${max}`}
        </span>
      </div>
    </div>
  )
}

function Detail({ item, compose, onDone }: { item: Item; compose: Record<string, string>; onDone: () => void }) {
  const act = useAct()
  const [text, setText] = useState(item.draft.text)
  useEffect(() => setText(item.draft.text), [item.draft.id, item.draft.text])
  const id = item.draft.id

  const post = async () => {
    await act.mutateAsync({ name: `draft/${id}`, body: { text, status: 'posted' } })
    await navigator.clipboard.writeText(text).catch(() => {})
    const url = item.kind === 'reply' ? item.draft.url : (compose[item.draft.platform] ?? '') + encodeURIComponent(text)
    window.open(url, '_blank', 'noopener')
    toast(item.kind === 'reply' ? 'Copied. Paste it into the thread that just opened.' : 'Opened with your post ready. Press Post there.')
    onDone()
  }
  const skip = async () => { await act.mutateAsync({ name: `draft/${id}`, body: { status: 'dropped' } }); onDone() }

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); post() } }
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  })

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-4 overflow-y-auto px-8 pb-8">
      {item.kind === 'reply' && (
        <>
          <div className="rounded-2xl bg-card p-5">
            <div className="flex items-center gap-3">
              <Initial name={item.draft.name ?? '?'} />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm font-semibold">{item.draft.name ?? 'Someone'}</div>
                <div className="text-xs text-muted-foreground">on {platformName[item.draft.platform] ?? item.draft.platform} - {ago(item.draft.at)}</div>
              </div>
              <a href={item.draft.url} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                Open thread <ExternalLink className="size-3" />
              </a>
            </div>
            {item.draft.title && <div className="mt-4 text-sm font-medium">{item.draft.title}</div>}
            <p className="mt-3 max-h-56 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{item.draft.said}</p>
          </div>
          <div className="flex items-center gap-3 px-1 text-sm text-muted-foreground">
            <ScoreRing score={item.draft.score} /> {item.draft.why}
          </div>
        </>
      )}
      <Preview platform={item.draft.platform} text={text} onChange={setText} />
      <div className="flex items-center gap-2">
        <span className="flex-1 text-xs text-quiet">Edit the text right in the preview. Ctrl + Enter sends it.</span>
        <Button variant="ghost" onClick={skip} disabled={act.isPending}>Skip</Button>
        <Button onClick={post} disabled={act.isPending || !text.trim()}>
          {item.kind === 'reply' ? 'Copy and open thread' : `Post on ${platformName[item.draft.platform] ?? item.draft.platform}`} <ExternalLink />
        </Button>
      </div>
    </div>
  )
}

export function Inbox() {
  const { data: t } = useToday()
  const [params, setParams] = useSearchParams()
  // Newest first, replies and posts together.
  const items = useMemo<Item[]>(() => t ? [
    ...t.replies.map(draft => ({ kind: 'reply' as const, draft })),
    ...t.posts.map(draft => ({ kind: 'post' as const, draft })),
  ].sort((a, b) => b.draft.id - a.draft.id) : [], [t])
  const wanted = Number(params.get('id'))
  const current = items.find(i => i.draft.id === wanted) ?? items[0]

  if (!t) return null
  if (!current) {
    return <Page title="Inbox"><Empty icon={<CheckCheck />} title="All clear">Nothing is waiting for you. New drafts show up here after it listens, and you get a Telegram message in the morning.</Empty></Page>
  }
  return (
    <div className="flex h-full">
      <div className="flex w-80 shrink-0 flex-col border-r">
        <div className="px-6 pb-4 pt-8">
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">{items.length} waiting for you</p>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {items.map(item => (
            <button key={item.draft.id} onClick={() => setParams({ id: String(item.draft.id) })} className={cn(
              'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-secondary/60',
              item.draft.id === current.draft.id && 'bg-secondary')}>
              <PlatformMark platform={item.draft.platform} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{title(item)}</div>
                <div className="line-clamp-2 text-xs text-muted-foreground">{item.draft.text}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="min-w-0 flex-1 pt-8">
        <Detail key={current.draft.id} item={current} compose={t.compose} onDone={() => setParams({})} />
      </div>
    </div>
  )
}
