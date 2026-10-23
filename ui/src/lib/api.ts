import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type Platform = 'x' | 'bluesky' | 'linkedin' | 'hackernews' | 'lobsters' | string

export interface PostDraft { id: number; platform: Platform; text: string; created: string }
export interface ReplyDraft extends PostDraft {
  kind: 'said' | 'answer'; url: string; title: string | null; said: string; score: number; why: string; at: string
  name: string | null; person_id: number | null
}
export interface Handle { platform: Platform; handle: string; person_id: number; name: string }
export interface Proposals { at: string; brain: string[]; learned: string[]; drop: string[]; add: string[] }
export interface Today {
  posts: PostDraft[]; replies: ReplyDraft[]; compose: Record<string, string>
  joins: { a: Handle; b: Handle }[]; proposals: Proposals | null
}
export interface Week { heard: number; good: number; people: number; drafted: number; sent: number }
export interface LogLine { job: string; text: string; ok: number; at: string }
export interface Status {
  heard: string | null; waiting: number; thisWeek: Week; lastWeek: Week
  days: { day: string; heard: number; good: number }[]
  log: LogLine[]; busy: string[]; next: number
  telegram: { state: 'off' | 'waiting' | 'linked'; bot: string | null; owner: string | null }
}
export interface Person {
  id: number; name: string; events: number; best: number; last: string; handles: string
  next: 'reply' | 'watch' | 'invite' | 'leave' | null; next_why: string | null
}
export interface Happening {
  platform: Platform; kind: string; url: string; title: string | null; text: string | null
  at: string; score: number | null; why: string | null
}
export interface Signal extends Happening {
  id: number; score: number; question: string | null; phrase: string | null; name: string | null
}
export interface Reports {
  answers: { asked: number; ours: number; tally: Record<string, number>; rows: { question: string; named: string[] }[]; at: string } | null
  rivals: { shipped: string[]; said: string[]; forUs: string[]; stars: { repo: string; stars: number }[]; at: string } | null
  questions: { question: string; url: string; platform: Platform; at: string }[]
  sent: { platform: Platform; url: string; text: string; at: string; likes: number; answers: number }[]
  pages: { id: number; slug: string; title: string; body: string; status: 'draft' | 'approved' }[]
}
export type Verdict = 'planned' | 'partly' | 'not_found' | 'unclear' | 'out_of_scope'
export interface Theme {
  id: number; name: string; summary: string; inside: number; outside: number; last: string
  verdict: Verdict | null; why: string | null; proof: string | null; doc: string | null
  confirmed: number | null; capability: string | null; section: string | null
  said: { problem: string; tools: string[]; tried: string | null; url: string; platform: Platform; stream: 'inside' | 'outside'; at: string }[]
}
export interface Board { themes: Theme[]; blamed: [string, number][]; loose: number; capabilities: number }
export interface Message { who: 'you' | 'gtm'; via: string; text: string; at: string }
export interface Brain { text: string; topics: string[]; rooms: string[] }

export type Stage = 'building' | 'beta' | 'live'
export interface Product { name?: string; line?: string; url?: string | null; stage?: Stage; founder?: string | null }
export interface Step { text: string; done: boolean }
export interface SetupState { ready: boolean; workspace: string; progress: { task: string | null; steps: Step[] }; product: Product }
export interface Connection {
  id: string; group: 'required' | 'listen' | 'you' | 'extra'; name: string; does: string
  state: 'on' | 'off' | 'waiting'; detail: string; fix?: { text: string; command?: string } | null
}
export interface Machine {
  node: string; git: boolean; ffmpeg: boolean
  claude: { installed: boolean; version?: string; signedIn?: boolean | null; email?: string | null; plan?: string | null }
  gh: { installed: boolean; signedIn: boolean; user: string | null }
}
export interface Connections { list: Connection[]; notYet: { name: string; why: string }[]; machine: Machine }
export interface Question { id: string; question: string; hint: string; suggestions: string[] }
export interface Interview { sources: { name: string; ok: boolean; detail: string }[]; summary: string; questions: Question[] }
export interface Plan {
  topics: string[]; phrases: string[]; redditRooms: string[]; githubRepos: string[]; rivals: string[]
  switchNames: string[]; switchStatus: Record<string, string>; asks: string[]
}
export interface Draft { brain: string; plan: Plan; checked: { repos: number; kept: number; pages: number; working: number } }

async function read<T>(name: string): Promise<T> {
  const res = await fetch(`/api/${name}`)
  if (!res.ok) throw new Error(`${name}: ${res.status}`)
  return res.json()
}

export async function send<T = { ok: true }>(name: string, body: unknown = {}): Promise<T> {
  const res = await fetch(`/api/${name}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
  // The service says what went wrong in words; those are what the screen shows.
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `${name}: ${res.status}`)
  return res.json()
}

const every = <T,>(name: string, ms: number) => ({ queryKey: [name], queryFn: () => read<T>(name), refetchInterval: ms })

export const useToday = () => useQuery(every<Today>('today', 8000))
export const useStatus = (fast = false) => useQuery(every<Status>('status', fast ? 2000 : 4000))
export const usePeople = () => useQuery(every<Person[]>('people', 30000))
export const useSignals = () => useQuery(every<Signal[]>('heard', 30000))
export const useReports = () => useQuery(every<Reports>('reports', 30000))
export const useBoard = () => useQuery(every<Board>('problems', 30000))
export const useChat = () => useQuery(every<Message[]>('chat', 6000))
// While the setup works, its progress is read fast; otherwise only on demand.
export const useSetup = (watching = false) => useQuery<SetupState>({
  queryKey: ['setup'], queryFn: () => read('setup'), refetchInterval: watching ? 700 : false,
})
export const useProduct = () => useSetup().data?.product.name || 'your product'
export const useConnections = (fast = false) => useQuery(every<Connections>('connections', fast ? 3000 : 15000))
export const useBrain = () => useQuery<Brain>({ queryKey: ['brain'], queryFn: () => read('brain') })
export const useTrace = (id: number | null) => useQuery<Happening[]>({
  queryKey: ['trace', id], queryFn: () => read(`trace/${id}`), enabled: id !== null,
})

// One way to change anything: send it, then let every view read fresh.
export function useAct() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ name, body }: { name: string; body?: unknown }) => send(name, body),
    onSettled: () => client.invalidateQueries(),
  })
}
