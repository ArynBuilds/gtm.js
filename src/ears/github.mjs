import { spawnSync } from 'node:child_process'

// The discussion boards of the tools people build on, read with this
// computer's own GitHub login. Where builders describe exactly what hurts.
export const platform = 'github'
export const rest = 60

const query = `query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    discussions(first: 40, orderBy: { field: CREATED_AT, direction: DESC }) {
      nodes { number title url createdAt bodyText author { login } category { name } }
    }
  }
}`

// Without the GitHub CLI signed in it hears nothing, and says nothing: the
// Connections page shows it as off, with the one command that turns it on.
export async function listen(_phrases, since, { githubRepos = [] } = {}) {
  if (!githubRepos.length) return []
  const login = spawnSync('gh', ['auth', 'token'], { encoding: 'utf8', windowsHide: true })
  const token = login.stdout?.trim()
  if (!token) return []
  const found = []
  for (const repo of githubRepos) {
    const [owner, name] = repo.split('/')
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'user-agent': 'gtm.js' },
      body: JSON.stringify({ query, variables: { owner, name } }),
    })
    if (!res.ok) throw new Error(`github ${res.status} for ${repo}`)
    // A repo with its discussions switched off answers with nothing, which is fine.
    for (const d of (await res.json()).data?.repository?.discussions?.nodes ?? []) {
      if (new Date(d.createdAt) <= since || !d.author) continue
      found.push({
        key: `github:${repo}#${d.number}`, platform, kind: 'said',
        handle: d.author.login, name: d.author.login, url: d.url,
        title: `${d.title} [${name}, ${d.category?.name ?? 'discussion'}]`,
        text: d.bodyText || '', at: d.createdAt,
      })
    }
  }
  return found
}
