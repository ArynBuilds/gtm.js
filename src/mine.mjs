import { spawnSync } from 'node:child_process'
import { entries, get } from './ears/reddit.mjs'
import { plain } from './ears/plain.mjs'

// What the founder posted on each platform, and what came back.
// Each reader returns: { key, platform, url, text, at, likes, answers: [...] }
// where an answer is { key, handle, name, url, text, at }.

const days = n => Date.now() - n * 86400000

async function bluesky(handle) {
  const api = path => fetch(`https://public.api.bsky.app/xrpc/${path}`).then(r => r.json())
  const feed = await api(`app.bsky.feed.getAuthorFeed?actor=${handle}&limit=30&filter=posts_with_replies`)
  const out = []
  for (const { post } of feed.feed || []) {
    if (post.author.handle !== handle) continue
    const id = post.uri.split('/').pop()
    const mine = {
      key: `bluesky:${post.uri}`, platform: 'bluesky', url: `https://bsky.app/profile/${handle}/post/${id}`,
      text: post.record?.text || '', at: post.record?.createdAt, likes: post.likeCount || 0, answers: [],
    }
    if (post.replyCount) {
      const thread = await api(`app.bsky.feed.getPostThread?uri=${encodeURIComponent(post.uri)}&depth=1`)
      for (const r of thread.thread?.replies || []) {
        if (!r.post || r.post.author.handle === handle) continue
        mine.answers.push({
          key: `bluesky:${r.post.uri}`, handle: r.post.author.handle, name: r.post.author.displayName || r.post.author.handle,
          url: `https://bsky.app/profile/${r.post.author.handle}/post/${r.post.uri.split('/').pop()}`,
          text: r.post.record?.text || '', at: r.post.record?.createdAt,
        })
      }
    }
    out.push(mine)
  }
  return out
}

async function hackernews(handle) {
  const found = await (await fetch(`https://hn.algolia.com/api/v1/search_by_date?tags=author_${handle}&hitsPerPage=20`)).json()
  const out = []
  for (const hit of found.hits || []) {
    const item = await (await fetch(`https://hn.algolia.com/api/v1/items/${hit.objectID}`)).json()
    out.push({
      key: `hackernews:${hit.objectID}`, platform: 'hackernews', url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      text: plain(hit.comment_text || hit.story_text || hit.title || ''), at: hit.created_at, likes: item.points || 0,
      answers: (item.children || []).filter(c => c.author && c.author !== handle).map(c => ({
        key: `hackernews:${c.id}`, handle: c.author, name: c.author,
        url: `https://news.ycombinator.com/item?id=${c.id}`, text: plain(c.text || ''), at: c.created_at,
      })),
    })
  }
  return out
}

async function github(handle) {
  const token = spawnSync('gh', ['auth', 'token'], { encoding: 'utf8', windowsHide: true }).stdout?.trim()
  if (!token) return []
  const query = `{ viewer { repositoryDiscussionComments(last: 25) { nodes {
    id url bodyText createdAt upvoteCount
    replies(first: 20) { nodes { id url bodyText createdAt author { login } } } } } } }`
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'user-agent': 'gtm.js' }, body: JSON.stringify({ query }),
  })
  return ((await res.json()).data?.viewer?.repositoryDiscussionComments?.nodes || []).filter(Boolean).map(c => ({
    key: `github:${c.id}`, platform: 'github', url: c.url, text: c.bodyText, at: c.createdAt, likes: c.upvoteCount || 0,
    answers: (c.replies?.nodes || []).filter(r => r.author && r.author.login !== handle).map(r => ({
      key: `github:${r.id}`, handle: r.author.login, name: r.author.login, url: r.url, text: r.bodyText, at: r.createdAt,
    })),
  }))
}

// Reddit allows one request a minute, so only their four newest comments of
// the last four days are opened to look for answers.
async function reddit(handle) {
  const comments = entries(await get(`user/${handle}/comments/.rss?limit=25`)).filter(e => e.kind === 't1')
  const out = []
  let opened = 0
  for (const c of comments) {
    const mine = { key: `reddit:${c.id}`, platform: 'reddit', url: c.url, text: c.text, at: c.at.toISOString(), likes: 0, answers: [] }
    if (c.at.getTime() > days(4) && opened < 4 && c.url) {
      opened++
      const thread = entries(await get(`${new URL(c.url).pathname.replace(/^\//, '')}.rss?limit=30`))
      mine.answers = thread.filter(e => e.kind === 't1' && e.id !== c.id && e.handle && e.handle !== handle).map(e => ({
        key: `reddit:${e.id}`, handle: e.handle, name: e.handle, url: e.url, text: e.text, at: e.at.toISOString(),
      }))
    }
    out.push(mine)
  }
  return out
}

export const readers = { bluesky, hackernews, github, reddit }
