---
description: "Draft a letter to a bank, registry or fund asking for the date-of-death balance and what it needs to release the asset."
---

# draft-institution-letter

Draft a letter to a bank, registry or fund asking for the date-of-death balance and what it needs to release the asset.

Run `node scripts/estates.mjs draft-institution-letter <ref> "<asset>"`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Show the draft path and read the draft back. Fill the signature only from the operator. Nothing is sent.
