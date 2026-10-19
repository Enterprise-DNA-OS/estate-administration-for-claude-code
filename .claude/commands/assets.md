---
description: "List assets by estate with date-of-death value, status and what was realised. Use --estate=<ref> for one estate."
---

# assets

List assets by estate with date-of-death value, status and what was realised. Use --estate=<ref> for one estate.

Run `node scripts/estates.mjs assets --estate=<ref>`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Separate assets passing outside the estate (joint accounts, nominated benefits) from estate assets.
