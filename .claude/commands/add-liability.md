---
description: "Add a debt or expense the estate owes."
---

# add-liability

Add a debt or expense the estate owes.

Run `node scripts/estates.mjs add-liability <ref> --creditor="<who>" --amount=<amount> --kind=<funeral|tax|debt|mortgage|credit_card|expense|professional_fees|other> --actor="<name>"`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the estate with `history` first, then say back what will change before running it. Nothing here sends, pays or publishes.
