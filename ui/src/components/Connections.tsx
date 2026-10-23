import { AtSign, Check, Copy, FileText, FolderGit2, Mic, Monitor, PenLine, Send, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PlatformMark } from '@/components/marks'
import { Button } from '@/components/ui/button'
import { type Connection, useAct, useConnections } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Telegram } from './Telegram'

const icons: Record<string, React.ReactNode> = {
  claude: <Sparkles />, telegram: <Send />, compose: <PenLine />, accounts: <AtSign />,
  repo: <FolderGit2 />, docs: <FileText />, voice: <Mic />, winotch: <Monitor />,
}

const groups: { id: Connection['group']; name: string; hint: string }[] = [
  { id: 'required', name: 'Required', hint: 'The one thing gtm.js cannot run without.' },
  { id: 'listen', name: 'Where it listens', hint: 'Public and read only. It never writes there.' },
  { id: 'you', name: 'Where you work with it', hint: 'How drafts reach you, and how what you send is followed.' },
  { id: 'extra', name: 'Extras', hint: 'Each one adds a little. None is needed.' },
]

// A command to run in a terminal, copied with one press.
export function Command({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1400) } catch { /* the text is still there to select */ }
  }
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-lg bg-background py-1 pl-3 pr-1 font-mono text-xs text-foreground">
      <span className="truncate">{text}</span>
      <button onClick={copy} title="Copy" className="grid size-6 shrink-0 place-items-center rounded-md text-quiet transition-colors hover:bg-secondary hover:text-foreground">
        {copied ? <Check className="size-3.5 text-good" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  )
}

function Pill({ c }: { c: Connection }) {
  const [words, tone] = c.state === 'on' ? ['On', 'bg-good/15 text-good']
    : c.state === 'waiting' ? ['Waiting', 'bg-warn/15 text-warn']
    : c.group === 'required' ? ['Needed', 'bg-destructive/15 text-destructive'] : ['Off', 'bg-secondary text-quiet']
  return <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', tone)}>{words}</span>
}

// A folder on this computer, checked by the service before it is kept.
function Folder({ name, placeholder, current }: { name: 'repo' | 'docs'; placeholder: string; current: string }) {
  const act = useAct()
  const [value, setValue] = useState(current)
  return (
    <form onSubmit={e => { e.preventDefault(); act.mutate({ name: 'settings', body: { [name]: value } }, { onSuccess: () => toast('Saved'), onError: err => toast.error(err.message) }) }}
      className="mt-3 flex gap-2">
      <input value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} spellCheck={false}
        className="h-8 min-w-0 flex-1 rounded-lg bg-background px-3 font-mono text-xs outline-none focus:ring-2 focus:ring-ring" />
      <Button type="submit" size="sm" variant="secondary" disabled={value === current || act.isPending}>Save</Button>
    </form>
  )
}

const platforms = [['reddit', 'Reddit'], ['bluesky', 'Bluesky'], ['hackernews', 'Hacker News'], ['github', 'GitHub']] as const

export function Accounts({ me, onChange }: { me: Record<string, string>; onChange: (me: Record<string, string>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {platforms.map(([id, name]) => (
        <label key={id} className="flex h-11 items-center gap-2.5 rounded-xl border bg-background/60 pl-2 pr-3 focus-within:ring-2 focus-within:ring-ring">
          <PlatformMark platform={id} className="size-7" />
          <input value={me[id] ?? ''} onChange={e => onChange({ ...me, [id]: e.target.value })} placeholder={`${name} name`} spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-quiet" />
        </label>
      ))}
    </div>
  )
}

function AccountsForm({ detail }: { detail: string }) {
  const act = useAct()
  const start = Object.fromEntries(detail.split(' · ').map(p => p.split(': ')).filter(p => p.length === 2))
  const [me, setMe] = useState<Record<string, string>>(start)
  return (
    <div className="mt-3 space-y-2">
      <Accounts me={me} onChange={setMe} />
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" disabled={act.isPending}
          onClick={() => act.mutate({ name: 'settings', body: { me: Object.fromEntries(platforms.map(([id]) => [id, me[id] ?? ''])) } }, { onSuccess: () => toast('Saved') })}>Save</Button>
      </div>
    </div>
  )
}

function Card({ c, editable }: { c: Connection; editable: boolean }) {
  const platform = ['reddit', 'hackernews', 'bluesky', 'github'].includes(c.id)
  return (
    <div className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border bg-card p-5">
      {platform ? <PlatformMark platform={c.id} className="size-9 rounded-xl" />
        : <span className={cn('grid size-9 place-items-center rounded-xl bg-secondary text-muted-foreground [&_svg]:size-4', c.id === 'claude' && 'bg-primary/15 text-primary')}>{icons[c.id]}</span>}
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium">{c.name}</div>
            <div className="mt-0.5 truncate text-xs text-quiet">{c.detail}</div>
          </div>
          <Pill c={c} />
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{c.does}</p>
        {c.fix && c.state !== 'on' && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
            <span>{c.fix.text}</span>
            {c.fix.command && <Command text={c.fix.command} />}
          </div>
        )}
        {c.id === 'telegram' && <div className="mt-3"><Telegram inline /></div>}
        {editable && c.id === 'repo' && <Folder name="repo" placeholder="The folder of your code, like C:\code\acme" current={c.state === 'on' ? c.detail : ''} />}
        {editable && c.id === 'docs' && <Folder name="docs" placeholder="A folder of Markdown files about your product" current={c.state === 'on' ? c.detail : ''} />}
        {editable && c.id === 'accounts' && <AccountsForm detail={c.state === 'on' ? c.detail : ''} />}
      </div>
    </div>
  )
}

// Everything gtm.js can be connected to, grouped, with what each one does.
export function ConnectionsList({ editable = true }: { editable?: boolean }) {
  const { data } = useConnections(true)
  if (!data) return <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-card" />)}</div>
  return (
    <div className="space-y-10">
      {groups.map(g => (
        <section key={g.id}>
          <h2 className="text-sm font-semibold">{g.name}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{g.hint}</p>
          <div className="mt-4 space-y-3">
            {data.list.filter(c => c.group === g.id).map(c => <Card key={c.id} c={c} editable={editable} />)}
          </div>
        </section>
      ))}
      <section>
        <h2 className="text-sm font-semibold">Not available</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Said plainly, so you do not look for them.</p>
        <div className="mt-4 divide-y rounded-2xl border">
          {data.notYet.map(n => (
            <div key={n.name} className="flex gap-4 px-5 py-3.5 text-sm">
              <span className="w-48 shrink-0">{n.name}</span>
              <span className="text-muted-foreground">{n.why}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
