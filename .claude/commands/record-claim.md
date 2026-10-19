---
description: "Record a claim, or a written notice of intention to claim, against the estate."
---

# record-claim

Record a claim, or a written notice of intention to claim, against the estate.

Run `node scripts/estates.mjs record-claim <ref> --claimant="<name>" --kind=<family_protection|testamentary_promises|relationship_property|family_provision|creditor|other> --notice=<date received> [--filed=<date>] [--served=<date>] --actor="<name>"`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the estate with `history` first, then say back what will change before running it. Nothing here sends, pays or publishes. A live claim holds every distribution.
