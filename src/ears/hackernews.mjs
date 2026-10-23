import { plain } from './plain.mjs'

// Hacker News through its public search. No key needed.
export const platform = 'hackernews'

export async function listen(phrases, since) {
  const after = Math.floor(since.getTime() / 1000)
  const found = []
  for (const phrase of phrases) {
    const url = 'https://hn.algolia.com/api/v1/search_by_date?' + new URLSearchParams({
      // Only questions people post. Comment threads there are debate, and in
      // every trial none of them was a person we could help.
      query: phrase, tags: 'ask_hn', hitsPerPage: '20',
      numericFilters: `created_at_i>${after}`,
    })
    const res = await fetch(url)
    if (!res.ok) throw new Error(`hackernews ${res.status} for "${phrase}"`)
    for (const hit of (await res.json()).hits) {
      found.push({
        key: `hackernews:${hit.objectID}`,
        platform, kind: 'said', handle: hit.author, name: hit.author,
        url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        title: hit.title || hit.story_title || '',
        text: plain(hit.comment_text || hit.story_text || ''),
        at: hit.created_at,
      })
    }
  }
  return found
}
