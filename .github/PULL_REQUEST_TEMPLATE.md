## What and why

<!-- What does this change, and what problem does it solve? Link issues with "Fixes #123". -->

## How it was tested

<!-- Steps you took in the running app (npm start), a trial workspace if you used one (GTM_DATA), and screenshots for screen changes. -->

## Checklist

- [ ] `npm run check` passes
- [ ] I tried the change in the running app, on a trial workspace, the way a person would use it
- [ ] Nothing is posted, sent or published without the founder pressing a button
- [ ] Text from the web reaches Claude Code only through `src/ask.mjs` (no tools, no settings), and the prompt says it is data
- [ ] Settings that belong to one product live in the workspace (`data/`), defaults in `src/defaults.mjs`
- [ ] Docs updated (`README.md`, `docs/`) if behaviour, settings or commands changed
