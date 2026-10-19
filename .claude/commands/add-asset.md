---
description: "Add an asset with its date-of-death value. Mark joint accounts and nominated benefits with --outside."
---

# add-asset

Add an asset with its date-of-death value. Mark joint accounts and nominated benefits with --outside.

Run `node scripts/estates.mjs add-asset <ref> --description="<asset>" --kind=<bank|property|shares|kiwisaver|superannuation|vehicle|chattels|...> --institution="<holder>" --account=<number> --value=<amount> [--outside] [--gift-to="<beneficiary>"] --actor="<name>"`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the estate with `history` first, then say back what will change before running it. Nothing here sends, pays or publishes. Leave --value off when the value is not known; never guess one.
