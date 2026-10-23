import { askJson } from '../ask.mjs'
import { brain, config, isMain, note, product, report } from '../store.mjs'

const week = 7 * 86400000

async function github(path) {
  const res = await fetch(`https://api.github.com/${path}`, { headers: { 'user-agent': 'gtm.js' } })
  if (!res.ok) throw new Error(`github ${res.status} for ${path}`)
  return res.json()
}

// What the tools people compare us to shipped this week, and what was said.
export async function rivals() {
  if (!config().rivals.length) return
  const since = new Date(Date.now() - week)
  const facts = []
  for (const repo of config().rivals) {
    try {
      const info = await github(`repos/${repo}`)
      const releases = (await github(`repos/${repo}/releases?per_page=5`))
        .filter(r => new Date(r.published_at) > since)
        .map(r => ({ name: r.name || r.tag_name, notes: (r.body || '').slice(0, 1200) }))
      const name = repo.split('/')[1]
      const hn = await (await fetch('https://hn.algolia.com/api/v1/search?' + new URLSearchParams({
        query: name, tags: 'story', hitsPerPage: '5',
        numericFilters: `created_at_i>${Math.floor(since / 1000)},points>30`,
      }))).json()
      facts.push({
        repo, stars: info.stargazers_count, releases,
        talked: hn.hits.filter(h => new RegExp(`\\b${name.replace(/[.-]/g, '.?')}\\b`, 'i').test(h.title)).map(h => ({ title: h.title, points: h.points, comments: h.num_comments, url: `https://news.ycombinator.com/item?id=${h.objectID}` })),
      })
    } catch (err) {
      note('rivals', `${repo} failed: ${err.message}`, false)
    }
  }
  const read = await askJson(`THE BRAIN\n${brain()}\n
THE TASK
Below is what other tools shipped in the last 7 days and the Hacker News
stories about them. Write for the founder, plainly:
- "shipped": up to 6 short lines, each naming the tool and what changed that a
  developer would care about. Skip bug-fix releases.
- "said": up to 4 short lines on what people discussed.
- "forUs": up to 3 short lines on what this means for ${product()}. No advice to
  copy features; say what to watch or what gap it shows.
Answer with only a JSON object with those three arrays of strings.

FACTS
${JSON.stringify(facts, null, 1)}`)
  report('rivals', { ...read, stars: facts.map(f => ({ repo: f.repo, stars: f.stars })), links: facts.flatMap(f => f.talked) })
  note('rivals', `looked at ${facts.length} tools`)
}

if (isMain(import.meta.url)) await rivals()
