---
description: "List debts and expenses by estate, unpaid first. Use --estate=<ref> for one estate."
---

# liabilities

List debts and expenses by estate, unpaid first. Use --estate=<ref> for one estate.

Run `node scripts/estates.mjs liabilities --estate=<ref>`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Total what is unpaid. Disputed debts need the operator's instruction before payment.
