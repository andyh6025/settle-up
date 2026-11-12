# AGENTS.md — constraints for AI agents

## Stack

- Vanilla HTML/CSS/JS with ES modules. No frameworks, no bundlers, no build step.
- No runtime dependencies. Do not add npm packages without explicit approval.
- Node's built-in `node:test` is the only test tooling.
- The site is hosted on GitHub Pages. Use relative asset paths (`./style.css`)
  so it works under the `/settle-up/` subpath. Never hard-code a localhost URL
  or an absolute `/`-rooted path in the app.

## Secrets and data

- Never put secrets, tokens, API keys, or `.env` values in the repo.
- `.env*`, `node_modules/`, and `.DS_Store` stay gitignored.
- All user data stays in localStorage. No network calls, analytics, or telemetry.
- Never paste real names, addresses, or amounts from a user's household into
  committed files, tests, or issue text.

## Change size

- One feature per PR, matching one issue. Keep diffs under ~200 changed lines.
- Don't refactor unrelated code or reformat whole files.
- Don't rename files or move logic without asking.

## Commands

- Explain any command and why before running it.
- Prefer read-only inspection; never run destructive git commands.
- Never commit, push, open issues, change repository settings, or enable Pages
  unless the user explicitly asks.
- Do not start a long-running local server unless the user explicitly asks.

## Money and correctness

- Store money as integer cents; never use floats for balances.
- Split remainders deterministically so totals always reconcile.
- Any change to `settle.js` requires a matching test.

## Accessibility and layout

- Semantic HTML, real form labels, visible `:focus-visible` styles.
- Must work keyboard-only at 375px and 1280px widths.
- Don't encode meaning in color alone.
