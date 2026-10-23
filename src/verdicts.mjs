import { askJson } from './ask.mjs'
import { capabilities, docHash, docText } from './capabilities.mjs'
import { brain, db, isMain, note, now, product } from './store.mjs'
import './problems.mjs'

// One verdict per theme. "planned" and "partly" must name a capability and
// carry a sentence copied from the document; without both they cannot be kept.
db.exec(`create table if not exists verdicts (
  theme_id integer primary key references themes(id),
  verdict text not null, capability_id integer, doc text, proof text, why text not null,
  doc_hash text, confirmed integer not null default 0, at text not null)`)

const first = () => `
CAPABILITIES is the complete list of what the documents of ${product()} say
it gives (THE BRAIN says whether it is out yet). Judge the THEME against that
list and nothing else. What you know about products like it in general is
not evidence.
- "planned": one capability directly removes this trouble. Give its id.
- "partly": a capability helps but leaves a real part of the trouble. Give its id.
- "not_found": nothing in the list addresses it.
- "out_of_scope": the trouble is not something ${product()} is for, by what
  THE BRAIN says it is (often: hiring, pricing of other companies, law), or
  it is a fault inside another company's product that only they can fix.
"why": one plain sentence. Never guess: when unsure, answer "not_found".
Answer with only a JSON object: {"verdict": "", "capability": 0, "why": ""}
`

const second = `
A claim says the DOCUMENT below addresses the TROUBLE through the CAPABILITY.
Try to disprove it. Does the document really deal with this trouble, or does
it only use similar words?
- "holds": "yes", "partly" or "no".
- "proof": when yes or partly, ONE sentence copied from the document letter
  for letter that shows it. Otherwise an empty string.
Answer with only a JSON object: {"holds": "", "proof": ""}
`

const squash = text => text.replace(/[\s*_`]+/g, ' ').trim().toLowerCase()

async function judge(theme, list) {
  const quotes = db.prepare('select problem from problems where theme_id = ? order by at desc limit 6').all(theme.id).map(p => p.problem)
  const a = await askJson(`THE BRAIN\n${brain()}\n\nTHE TASK\n${first()}\nTHEME ${JSON.stringify({ name: theme.name, summary: theme.summary, examples: quotes })}\n\nCAPABILITIES\n${JSON.stringify(list.map(c => ({ id: c.id, text: c.text })))}`)
  const cap = list.find(c => c.id === Number(a.capability))
  if (!['planned', 'partly'].includes(a.verdict)) {
    return { verdict: a.verdict === 'out_of_scope' ? 'out_of_scope' : 'not_found', why: String(a.why || '') }
  }
  if (!cap) return { verdict: 'not_found', why: 'It named no capability from the list.' }
  // The second look reads the document itself, and its proof must really be in it.
  const b = await askJson(`THE TASK\n${second}\nTROUBLE ${theme.name}: ${theme.summary}\nCAPABILITY ${cap.text}\n\nDOCUMENT ${cap.doc}\n${docText(cap.doc)}`)
  const proven = b.proof && squash(docText(cap.doc)).includes(squash(String(b.proof)))
  const verdict = !proven || b.holds === 'no' ? 'unclear' : b.holds === 'partly' ? 'partly' : a.verdict
  return { verdict, cap, proof: proven ? String(b.proof) : null,
    why: verdict === 'unclear' ? `It pointed at "${cap.text}", but the second look could not prove it from the document.` : String(a.why || '') }
}

// Judges every theme that has no verdict, and looks again at any whose
// document changed. A verdict the founder confirmed is only reopened then.
export async function verdicts() {
  await capabilities()
  const list = db.prepare('select id, doc, section, text from capabilities').all()
  if (!list.length) return
  const save = db.prepare(`insert into verdicts (theme_id, verdict, capability_id, doc, proof, why, doc_hash, confirmed, at)
    values (?, ?, ?, ?, ?, ?, ?, 0, ?) on conflict (theme_id) do update set verdict = excluded.verdict,
    capability_id = excluded.capability_id, doc = excluded.doc, proof = excluded.proof, why = excluded.why,
    doc_hash = excluded.doc_hash, confirmed = 0, at = excluded.at`)
  const themes = db.prepare(`select t.id, t.name, t.summary, v.doc, v.doc_hash, v.verdict from themes t
    left join verdicts v on v.theme_id = t.id
    where (select count(*) from problems p where p.theme_id = t.id) >= 2`).all()
  let judged = 0
  for (const theme of themes) {
    const stale = theme.doc && theme.doc_hash !== docHash(theme.doc)
    if (theme.verdict && !stale) continue
    const v = await judge(theme, list)
    save.run(theme.id, v.verdict, v.cap?.id ?? null, v.cap?.doc ?? null, v.proof ?? null, v.why, v.cap ? docHash(v.cap.doc) : null, now())
    judged++
  }
  if (judged) note('verdicts', `judged ${judged} problem themes against your documents`)
  return judged
}

if (isMain(import.meta.url)) await verdicts()
