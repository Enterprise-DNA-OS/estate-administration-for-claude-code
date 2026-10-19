---
description: "Record a published notice: a notice of intended distribution (NSW, 30 days by default), a creditor notice or an institution letter."
---

# record-notice

Record a published notice: a notice of intended distribution (NSW, 30 days by default), a creditor notice or an institution letter.

Run `node scripts/estates.mjs record-notice <ref> --kind=<intended_distribution|creditor_notice|institution_letter|other> --date=<published> [--days=<period>] --actor="<name>"`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the estate with `history` first, then say back what will change before running it. Nothing here sends, pays or publishes.
