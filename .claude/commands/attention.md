---
description: "Show what needs a person this week: overdue tasks, uncollected assets, lapsing claim notices, missing grants, quiet files and estates ready to distribute."
---

# attention

Show what needs a person this week: overdue tasks, uncollected assets, lapsing claim notices, missing grants, quiet files and estates ready to distribute.

Run `node scripts/estates.mjs attention`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Lead with lapsing claim notices and overdue tasks. Group by responsible person. Suggest the one next step for each line.
