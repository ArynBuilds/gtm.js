import { siBluesky, siGithub, siReddit, siX, siYcombinator } from 'simple-icons'
import { cn } from '@/lib/utils'
import { platformName } from '@/lib/format'

// Each platform's own logo in its own colour. X and GitHub are black by
// brand, which cannot be seen on a dark screen, so they are drawn white.
const logos: Record<string, { path: string; hex: string }> = {
  x: { ...siX, hex: 'ffffff' }, github: { ...siGithub, hex: 'ffffff' },
  bluesky: siBluesky, reddit: siReddit, hackernews: siYcombinator,
}

// The small square that says where something lives.
export function PlatformMark({ platform, className }: { platform: string; className?: string }) {
  const logo = logos[platform]
  // LinkedIn is not in the open icon set; its logo is these letters on its blue.
  if (platform === 'linkedin') {
    return <span title="LinkedIn" className={cn('inline-grid size-6 shrink-0 place-items-center rounded-md bg-[#0a66c2] text-[11px] font-bold text-white', className)}>in</span>
  }
  return (
    <span title={platformName[platform] ?? platform} className={cn(
      'inline-grid size-6 shrink-0 place-items-center rounded-md bg-secondary text-[11px] font-semibold text-foreground',
      className)}>
      {logo
        ? <svg viewBox="0 0 24 24" className="size-[62%]" fill={`#${logo.hex}`} aria-hidden><path d={logo.path} /></svg>
        : platform[0]?.toUpperCase()}
    </span>
  )
}

// A score out of ten as a ring. Gold from 7, plain from 4, quiet below.
export function ScoreRing({ score, size = 32 }: { score: number | null; size?: number }) {
  const value = score ?? 0
  const r = size / 2 - 3
  const around = 2 * Math.PI * r
  const tone = value >= 7 ? 'var(--primary)' : value >= 4 ? 'var(--foreground)' : 'var(--quiet)'
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--secondary)" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={around} strokeDashoffset={around * (1 - value / 10)} />
      </svg>
      <span className="absolute text-[11px] font-medium tabular-nums" style={{ color: tone }}>{score ?? '-'}</span>
    </span>
  )
}

export function Initial({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn('inline-grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-medium', className)}>
      {(name.trim()[0] ?? '?').toUpperCase()}
    </span>
  )
}

export function Empty({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">{icon}</div>
      <div className="text-base font-medium">{title}</div>
      {children && <div className="max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  )
}

export function Page({ title, sub, action, children }: {
  title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-8 pt-8">
      <header className="mb-6 flex items-end gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
        </div>
        {action}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}
