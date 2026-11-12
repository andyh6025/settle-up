# settle-up

Track shared household costs without the group-chat math: log who paid for
what, see everyone's balance, and get the fewest payments needed to settle up.

**Live:** https://andyh6025.github.io/settle-up/

## How to use

1. Add each roommate by name.
2. Add an expense: description, amount, who paid, and who shared it.
3. Check **Balances** to see who is owed and who owes.
4. Follow the **Settle up** list — each line is one payment that clears the
   group's debts in as few transfers as possible.

Everything is saved in your browser's localStorage. There are no accounts, no
server, and no data leaves your device.

## Run it locally

No build step, but it must be served over HTTP (the app uses ES modules, which
browsers block on `file://`):

```sh
cd settle-up
python3 -m http.server 8000
```

Then open http://localhost:8000/.

## Run the tests

```sh
node --test
```
