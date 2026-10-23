# Architecture

This guide explains how gtm.js is put together: the one process that runs on your computer, the workspace it keeps, the clock and its jobs, how it listens, how it thinks with Claude Code, the screen, Telegram and the first-run setup. [architecture.html](architecture.html) is an interactive map of the same system; download it and open it in a browser.

## The shape

Everything runs on one computer, in one Node process:

```
┌──────────────────────────── gtm.js service (src/service.mjs) ────────────────────────────┐
│                                                                                           │
│   clock (every minute) ──► jobs: listen · think · plan · switching · outcomes  (30 min)  │
│                                  content · learn · problems · themes · pages   (daily)   │
│                                  AI check · alternatives · verdicts            (Monday)  │
│                                                                                           │
│   screen server 127.0.0.1:4810 ──► the built screen (ui/dist) and /api                   │
│   Telegram line (long poll)    ──► chat · drafts with buttons · morning brief            │
│   setup                        ──► first run: interview, draft, finish                    │
│                                                                                           │
│   every model call ──► src/ask.mjs ──► claude -p (no tools, no settings, empty folder)   │
└───────────────────────────────────────────────┬───────────────────────────────────────────┘
                                                ▼
                          data/   gtm.db · brain.md · gtm.json · asks.json · keys.json
```

`npm start` runs the keeper (`src/keep.mjs`), which starts the service and starts it again whenever it stops, waiting longer after each quick failure. A second copy cannot run beside the first: its server finds the port taken and leaves with exit code 3, and the keeper lets it go.

The service (`src/service.mjs`) does four things: it opens the screen's server (`page.mjs`), connects the Telegram line (`telegram.mjs`), starts the clock (`schedule.mjs`), and offers its drafts to winotch when that runs.

## The workspace

Everything that belongs to one product and one person lives in one folder, `data/` by default or wherever `GTM_DATA` points (`src/store.mjs`):

| File | What it holds | Written by |
| --- | --- | --- |
| `brain.md` | What the product is, who it is for, the problems to listen for, the voice and the rules for replying | The setup, the Brain page, the chat |
| `gtm.json` | The product, where to listen, and every setting that differs from `src/defaults.mjs` | The setup, the screen, the chat |
| `asks.json` | The questions for the weekly AI check | The setup |
| `keys.json` | The Telegram token and the one person the bot answers | The Connections page |
| `gtm.db` | Everything heard, every person, draft, problem, theme, report and log line (SQLite through `node:sqlite`) | Every job |

Settings are read fresh on every use (`config()`), so a change from the screen or the chat takes effect on the next run without a restart. Only what differs from the defaults is written back.

The database centres on people: a **person** has **handles** on several platforms, and every **event** (a post they wrote, an answer to you) hangs off a person. Drafts point at the event they answer. Each job creates its own tables when it loads, so a job file is the place to read what it stores.

## The clock and the jobs

The clock (`src/schedule.mjs`) looks once a minute and runs what is due. Work that was due while the computer slept runs as soon as it wakes. Until the setup has written a product and a brain (`ready()`), it runs nothing.

| Job | When | Steps (`src/jobs.mjs`) |
| --- | --- | --- |
| `cycle` | every 30 minutes | `listen`, `think`, `plan`, `switching`, `outcomes` |
| `daily` | once a day | `content`, `learn`, `notice`, `themes`, `writePages`, `publish` |
| `weekly` | Mondays | `answers`, `rivals`, `verdicts` |

A failing step is written down and the rest go on. A step can ask to be tried again (`listen` does when every platform fails at once, as in the first seconds after waking), which ends the job unmarked so the clock comes back to it a minute later. Every job also runs by itself (`npm run listen`, `npm run think`, ...).

Every morning at `morningHour` the founder gets a brief on Telegram, and every Monday the problem board.

## Listening

`src/listen.mjs` asks each ear in `src/ears/` for what is new since it last listened. Every ear has the same shape: `listen(phrases, since, settings)` returns posts with a platform key, a handle, a URL, a title, the text and a time.

| Ear | How it reads | Rest between runs |
| --- | --- | --- |
| Hacker News | Algolia search, Ask HN posts only | none |
| Bluesky | public post search | none |
| GitHub | the discussion boards in `githubRepos`, through the signed-in GitHub CLI | 60 minutes |
| Reddit | the newest posts of every community in `redditRooms`, page by page back to the last run, plus searches for `phrases`. Every request goes through one line that waits as long as Reddit asks | 60 minutes |

Before anything costly happens, a cheap filter (`src/ears/plain.mjs`) keeps a post only when it contains one of the **topics** and sounds like a person asking or struggling (the **signals**), and does not open like an advert. A post from one of the communities that passes the second test but not the first goes to the wider stream, read once a day for its problem only, never answered and never tied to a person.

## Thinking

Every model call goes through `src/ask.mjs`, which runs Claude Code on the computer's own sign-in (`src/claude.mjs`):

```
claude -p --tools '' --strict-mcp-config --setting-sources '' --system-prompt <fixed>
```

with the prompt on standard input, the `CLAUDE*` variables of a surrounding session removed, and a fresh empty folder as the working directory. It has no tools, no MCP servers and none of the founder's own settings, so a post cannot make it act. Answers are asked for as JSON and the outermost array or object is parsed.

Every prompt that writes in the founder's name starts with **the brain**. The jobs that think:

- **think** reads up to 240 new posts in batches of 20. For each it gives a score from 0 to 10 and a reason. When the score is 6 or more it also writes a reply draft under 90 words in the founder's voice. It records the question the post asks and the problem it describes, with the tools named and what was tried.
- **plan** decides the next step for each person who scored 5 or more: reply, watch, tell them at launch, or leave.
- **switching** reads the status pages in `switchStatus` and the Hacker News front page for the tools in `switchNames`. A serious outage or a big change is judged once, told on Telegram, and gets a post draft when something helpful can be said.
- **outcomes** reads the founder's own posts on each platform once an hour, ties each to the draft it came from (which marks the draft sent), keeps likes and answers, and drafts the follow-up when someone answers.
- **content** turns new commits in the founder's repository into build-in-public posts for X, Bluesky and LinkedIn.
- **learn** proposes topics to add and drop and changes to the brain. It changes nothing itself.
- **notice** and **themes** pull problems out of the wider stream and group every problem into themes.
- **writePages** drafts answer pages from real questions; **publish** writes `site/src/data/site.json` from the problem board and the approved pages, with no names and no links.
- **answers** asks the questions in `asks.json` with no hint of the product and counts how often it is named. **rivals** reads what the alternatives in `rivals` shipped this week.
- **verdicts**, when a `docs` folder is set, lists what the product's documents promise (`capabilities.mjs`) and judges each problem theme against them. A claim that the documents answer a problem must carry a sentence copied from the document, and that sentence is checked against the file.

`addDraft` (`src/store.mjs`) is the one way a draft is saved. It removes dashes used as punctuation when `noDashes` is set, and offers the draft to winotch.

## Nothing is posted

No job signs in to a platform or posts. A post draft opens the platform's own writing box with the text filled in (`compose` in `src/view.mjs`); a reply draft opens the thread. The founder presses send there, or tells gtm.js it was sent; `outcomes` also notices by itself.

## The screen

`src/page.mjs` serves the built screen from `ui/dist` and a small JSON API on `127.0.0.1:<port>`. It answers only requests whose host header is `localhost:<port>` or `127.0.0.1:<port>`, so another site open in the browser cannot reach it, and accepts writes only as `application/json`. Reads are named functions (`today`, `status`, `people`, `problems`, `connections`, `setup`, ...) and writes are named actions (`draft`, `topics`, `brain`, `run`, `talk`, `setup/<step>`, `settings`, ...).

The screen (`ui/`) is React with TanStack Query, Tailwind and shadcn/ui. It reads each place on its own timer and reads everything again the moment a run ends. Its places are Home, Inbox, People, Signals, Problems, Insights, Brain and Connections, with the chat beside them.

## The chat and Telegram

`src/talk.mjs` answers the founder from the screen or from Telegram. It gets the brain, the current state (drafts, numbers, the latest log lines, people, problem themes, reports) and the conversation so far, and may carry out a fixed list of actions: edit, drop or link a draft, mark one sent, add or remove a topic, run a job, hand over every draft one by one, or change a section of the brain.

`src/telegram.mjs` long-polls the bot the founder created. The first person to write to a new bot becomes its only owner. Drafts arrive as messages with **Open**, **I sent it** and **Skip** buttons, and a reply to a draft's message is taken as a change to it. Voice notes are decoded with ffmpeg and transcribed on the computer (`src/voice.mjs`, Whisper through Transformers.js). A reply that scores 8 or more is sent right after the run that drafted it, because a strong thread goes cold in hours.

## The setup

A workspace without a product and a brain opens on the setup (`ui/src/views/onboarding/`, `src/setup.mjs`):

1. **Check**: finds Claude Code (`claude --version`), reads who is signed in (`claude auth status`), and asks it for one word.
2. **Interview**: reads the product's website and its repository (README, `package.json`, the last commit messages), then has Claude write six questions for that product with drafted answers.
3. **Draft**: writes the product-specific parts of the brain and the listening plan in two calls at once. Every suggested GitHub repository is checked against the GitHub API (discussion boards must have discussions on) and every status page must answer, before either is kept.
4. **Finish**: writes `gtm.json`, `brain.md` and `asks.json`, and starts the first listen.

The brain's rules for replying in someone else's thread, the second message and the founder's own posts are the same for everyone; only the product's name, its stage and "I" or "we" change. The screen shows the setup's real progress (`progress` in `setup.mjs`), and keeps what was typed in the browser until the setup ends.

`src/connections.mjs` lists everything gtm.js can be connected to, each with what it does, whether it is on and the one step to turn it on. It looks at the computer at most every four seconds.

## The public site

`site/` is an Astro site with three pages: the product, what people struggle with, and the approved answer pages. It is built from `site/src/data/site.json`, which `publish` writes once a day, and takes the product's name, line, stage and address from the workspace.
