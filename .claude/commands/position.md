---
description: "Show the money in each estate account: receipts, payments, distributions, cash held and unpaid debts. Use --estate=<ref> for one estate."
---

# position

Show the money in each estate account: receipts, payments, distributions, cash held and unpaid debts. Use --estate=<ref> for one estate.

Run `node scripts/estates.mjs position`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Report cash held against unpaid debts. Flag any estate where debts are more than the cash.
