import type { Draft, Interview, Stage } from '@/lib/api'

// What the setup holds while a person goes through it.

export type StepId = 'check' | 'product' | 'questions' | 'voice' | 'review' | 'connect' | 'done'
export const rail: { id: StepId; name: string }[] = [
  { id: 'check', name: 'Check' }, { id: 'product', name: 'Product' }, { id: 'questions', name: 'Questions' },
  { id: 'voice', name: 'Voice' }, { id: 'review', name: 'Review' }, { id: 'connect', name: 'Connect' },
]

export interface ProductForm { name: string; line: string; url: string; stage: Stage; repo: string }
export interface Voice { founder: string; person: 'I' | 'we'; rules: { hype: boolean; emoji: boolean; hashtags: boolean; dashes: boolean }; sample: string }
export interface Saved {
  version: 1; step: StepId; product: ProductForm
  interview: Interview | null; interviewFor: string; answers: Record<string, string>; at: number
  voice: Voice; me: Record<string, string>; draft: Draft | null; draftFor: string
}

export const fresh: Saved = {
  version: 1, step: 'check', product: { name: '', line: '', url: '', stage: 'building', repo: '' },
  interview: null, interviewFor: '', answers: {}, at: 0,
  voice: { founder: '', person: 'I', rules: { hype: true, emoji: true, hashtags: true, dashes: false }, sample: '' },
  me: {}, draft: null, draftFor: '',
}

// What was typed survives a reload. It lives only in this browser and is
// cleared when the setup ends.
export const KEY = 'gtm.setup'
export function load(): Saved {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (saved?.version === 1) return { ...fresh, ...saved }
  } catch { /* storage blocked: start fresh */ }
  return fresh
}
export const store = (s: Saved | null) => { try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY) } catch { /* nothing to keep */ } }

export const ease = [0.22, 1, 0.36, 1] as const
export const key = (v: unknown) => JSON.stringify(v)
export const words = (err: unknown) => err instanceof Error ? err.message : String(err)
