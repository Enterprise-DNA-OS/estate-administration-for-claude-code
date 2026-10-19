---
description: "List beneficiaries with residuary share, specific gifts, identity check and what each has received."
---

# beneficiaries

List beneficiaries with residuary share, specific gifts, identity check and what each has received.

Run `node scripts/estates.mjs beneficiaries --estate=<ref>`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Flag minors, unchecked identities and shares that do not add to 100%.
