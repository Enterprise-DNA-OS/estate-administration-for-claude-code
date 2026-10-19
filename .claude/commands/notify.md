---
description: "Record that the bank, registry or other holder of an asset was notified of the death."
---

# notify

Record that the bank, registry or other holder of an asset was notified of the death.

Run `node scripts/estates.mjs notify <ref> "<asset>" --date=<YYYY-MM-DD> --actor="<name>"`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the estate with `history` first, then say back what will change before running it. Nothing here sends, pays or publishes.
