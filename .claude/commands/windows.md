---
description: "Show when each open estate can safely distribute and when its claims period ends."
---

# windows

Show when each open estate can safely distribute and when its claims period ends.

Run `node scripts/estates.mjs windows`. Add `--json` when you need every field. Resolve the estate, beneficiary or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Explain each window in plain words and cite the rule from docs/compliance.md. Never tell the operator an estate is safe to distribute when the window says otherwise.
