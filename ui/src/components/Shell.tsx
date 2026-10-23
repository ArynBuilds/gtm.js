import { MessageCircle, Search } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useSetup, useStatus, useToday } from '@/lib/api'
import { ago } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CommandMenu } from './CommandMenu'
import { Dock } from './Dock'
import { places } from './places'

function Pulse() {
  const { data: s, isError } = useStatus()
  const working = Boolean(s?.busy.length)
  return (
    <div className="flex items-center gap-2.5 px-3 text-xs text-muted-foreground">
      <span className={cn('size-2 rounded-full', isError ? 'bg-destructive' : working ? 'animate-pulse bg-primary' : 'bg-good')} />
      <span className="truncate">
        {isError ? 'The service is not running' : working ? 'Working now' : s?.heard ? `Listened ${ago(s.heard)}` : 'Starting up'}
      </span>
    </div>
  )
}

export function Shell() {
  const [menu, setMenu] = useState(false)
  const [dock, setDock] = useState(() => localStorage.getItem('dock') !== 'closed')
  const { data: today } = useToday()
  const product = useSetup().data?.product.name
  const waiting = (today?.posts.length ?? 0) + (today?.replies.length ?? 0)

  // The moment a run ends, every part of the screen reads fresh, so nothing
  // waits for its own timer.
  const client = useQueryClient()
  const { data: status } = useStatus()
  const working = Boolean(status?.busy.length)
  const was = useRef(false)
  useEffect(() => {
    if (was.current && !working) client.invalidateQueries()
    was.current = working
  }, [working, client])

  useEffect(() => { localStorage.setItem('dock', dock ? 'open' : 'closed') }, [dock])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setMenu(v => !v) }
    }
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  }, [])

  return (
    <div className="flex h-full">
      <nav className="flex w-56 shrink-0 flex-col gap-1 border-r bg-card/60 p-3">
        <div className="flex items-center gap-2.5 px-3 pb-5 pt-2">
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">g</span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[15px] font-semibold tracking-tight">gtm.js</span>
            {product && <span className="block truncate text-xs text-muted-foreground">for {product}</span>}
          </span>
        </div>
        {places.map(({ to, name, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cn(
            'flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground',
            isActive && 'bg-secondary text-foreground')}>
            <Icon className="size-4" />
            {name}
            {to === '/inbox' && waiting > 0 && (
              <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold tabular-nums text-primary-foreground">{waiting}</span>
            )}
          </NavLink>
        ))}
        <div className="flex-1" />
        <button onClick={() => setMenu(true)} className="flex h-9 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground">
          <Search className="size-4" /> Search
          <kbd className="ml-auto whitespace-nowrap rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
        </button>
        <button onClick={() => setDock(v => !v)} className="flex h-9 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground">
          <MessageCircle className="size-4" /> {dock ? 'Hide chat' : 'Show chat'}
        </button>
        <div className="mt-3 border-t pt-4 pb-1"><Pulse /></div>
      </nav>
      <main className="min-w-0 flex-1 overflow-y-auto"><Outlet /></main>
      {dock && <Dock />}
      <CommandMenu open={menu} onOpenChange={setMenu} />
    </div>
  )
}
