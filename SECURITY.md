# Security policy

## Supported versions

gtm.js runs on your own computer. Security fixes land on the default branch and in the next release; please run the latest release.

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Use GitHub's private vulnerability reporting ("Security" tab, "Report a vulnerability") on this repository. Include the affected version or commit, the file or screen, reproduction steps and the impact you observed.

We aim to acknowledge reports within 3 working days and to agree on a disclosure date with you once a fix is available. We are happy to credit reporters in the release notes.

---

## Security model

gtm.js is designed for one founder on their own computer. It reads text written by strangers all day and hands it to a language model, so the main questions are what that model may do, who can reach the service, and what leaves the computer.

### Actors

| Actor | Authenticates with | Can do |
| --- | --- | --- |
| You, on the screen | Being on this computer: the server answers `127.0.0.1` with a `localhost` host header only | Everything |
| You, on Telegram | Being the first person to write to your own bot | Talk to it, approve and edit drafts |
| Claude Code | Your own sign-in, started by gtm.js | Answer in text. Nothing else |
| Strangers on the web | Nothing | Write the posts gtm.js reads |
| winotch, when it runs | A bearer token it writes for its apps | Report a press of Posted or Drop on a draft |

### What the model may do

Every call is `claude -p` with `--tools ''`, `--strict-mcp-config`, `--setting-sources ''`, its own system prompt and a fresh empty folder as its working directory (`src/ask.mjs`). It has no tools, no MCP servers and none of your `~/.claude` settings, so text in a post cannot make it read a file, run a command or reach the network. Every prompt that carries posts says that they are data, not instructions.

Its answers are parsed as JSON and only these effects follow from them: a score, a draft, a theme, a plan, a report row. In the chat, a fixed list of actions (edit or drop a draft, add or remove a topic, run a job, change a brain section) is carried out when you ask for it.

### Nothing is posted for you

gtm.js never signs in to a platform and never posts. A post draft opens the platform's own writing box with the text filled in; a reply draft opens the thread. You press send there. Answer pages for the public site are written to `site/src/data/site.json` only after you approve each one.

### The network

- The screen's server listens on `127.0.0.1:4810` only, refuses any request whose host header is not `localhost:4810` or `127.0.0.1:4810` (so another site in your browser cannot reach it), and accepts writes only as `application/json`.
- **Do not forward port 4810 or expose it on a network**: the screen has no password of its own, and whoever reaches it can change your brain and read everything heard.
- Outbound requests go to the platforms it reads (public APIs and feeds of Reddit, Hacker News, Bluesky, GitHub), status pages you approved, your website during the setup, and Telegram when linked.

### Secrets

| Secret | Where it lives | Rotation impact |
| --- | --- | --- |
| Telegram bot token and owner | `data/keys.json` | Paste a new token on the Connections page; the next person to write to the bot becomes its owner |
| GitHub token | Never stored: read from `gh auth token` when needed | Sign in again with `gh auth login` |
| Claude Code sign-in | Claude Code's own store; gtm.js never reads it | Sign in again with `claude` |

The whole `data/` folder is ignored by git. Never commit it.

---

## What this does not protect against

- **Your computer's user account is the boundary.** Any program running as you can read `data/` and talk to the screen's server.
- **Prompt injection inside drafts.** A post can try to steer what a draft says. The model cannot act, but a draft can still carry words you would not say. Read every draft before you send it; that is the design.
- **Telegram is a third party.** Drafts, posts and the morning brief pass through Telegram's servers when you link it.

## Privacy

gtm.js reads public posts and keeps, in `data/gtm.db`, the handles, posts and scores of the people it found, so it can recognise them across platforms and follow a conversation. That data stays on your computer. The public site gets only problems in general words: no names, no links to anyone's post. You are responsible for how you use what you keep, under the law that applies to you.
