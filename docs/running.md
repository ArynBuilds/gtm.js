# Running gtm.js

This guide covers running gtm.js from source, Claude Code, keeping it running, more than one product, Telegram, the public site, where your data lives, backups and troubleshooting.

## Requirements

- Node.js 22.13 or newer and npm (for `node:sqlite`)
- [Claude Code](https://claude.com/claude-code), installed and signed in
- Optional: the [GitHub CLI](https://cli.github.com), signed in, for GitHub discussions
- Optional: [ffmpeg](https://ffmpeg.org), for Telegram voice notes
- Optional: git, for build-in-public posts from your commits

## From source

```sh
git clone https://github.com/ArynBuilds/gtm.js.git && cd gtm.js
npm install
npm run build
npm start
```

`npm run build` installs and builds the screen into `ui/dist`. `npm start` prints the address once the service is up:

```
gtm.js is running. Open http://localhost:4810
```

A new workspace opens on the setup. Listening starts when you confirm the review.

## Claude Code

gtm.js finds Claude Code by running `claude --version`, and reads who is signed in with `claude auth status`. Both cost nothing. The setup's first step also asks it for one word, to prove it answers.

- Install it with `npm install -g @anthropic-ai/claude-code`, or with Anthropic's native installer.
- Sign in once by running `claude` in a terminal.
- On Windows, both `claude.exe` (native) and `claude.cmd` (npm) work.

Every run uses your own Claude Code plan. A cycle with new posts reads them in batches of 20, so the cost follows how much your topics bring in; the Home page and the log say how many posts each run read.

## Keep it running

`npm start` runs the keeper, which restarts the service whenever it stops. To have it start when you sign in:

- **Windows**: press `Win + R`, type `shell:startup`, and put a shortcut there whose target is `node --no-warnings src\keep.mjs`, starting in the gtm.js folder. A `.vbs` file that runs it hidden works too.
- **macOS**: a login item, or a LaunchAgent that runs `node src/keep.mjs` in the folder.
- **Linux**: a systemd user service with `WorkingDirectory` set to the folder.

Only one copy runs at a time per port: a second one finds the port taken and leaves.

## More than one product

Each product is its own workspace folder. Point `GTM_DATA` at it and give it its own port:

```sh
mkdir -p ~/gtm/acme && echo '{ "port": 4811 }' > ~/gtm/acme/gtm.json
GTM_DATA=~/gtm/acme npm start
```

The same works for a trial run that must not touch your real workspace.

## Telegram

1. In Telegram, open a chat with @BotFather, send `/newbot` and pick a name.
2. Paste the token on the Connections page (or in the chat's Telegram line).
3. Open your new bot and press Start. The first person to write to it becomes its only owner.

From then on it sends a morning brief, strong threads right after the run that found them, switching moments, and the Monday problem board. Its menu has `/today`, `/drafts`, `/run` and `/problems`; anything else you write or say is answered like the chat on the screen.

## Settings

Everything the setup chose is in `data/gtm.json`, and every default is in `src/defaults.mjs`. A key in `gtm.json` wins over the default. The ones you are most likely to change:

| Key | Default | What it does |
| --- | --- | --- |
| `port` | `4810` | Where the screen answers |
| `everyMinutes` | `30` | How often the cycle runs |
| `morningHour` | `9` | When the morning brief is sent |
| `weeklyDay` | `1` | The day of the weekly reports (0 is Sunday) |
| `firstRunDays` | `7` | How far back the first listen reads |
| `widePerDay` | `50` | How many posts of the wider stream are read for problems each day |
| `redditPages` | `6` | How many pages back Reddit is read after a long gap |
| `noDashes` | `false` | Remove dashes used as punctuation from every draft |
| `repo` | none | Your code folder, for build-in-public posts |
| `docs` | none | A folder of Markdown about your product, for problem verdicts |

Topics, Reddit communities and the brain are easier to change on the Brain page or by telling the chat.

## The public site

```sh
cd site
npm install
npm run build
```

The site is built from `site/src/data/site.json`, which gtm.js writes once a day. It uses your product's address from the workspace as its own. Host `site/dist` anywhere that serves static files.

## Where your data lives

Everything is in `data/` (or `GTM_DATA`):

| Path | What it is |
| --- | --- |
| `brain.md` | The brain every draft follows |
| `gtm.json` | Your product and your settings |
| `asks.json` | The questions for the weekly AI check |
| `keys.json` | The Telegram token and owner |
| `gtm.db` | Everything heard, every person and draft, reports and the log |
| `service.log` | What the service printed |

## Backups

Stop gtm.js, then copy the whole workspace folder. `gtm.db` is SQLite in write-ahead mode, so copy `gtm.db-wal` and `gtm.db-shm` with it if they exist.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| "The screen is not built yet" | Run `npm run build`, then reload. |
| The setup waits for Claude Code | Install it, open a new terminal and run `claude` once to sign in. The setup checks again every few seconds. |
| The live test fails | Run `claude -p "say ready"` in a terminal. If that fails too, sign in again with `claude`. |
| GitHub shows Off | Run `gh auth login`. Without it the GitHub ear is skipped quietly. |
| "waiting: no internet yet" in the log | Every platform failed at once, as right after waking. It tries again a minute later by itself. |
| Reddit is slow | Reddit allows about one request a minute without a key. After a long gap it reads several pages back, one a minute. |
| Nothing new for a while | Most posts are filtered out before Claude sees them. Check the topics on the Brain page, and what "What it learned" proposes on Home. |
| Start over completely | Stop gtm.js and delete the workspace folder. The next start opens on the setup. |
