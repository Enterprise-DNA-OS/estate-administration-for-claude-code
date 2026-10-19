---
description: "Record that a beneficiary's identity was checked, and the evidence seen."
---

# check-identity

Record that a beneficiary's identity was checked, and the evidence seen.

Run `node scripts/estates.mjs check-identity <ref> "<beneficiary>" --evidence="<what was sighted>" --actor="<name>"`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the estate with `history` first, then say back what will change before running it. Nothing here sends, pays or publishes.
