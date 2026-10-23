import { useQueryClient } from '@tanstack/react-query'
import { Check, Send } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { send, useStatus } from '@/lib/api'

// Three states: no bot yet, a bot nobody has written to, and linked. In the
// chat it opens from a line; on the Connections page (`inline`) the steps show at once.
export function Telegram({ inline = false }: { inline?: boolean }) {
  const [open, setOpen] = useState(inline)
  const [token, setToken] = useState('')
  const [problem, setProblem] = useState('')
  const client = useQueryClient()
  const { data: s } = useStatus(open)
  const tg = s?.telegram
  if (!tg) return null
  if (tg.state === 'linked') {
    return <div className="flex items-center gap-2 text-xs text-muted-foreground"><Check className="size-3.5 text-good" /> {inline ? `Linked as @${tg.bot}` : `Also on Telegram as @${tg.bot}`}</div>
  }
  const save = async () => {
    setProblem('')
    try { await send('telegram', { token }); setToken(''); await client.invalidateQueries() } catch { setProblem('Telegram does not know that token. Copy it again from BotFather.') }
  }
  return (
    <div>
      {!inline && (
        <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <Send className="size-3.5 text-warn" /> {open ? 'Hide the Telegram steps' : 'Link Telegram to talk from your phone'}
        </button>
      )}
      {open && (
        <div className={inline ? 'text-xs text-muted-foreground' : 'mt-3 rounded-xl bg-secondary/50 p-4 text-xs text-muted-foreground'}>
          {tg.state === 'waiting' ? (
            <>
              <div className="text-sm font-medium text-foreground">Almost there</div>
              <p className="mt-2">Open Telegram, find <a className="text-foreground underline" href={`https://t.me/${tg.bot}`} target="_blank" rel="noopener">@{tg.bot}</a> and press Start. The first person to write to it becomes its only owner.</p>
            </>
          ) : (
            <>
              <ol className="list-decimal space-y-1 pl-4">
                <li>In Telegram, open a chat with <a className="text-foreground underline" href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a>.</li>
                <li>Send <span className="font-mono text-foreground">/newbot</span> and pick a name.</li>
                <li>Copy the token it gives you and paste it here.</li>
              </ol>
              <form onSubmit={e => { e.preventDefault(); save() }} className="mt-3 flex gap-2">
                <input value={token} onChange={e => setToken(e.target.value)} placeholder="Paste the token" type="password"
                  className="h-8 min-w-0 flex-1 rounded-lg bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
                <Button type="submit" size="sm" disabled={!token.trim()}>Link</Button>
              </form>
            </>
          )}
          {problem && <p className="mt-2 text-destructive">{problem}</p>}
        </div>
      )}
    </div>
  )
}
