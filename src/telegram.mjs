import { db, draft, keys, mark, note, saveKeys, updateDraft, watch } from './store.mjs'
import { runJob } from './jobs.mjs'
import { talk } from './talk.mjs'
import { boardWords, compose, openDrafts } from './view.mjs'
import { hear } from './voice.mjs'

// What the screen shows: off (no token), waiting (nobody has claimed the
// bot yet) or linked.
export const tg = { state: 'off', bot: null, owner: null }

const cards = new Map()
const html = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// Plain words in, a message a phone shows well out: *this* becomes bold.
const fmt = text => html(text).replace(/\*([^*\n]+)\*/g, '<b>$1</b>')

// The buttons under an answer, so the next step is one tap and not a sentence.
const menus = {
  start: [[{ text: 'Show me the drafts', callback_data: 'do:review' }], [{ text: 'Run everything now', callback_data: 'do:pipeline' }, { text: 'Problems', callback_data: 'do:problems' }]],
  after: [[{ text: 'Show me the drafts', callback_data: 'do:review' }, { text: 'Problems', callback_data: 'do:problems' }]],
}

async function call(method, body = {}) {
  const res = await fetch(`https://api.telegram.org/bot${keys().telegramToken}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
  const answer = await res.json()
  if (!answer.ok) throw new Error(`${method}: ${answer.description}`)
  return answer.result
}

const say = (text, extra = {}) => call('sendMessage', { chat_id: keys().telegramOwner, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...extra })
const sayWith = (text, menu) => say(fmt(text), menu ? { reply_markup: { inline_keyboard: menus[menu] } } : {})

// One draft as one message with its buttons. The text sits in a block that
// copies with one tap; a reply to the message is taken as a change to it.
async function card(d, kind) {
  const open = kind === 'post' ? (compose[d.platform] || '') + encodeURIComponent(d.text) : d.url
  const head = kind === 'post' ? `<b>Post for ${html(d.platform)}</b>`
    : `<b>Reply to ${html(d.name || 'someone')}</b> on ${html(d.platform)}, ${d.score}/10\n<i>${html(d.why)}</i>\n\n`
      // Their post as a quote block that opens when tapped, so a long one does not bury the draft.
      + `<blockquote expandable>${d.title ? `<b>${html(d.title)}</b>\n` : ''}${html(d.said.slice(0, 2500))}</blockquote>\n<b>Your reply:</b>`
  const sent = await say(`${head}\n\n<pre>${html(d.text)}</pre>`, { reply_markup: { inline_keyboard: [
    [{ text: kind === 'post' ? 'Open it ready to post' : 'Open the thread', url: open }],
    [{ text: 'I sent it', callback_data: `posted:${d.id}` }, { text: 'Skip', callback_data: `dropped:${d.id}` }],
  ] } })
  cards.set(sent.message_id, d.id)
}

async function review() {
  const { posts, replies } = openDrafts()
  if (!posts.length && !replies.length) return say('Nothing is waiting. All clear.')
  await sayWith(`*${replies.length} replies and ${posts.length} posts*, newest first. Reply to any of them with what to change.`)
  for (const d of replies) await card(d, 'reply')
  for (const d of posts) await card(d, 'post')
}

// The whole pipeline while they wait. Every step says what it found as it
// happens, and the end says plainly what changed.
async function pipeline() {
  const before = new Set([...openDrafts().replies, ...openDrafts().posts].map(d => d.id))
  await sayWith('*Running everything now.* Hacker News, Bluesky and GitHub take seconds. Reddit takes a few minutes because it only allows one request a minute.')
  const lines = []
  const stop = watch((job, text, ok) => {
    if (!['listen', 'think', 'plan', 'content', 'problems', 'themes', 'cycle'].includes(job)) return
    lines.push(text)
    say(fmt(`${ok ? '' : 'Problem: '}${text}`)).catch(() => {})
  })
  try {
    await runJob('cycle')
    await runJob('daily')
  } finally { stop() }
  const { posts, replies } = openDrafts()
  const fresh = [...replies.filter(d => !before.has(d.id)).map(d => [d, 'reply']), ...posts.filter(d => !before.has(d.id)).map(d => [d, 'post'])]
  if (!fresh.length) {
    return sayWith(`*Done. Nothing new worth sending.*\n${lines.length ? 'It did look, and what it found was not good enough for a reply.' : 'There was nothing new since the last run.'}\n${before.size} older drafts are still waiting.`, 'after')
  }
  await sayWith(`*Done. ${fresh.length} new drafts.* Here they are.`)
  for (const [d, kind] of fresh) await card(d, kind)
  if (before.size) await sayWith(`${before.size} older drafts are still waiting too.`, 'after')
}

const doing = { review, pipeline, problems: () => sayWith(boardWords()) }

async function pressed(q) {
  const [what, id] = q.data.split(':')
  await call('answerCallbackQuery', { callback_query_id: q.id })
  if (what === 'do') return doing[id]?.()
  if (what !== 'posted' && what !== 'dropped') return
  if (draft(Number(id))) updateDraft(Number(id), { status: what })
  await call('editMessageReplyMarkup', { chat_id: q.message.chat.id, message_id: q.message.message_id,
    reply_markup: { inline_keyboard: [[{ text: what === 'posted' ? 'Sent' : 'Skipped', callback_data: 'done' }]] } })
}

// The slash menu Telegram shows beside the message box.
const commands = {
  '/today': () => answer('What do you have for me today?'),
  '/drafts': review, '/run': pipeline, '/problems': doing.problems,
}

async function answer(text, about) {
  await call('sendChatAction', { chat_id: keys().telegramOwner, action: 'typing' })
  const { reply, then } = await talk(about ? `About draft ${about}: ${text}` : text, 'telegram')
  await sayWith(reply, about || then ? null : 'after')
  if (about) {
    const { posts, replies } = openDrafts()
    const post = posts.find(d => d.id === about)
    const mine = replies.find(d => d.id === about)
    if (post || mine) await card(post || mine, post ? 'post' : 'reply')
  }
  if (then === 'pipeline') await pipeline()
  if (then === 'review') await review()
}

async function message(m) {
  let text = m.text
  if (!text && (m.voice || m.audio)) {
    const file = await call('getFile', { file_id: (m.voice || m.audio).file_id })
    const sound = await fetch(`https://api.telegram.org/file/bot${keys().telegramToken}/${file.file_path}`)
    text = await hear(Buffer.from(await sound.arrayBuffer()))
    if (!text) return say('I could not make out that voice note.')
    await say(`<i>I heard: ${html(text)}</i>`)
  }
  if (!text || text === '/start') return
  if (commands[text.split('@')[0]]) return commands[text.split('@')[0]]()
  await answer(text, cards.get(m.reply_to_message?.message_id))
}

// Called after every run by the clock: a reply scored 8 or more is sent to
// them at once, because a strong thread goes cold in hours.
export async function announce() {
  if (tg.state !== 'linked') return
  // A switching moment is told the same way, once.
  for (const a of db.prepare('select key, tool, kind, title, url, why from alerts where told = 0').all()) {
    await say(`<b>Switching moment: ${html(a.tool)}</b>\n${html(a.title)}\n\n${html(a.why || '')}\n\n${html(a.url || '')}`)
    db.prepare('update alerts set told = 1 where key = ?').run(a.key)
  }
  const seen = Number(mark('told:draft') || 0)
  const strong = openDrafts().replies.filter(d => d.id > seen && d.score >= 8)
  mark('told:draft', db.prepare('select coalesce(max(id), 0) as id from drafts').get().id)
  if (!strong.length) return
  await sayWith(`*A strong one just came in.* ${strong.length === 1 ? 'This thread scored' : 'These threads scored'} 8 or more.`)
  for (const d of strong) await card(d, 'reply')
}

// The first person to write to a new bot becomes its owner; after that it
// answers nobody else.
function allowed(from) {
  const k = keys()
  if (!k.telegramOwner) {
    saveKeys({ ...k, telegramOwner: from.id, telegramOwnerName: from.first_name })
    note('telegram', `locked to ${from.first_name}`)
    Object.assign(tg, { state: 'linked', owner: from.first_name })
    sayWith('*Linked.* I only answer you from now on. Write or send a voice note any time.', 'start')
      .catch(err => note('telegram', `failed: ${err.message}`, false))
  }
  return keys().telegramOwner === from.id
}

async function loop() {
  let offset = 0
  let down = false
  for (;;) {
    const k = keys()
    if (!k.telegramToken) { Object.assign(tg, { state: 'off', bot: null }); await new Promise(r => setTimeout(r, 3000)); continue }
    try {
      if (!tg.bot) {
        Object.assign(tg, { bot: (await call('getMe')).username, state: k.telegramOwner ? 'linked' : 'waiting', owner: k.telegramOwnerName || null })
        await call('setMyCommands', { commands: [
          { command: 'today', description: 'What is waiting and what happened' },
          { command: 'drafts', description: 'Hand me every draft to approve' },
          { command: 'run', description: 'Listen and write right now' },
          { command: 'problems', description: 'What people are struggling with' },
        ] })
      }
      for (const u of await call('getUpdates', { offset, timeout: 50, allowed_updates: ['message', 'callback_query'] })) {
        offset = u.update_id + 1
        const from = (u.message || u.callback_query)?.from
        if (!from || !allowed(from)) continue
        const work = u.callback_query ? pressed(u.callback_query) : message(u.message)
        work.catch(err => note('telegram', `failed: ${err.message}`, false))
      }
      down = false
    } catch (err) {
      // Written down once per outage, not on every retry.
      if (!down) note('telegram', `line problem: ${err.message}`, false)
      down = true
      tg.bot = null
      await new Promise(r => setTimeout(r, 8000))
    }
  }
}

// Checked against Telegram before it is kept, so a wrong token is refused at once.
export async function setToken(token) {
  const res = await (await fetch(`https://api.telegram.org/bot${String(token).trim()}/getMe`)).json()
  if (!res.ok) throw new Error('Telegram does not know that token.')
  saveKeys({ ...keys(), telegramToken: String(token).trim(), telegramOwner: null, telegramOwnerName: null })
  tg.bot = null
  return { bot: res.result.username }
}

export async function tell(text, menu) {
  if (tg.state !== 'linked') return false
  await sayWith(text, menu)
  return true
}

export const connect = () => { loop() }
