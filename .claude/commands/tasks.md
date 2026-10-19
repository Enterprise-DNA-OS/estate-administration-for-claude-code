---
description: "List open tasks by due date. Use --estate=<ref> for one estate."
---

# tasks

List open tasks by due date. Use --estate=<ref> for one estate.

Run `node scripts/estates.mjs tasks`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Overdue first, with the owner.
