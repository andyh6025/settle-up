> Roommates waste time figuring out who owes whom after shared groceries, takeout, and utility bills. The smallest version is one web page where you enter who paid what, and it shows the fewest payments needed to settle up.

# settle-up — SPEC v0.1

## Problem

Roommates waste time figuring out who owes whom after shared groceries,
takeout, and utility bills. Mental math and group chats produce disputes and
forgotten debts.

## Target user

2–6 roommates sharing one household. One person (the organizer) enters
expenses on a phone or laptop. No accounts, no install, no spreadsheet.

## v0.1 features (max 3)

### 1. Household roster + expense entry

- Add and remove roommates by name.
- Add an expense: description, amount, who paid, and which roommates shared it.
- Split equally among the selected roommates; the payer may pay for others.
- Data persists in this browser via localStorage.

### 2. Balances

- Show each person's net position: total paid minus total owed.
- Label clearly ("owes $12.50" / "is owed $4.00"), not color alone.

### 3. Settle-up plan

- Show the payments needed to bring every balance to zero.
- Greedy debt simplification: largest debtor pays largest creditor, repeat.
- Guarantees at most (people − 1) payments. Near-minimal, not proven optimal.

## Out of scope

Accounts/auth, backend or database, cross-device sync, real money movement or
payment links, receipts/OCR, unequal or percentage splits, recurring bills,
multi-currency, expense editing, history/audit log, CSV export, notifications,
native apps, analytics, custom domains.

## Tech stack

- Vanilla HTML, CSS, JavaScript (ES2020 modules). No framework, no bundler.
- No runtime dependencies. `package.json` exists only to set `"type": "module"`.
- localStorage for persistence; all data stays in the browser.
- Money handled as integer cents; formatted only at display time.
- Tests: Node's built-in `node:test` runner.
- Hosted as a static site on GitHub Pages. All asset paths must be relative
  (`./style.css`, not `/style.css`) so the site works under the `/settle-up/`
  subpath. No build step and no CI workflow are required.

## File layout

- `index.html` — page structure and forms
- `style.css` — responsive layout, focus styles
- `app.js` — DOM wiring, validation, localStorage
- `settle.js` — pure functions: splitExpense, computeBalances, settleUp
- `tests/settle.test.js` — unit tests for the pure functions
- `SPEC.md`, `AGENTS.md`, `README.md`

## How to run

### Local

    cd settle-up
    python3 -m http.server 8000

Then open http://localhost:8000

A server is required locally: browsers block ES module imports over `file://`.

### Hosted

https://andyh6025.github.io/settle-up/

This is the expected GitHub Pages URL. It goes live after Pages is enabled for
the repository (the final issue); until then, use the local steps above.

## How to test

### Automated

    node --test

Covers: empty household, single person, zero-sum balances, uneven cent splits,
payer excluded from participants, 3-person cycle, already-settled household,
and that a settlement plan zeroes all balances.

### Manual browser checklist

- Add 3 people, add 2 expenses, refresh: data survives.
- Balances match hand math.
- Settle-up list zeroes every balance.
- Remove a person referenced by an expense: blocked with a clear message.
- Keyboard only: tab through every control, activate with Enter/Space.
- Narrow (~375px) and wide (~1280px): no horizontal scrolling, cards stack.
- After Pages is enabled: open the hosted URL and repeat the checks above.

## Success criteria

A user can open a link, enter a household and its expenses, refresh without
data loss, and see a settlement plan that leaves everyone at zero, using only
a browser.
