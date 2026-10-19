---
description: "Bring an Estateably inventory export into an estate. Dry run first."
---

# import

Bring an Estateably inventory export into an estate. Dry run first.

Run `node scripts/estates.mjs import estateably <file.csv> --estate=<ref> [--map=<column-map.json>] --actor="<name>" --dry-run`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Follow docs/replace-estateably.md. Run with --dry-run, show the counts, then run again without it once the operator agrees. A conflicting row stops the whole import.
