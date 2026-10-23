import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Page } from '@/components/marks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAct, useBrain } from '@/lib/api'

// One editable list of short words: the topics, or the Reddit rooms.
function Words({ title, hint, placeholder, items, name, mark = '' }: {
  title: string; hint: string; placeholder: string; items: string[]; name: string; mark?: string
}) {
  const act = useAct()
  const [word, setWord] = useState('')
  const add = () => {
    if (!word.trim()) return
    act.mutate({ name, body: { add: [word] } })
    setWord('')
  }
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      <form onSubmit={e => { e.preventDefault(); add() }} className="mt-3 flex gap-2">
        <Input value={word} onChange={e => setWord(e.target.value)} placeholder={placeholder} />
        <Button type="submit" size="icon" variant="secondary" disabled={!word.trim()}><Plus /></Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {items.map(p => (
          <span key={p} className="flex items-center gap-1 rounded-full bg-secondary py-0.5 pl-2.5 pr-1 text-[13px]">
            {mark}{p}
            <button title="Remove" onClick={() => act.mutate({ name, body: { remove: [p] } })}
              className="grid size-5 place-items-center rounded-full text-quiet hover:bg-background hover:text-foreground"><X className="size-3" /></button>
          </span>
        ))}
      </div>
    </section>
  )
}

export function Brain() {
  const { data: b } = useBrain()
  const act = useAct()
  const [text, setText] = useState('')
  useEffect(() => { if (b) setText(b.text) }, [b?.text])
  if (!b) return null
  const changed = text !== b.text
  return (
    <Page title="Brain" sub="Everything it writes follows this. A wrong line here makes wrong drafts everywhere." action={
      <Button disabled={!changed || act.isPending} onClick={() => act.mutate({ name: 'brain', body: { text } }, { onSuccess: () => toast('Saved. The next draft uses it.') })}>
        {changed ? 'Save changes' : 'Saved'}
      </Button>}>
      <div className="grid h-full grid-cols-[1fr_340px] gap-6 pb-8">
        <textarea value={text} onChange={e => setText(e.target.value)} spellCheck={false}
          className="h-full min-h-0 resize-none rounded-2xl border bg-card p-6 font-mono text-[13px] leading-relaxed outline-none focus:ring-2 focus:ring-ring" />
        <div className="overflow-y-auto pr-1">
          <Words title="Topics it listens for" name="topics" items={b.topics} placeholder="Add a topic, 1 or 2 words"
            hint="A post is read when it has one of these words and sounds like someone asking or struggling." />
          <Words title="Reddit communities it reads" name="rooms" items={b.rooms} placeholder="Add a community, like webdev" mark="r/"
            hint="The newest posts of these are checked every hour." />
        </div>
      </div>
    </Page>
  )
}
