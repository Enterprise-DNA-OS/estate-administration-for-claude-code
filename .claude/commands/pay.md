---
description: "Pay a debt from the estate account. Refuses when the cash is not there."
---

# pay

Pay a debt from the estate account. Refuses when the cash is not there.

Run `node scripts/estates.mjs pay <ref> "<creditor>" [--amount=<amount>] --date=<YYYY-MM-DD> --actor="<name>"`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the estate with `history` first, then say back what will change before running it. Nothing here sends, pays or publishes. This records a payment the operator has made or approved; it does not move money.
