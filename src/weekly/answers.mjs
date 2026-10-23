import { ask, askJson } from '../ask.mjs'
import { asks, isMain, note, product, report } from '../store.mjs'

// Asks an AI the questions our future users ask, with no hint of who we are,
// and records which tools it names. How often the product is named is the
// score that matters; the other names are who we are up against in AI answers.
export async function answers() {
  const questions = asks()
  if (!questions.length) return
  const replies = []
  for (let i = 0; i < questions.length; i += 4) {
    replies.push(...await Promise.all(questions.slice(i, i + 4).map(q =>
      ask(`${q}\n\nAnswer in under 120 words and name specific tools.`))))
  }
  const named = await askJson(`
Below are ${replies.length} answers, numbered from 0. For each, list every
software product, framework or service it names, spelled the usual way.
Answer with only a JSON array of arrays of names, one inner array per answer.

${replies.map((r, i) => `ANSWER ${i}\n${r}`).join('\n\n')}`)
  const rows = questions.map((question, i) => ({ question, named: named[i] || [] }))
  const tally = {}
  for (const row of rows) for (const name of new Set(row.named)) tally[name] = (tally[name] || 0) + 1
  // "Acme.js" also counts when written "Acme js" or "Acmejs".
  const us = new RegExp(product().replace(/[*+?^${}()|[\]\\]/g, '\\$&').replace(/[.\s]+/g, '[.\\s]?'), 'i')
  const ours = rows.filter(r => r.named.some(n => us.test(n))).length
  report('answers', { asked: rows.length, ours, tally, rows })
  note('answers', `asked ${rows.length} questions, ${product()} named in ${ours}`)
}

if (isMain(import.meta.url)) await answers()
