---
description: "List every estate with its status, distribution window, assets still to collect and cash held."
---

# estates

List every estate with its status, distribution window, assets still to collect and cash held.

Run `node scripts/estates.mjs estates`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Show the table. Call out any estate whose window is not "protected" and why.
