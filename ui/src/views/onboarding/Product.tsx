import { type Stage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { field, Label, Nav, Title } from './kit'
import type { ProductForm } from './state'

export const stages: { id: Stage; name: string; hint: string }[] = [
  { id: 'building', name: 'Not out yet', hint: 'Nobody can use it today' },
  { id: 'beta', name: 'Early access', hint: 'Some people can try it' },
  { id: 'live', name: 'Live', hint: 'Anyone can use it' },
]

export function ProductStep({ value: p, onChange, back, next }: { value: ProductForm; onChange: (p: ProductForm) => void; back: () => void; next: () => void }) {
  const set = (patch: Partial<ProductForm>) => onChange({ ...p, ...patch })
  const ok = p.name.trim() && p.line.trim()
  return (
    <form onSubmit={e => { e.preventDefault(); if (ok) next() }}>
      <Title title="What are you taking to market?" sub="It reads what your product already says about itself first, then asks you only what it could not find." />
      <div className="mt-10 space-y-7">
        <Label name="Name"><input autoFocus value={p.name} onChange={e => set({ name: e.target.value })} placeholder="Acme" className={field} /></Label>
        <Label name="What it does, in one sentence">
          <input value={p.line} onChange={e => set({ line: e.target.value })} placeholder="Invoicing for freelancers that chases late payments for you" className={field} />
        </Label>
        <div>
          <span className="text-sm font-medium">Where it is</span>
          <div className="mt-2.5 grid grid-cols-3 gap-2.5">
            {stages.map(st => (
              <button key={st.id} type="button" onClick={() => set({ stage: st.id })} aria-pressed={p.stage === st.id}
                className={cn('rounded-xl border bg-card px-4 py-3.5 text-left transition-[border-color,background-color] duration-200',
                  p.stage === st.id ? 'border-primary/60 bg-primary/[0.06]' : 'hover:border-white/15')}>
                <span className="block text-sm font-medium">{st.name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{st.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <Label name="Website" optional hint="Its pages are read to understand the product.">
          <input value={p.url} onChange={e => set({ url: e.target.value })} placeholder="acme.com" spellCheck={false} className={field} />
        </Label>
        <Label name="Code repository on this computer" optional hint="Its README helps too, and new commits become build-in-public post drafts.">
          <input value={p.repo} onChange={e => set({ repo: e.target.value })} placeholder="C:\code\acme or ~/code/acme" spellCheck={false} className={cn(field, 'font-mono text-sm')} />
        </Label>
      </div>
      <Nav back={back} form disabled={!ok} />
    </form>
  )
}
