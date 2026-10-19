---
description: "Write every record to one JSON file the business keeps."
---

# export

Write every record to one JSON file the business keeps.

Run `node scripts/estates.mjs export --out=<file.json>`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Say where the file is. It holds personal information: keep it private.
