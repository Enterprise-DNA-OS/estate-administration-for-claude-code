---
description: "Record a distribution to a beneficiary. Refuses outside the protection window unless the advice relied on is recorded, refuses to leave less than the unpaid debts, and never pays a minor's share out."
---

# distribute

Record a distribution to a beneficiary. Refuses outside the protection window unless the advice relied on is recorded, refuses to leave less than the unpaid debts, and never pays a minor's share out.

Run `node scripts/estates.mjs distribute <ref> "<beneficiary>" --amount=<amount> --type=<interim|final|specific_gift> --actor="<name>"`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the estate with `history` first, then say back what will change before running it. Nothing here sends, pays or publishes. Run /windows first. Only pass --reason when the operator gives the advice relied on in their own words; never write one for them.
