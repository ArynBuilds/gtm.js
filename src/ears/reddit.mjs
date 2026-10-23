import { entities, plain } from './plain.mjs'

// Reddit through its public feeds. Without a key it gives 100 posts a
// request and about one request a minute. So it reads the rooms in groups,
// and for each group keeps turning pages back in time until it reaches what
// it already heard last time. After a long gap that is several pages; in an
// ordinary hour it is one.
export const platform = 'reddit'
export const rest = 60
// It reads whole rooms, not only search answers, so it can feed the wider stream.
export const rooms = true

const pick = (entry, tag) => entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? ''
const wait = seconds => new Promise(r => setTimeout(r, seconds * 1000))

// Every request to Reddit from anywhere in the program goes through this one
// line, one at a time, each waiting as long as Reddit asked after the last.
let line = Promise.resolve()
export function get(path) {
  const turn = line.then(async () => {
    for (;;) {
      const res = await fetch(`https://www.reddit.com/${path}`, { headers: { 'user-agent': 'gtmjs/0.1 (personal research tool)' } })
      if (res.status === 429) { await wait(Number(res.headers.get('retry-after')) || 60); continue }
      if (!res.ok) throw new Error(`reddit ${res.status}`)
      const text = await res.text()
      await wait(Number(res.headers.get('x-ratelimit-reset')) + 1 || 60)
      return text
    }
  })
  line = turn.catch(() => {})
  return turn
}

// One feed entry as plain fields. `kind` is t3 for a post, t1 for a comment.
export function entries(feed) {
  return feed.split('<entry>').slice(1).map(entry => {
    const id = pick(entry, 'id')
    return {
      id, kind: id.slice(0, 2), handle: pick(entry, 'name').replace('/u/', ''),
      room: entry.match(/<category term="([^"]+)"/)?.[1],
      url: entry.match(/<link href="([^"]+)"/)?.[1],
      title: entities(pick(entry, 'title')),
      text: plain(entities(pick(entry, 'content'))).replace(/\s*submitted by[\s\S]*$/, ''),
      at: new Date(pick(entry, 'published') || pick(entry, 'updated')),
    }
  })
}

// Reads one page into `found`. Returns the id to continue after, or nothing
// when the page was the last one or already reaches back past `since`.
async function page(path, since, found) {
  let last, reached = false, seen = 0
  for (const e of entries(await get(path))) {
    if (e.kind !== 't3') continue
    seen++
    last = e.id
    if (e.at <= since) { reached = true; continue }
    found.set(e.id, {
      key: `reddit:${e.id}`, platform, kind: 'said', handle: e.handle, name: e.handle, url: e.url,
      title: `${e.title}${e.room ? ` [r/${e.room}]` : ''}`, text: e.text, at: e.at.toISOString(),
    })
  }
  return reached || seen < 100 ? undefined : last
}

export async function listen(phrases, since, { redditRooms = [], redditPages = 6 } = {}) {
  const found = new Map()
  for (let i = 0; i < redditRooms.length; i += 12) {
    const feed = `r/${redditRooms.slice(i, i + 12).join('+')}/new/.rss?limit=100`
    let after
    for (let n = 0; n < redditPages; n++) {
      after = await page(after ? `${feed}&after=${after}` : feed, since, found)
      if (!after) break
    }
  }
  // Outside the rooms where builders talk, the same words bring adverts.
  const inRooms = redditRooms.length ? ` AND (${redditRooms.map(r => `subreddit:${r}`).join(' OR ')})` : ''
  for (let i = 0; i < phrases.length; i += 9) {
    const q = `(${phrases.slice(i, i + 9).map(p => `(${p.split(/\s+/).join(' AND ')})`).join(' OR ')})${inRooms}`
    await page('search.rss?' + new URLSearchParams({ q, sort: 'new', limit: '100', t: 'week' }), since, found)
  }
  return [...found.values()]
}
