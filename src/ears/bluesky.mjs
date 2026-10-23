// Bluesky through its public search. No key needed.
export const platform = 'bluesky'

export async function listen(phrases, since) {
  const found = []
  for (const phrase of phrases) {
    const url = 'https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?' + new URLSearchParams({
      q: phrase, sort: 'latest', limit: '20', since: since.toISOString(),
    })
    const res = await fetch(url)
    if (!res.ok) throw new Error(`bluesky ${res.status} for "${phrase}"`)
    for (const post of (await res.json()).posts) {
      const id = post.uri.split('/').pop()
      found.push({
        key: `bluesky:${post.uri}`,
        platform, kind: 'said', handle: post.author.handle,
        name: post.author.displayName || post.author.handle,
        url: `https://bsky.app/profile/${post.author.handle}/post/${id}`,
        title: '',
        text: post.record?.text || '',
        at: new Date(post.record?.createdAt || post.indexedAt).toISOString(),
      })
    }
  }
  return found
}
