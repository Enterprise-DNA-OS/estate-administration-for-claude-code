---
description: "Show the estate account line by line: receipts, payments and distributions."
---

# ledger

Show the estate account line by line: receipts, payments and distributions.

Run `node scripts/estates.mjs ledger --estate=<ref>`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Present it as an account in date order with a running position if asked.
