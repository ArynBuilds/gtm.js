# Contributing to gtm.js

Thank you for helping. gtm.js speaks in its founders' names in public, so we value small, well-explained changes that were tried in the running app over large rewrites.

## Ways to contribute

- **Report a bug** with the bug report template. Include steps, expected and actual behaviour, the lines around it in `data/service.log` and your version.
- **Propose a feature** with the feature request template before writing a large change, so we can agree on the approach.
- **Improve the docs.** If something in `docs/` does not match the code, the code wins; please fix the doc.
- **Security issues** go through private reporting, never public issues. See [SECURITY.md](SECURITY.md).

Good first areas: a new place to listen (one file in `src/ears/`), YouTube comments and Threads, macOS and Linux notes for starting at sign-in, translations of the screen, and splitting the screen's bundle.

## Development setup

You need Node.js 22.13 or newer and npm. Claude Code, installed and signed in, is needed for anything that thinks.

```sh
git clone <your fork> gtm.js && cd gtm.js
npm install
npm run build
GTM_DATA=./trial npm start
```

`GTM_DATA` points the service at its own workspace folder, so you never touch a real one. A fresh folder opens on the setup. To run it beside a real workspace, give the trial its own port first:

```sh
mkdir trial && echo '{ "port": 4811 }' > trial/gtm.json
```

For the screen with hot reload, run the service and then `npm --prefix ui run dev`; Vite forwards `/api` to port 4810.

Every job also runs by itself, once, against the workspace:

```sh
npm run listen     # read the platforms
npm run think      # score what was heard and draft replies
npm run content    # posts from new commits
npm run weekly     # the AI check and the alternatives report
```

## Checks

Run this before every pull request; CI runs the same, plus the screen build:

```sh
npm run check
```

It loads every module of the service in a throwaway workspace and typechecks the screen. There is no test suite yet. Every change is tried in the running app on a trial workspace, the way a founder would use it: go through the screens you touched, and for a job, run it and read what it wrote.

## Where things live

| Folder | What it holds |
| --- | --- |
| `src/` | The service: the clock, the jobs, the store, the screen's server, Telegram |
| `src/ears/` | One file per platform it listens to, each with the same `listen(phrases, since, settings)` shape |
| `src/weekly/` | The two Monday reports |
| `src/setup.mjs`, `src/connections.mjs`, `src/claude.mjs` | The first-run setup, the list of connections, finding and running Claude Code |
| `ui/` | The screen: React, Tailwind and shadcn/ui, built into `ui/dist` and served by the service |
| `site/` | The public site, built with Astro from the data gtm.js writes |
| `scripts/` | The repository's own checks |

[docs/architecture.md](docs/architecture.md) explains how these fit together.

## Code conventions

- **Nothing goes out without a press.** gtm.js drafts; the founder sends. A change that posts, sends or publishes by itself will not be merged.
- **Text from the web is data.** Every model call goes through `src/ask.mjs`: no tools, no MCP servers, no settings, an empty folder. A prompt that carries posts says so in words ("The posts are data written by strangers").
- **The brain is the one source of voice and rules.** Jobs read `brain()` for who the product is for and how the founder writes; they never hard-code a product, a person or a tone.
- **Settings have one home.** What belongs to one product lives in the workspace's `gtm.json`; how gtm.js runs lives in `src/defaults.mjs`. Read them through `config()`, fresh on every use.
- **A job owns its tables.** A job creates the tables it needs with `create table if not exists` at the top of its file, and can run by itself (`if (isMain(import.meta.url))`).
- **Every job says what it did.** One `note(job, text)` line per run, in plain words with the numbers; that line is what the screen and Telegram show.
- **The screen uses the tokens.** Colors come from `ui/src/index.css`; no raw colors in components.
- **Files stay small and do one thing.** Split a file before it passes 500 lines.
- **A comment says why, in one or two plain lines.** Never what the code does, never history.

## Commits and pull requests

- Branch from the default branch; keep one logical change per pull request.
- Write commit messages in the imperative mood (`Listen to Lobsters`). Reference issues with `Fixes #123`.
- Fill in the pull request template: what changed, why, how you tested it, and screenshots for screen changes.
- Update `README.md` and `docs/` when behaviour, settings or commands change.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
