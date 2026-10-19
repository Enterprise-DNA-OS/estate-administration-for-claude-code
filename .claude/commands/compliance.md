---
description: "Check the records against the rules in docs/compliance.md and report breaches, holds and what is due, with the source of each rule."
---

# compliance

Run `node scripts/estates.mjs compliance`. Add `--json` when you need every field.

1. Read `docs/compliance.md` first. Each rule names its source, what a breach looks like in the records, and where it is checked.
2. Report breaches first, then holds (live claims), then what is due, then notes. Quote the source column.
3. For each breach, draft the fix for the operator to approve: the record to correct, the notice to publish, the task to add. Drafts go to `drafts/`; nothing is sent.
4. If a rule looks out of date, or the estate is in a state or country with no configured rule, say so and stop. The operator confirms the law, then you update `docs/compliance.md` and the check together.

This checks records against rules the operator has told the system to enforce. It is not legal advice and does not decide whether a distribution is safe; the responsible lawyer does.
