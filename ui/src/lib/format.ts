export const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
export const clock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

export function ago(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`
  return day(iso)
}

export function greeting() {
  const hour = new Date().getHours()
  return hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

export const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export const platformName: Record<string, string> = {
  x: 'X', bluesky: 'Bluesky', linkedin: 'LinkedIn', hackernews: 'Hacker News', reddit: 'Reddit', github: 'GitHub',
}

// How long a post may be on each platform.
export const limit: Record<string, number> = { x: 280, bluesky: 300, linkedin: 3000 }
