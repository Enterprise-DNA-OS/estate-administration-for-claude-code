# Rules and sources

Checked 19 October 2026. These are records checks for an estate administration desk. They are not legal advice, they do not decide whether a claim is valid or a distribution is safe, and they do not replace the responsible lawyer's judgement. Confirm the current text of each provision before relying on it, and add a rule here before using the system for another state or country.

| Check | What the system does | Source |
|---|---|---|
| NZ protection window | An NZ estate is "protected" for distribution from six months after the date of the NZ grant, when no live claim or notice of intention to claim is recorded. A distribution before that date, or while a claim is live, needs a recorded reason and is reported by `/compliance`. | Administration Act 1969 (NZ) s 47, which carried forward s 30A of the Administration Act 1952 (added by the Administration Amendment Act 1960): no action lies against an administrator for a distribution properly made after six months from the NZ grant without notice of an application or an intended application. |
| NZ notice lapses | A written notice of intention to claim stops holding distribution three months after the administrator first receives it, unless the claim is filed or served (recorded with `--filed` or `--served`) before then. `/attention` warns 14 days ahead. | Administration Act 1969 (NZ) s 48. |
| NZ claims period | Shows the date 12 months after the grant. The text notes the two-year period where an administrator applies under the Family Protection Act 1955 for a person who is not of full age or capacity. Informational: the system does not bar a later claim, which a court can allow before final distribution. | Administration Act 1969 (NZ) s 49. |
| NSW notice of intended distribution | An NSW estate is "protected" only after a notice of intended distribution is recorded, from the later of 30 days after publication (or the period recorded) and six months after death, when no live claim is recorded. | Probate and Administration Act 1898 (NSW) s 92; Succession Act 2006 (NSW) s 93; UCPR Form 114; Supreme Court of NSW online notices. |
| NSW claims period | Shows the date 12 months after death, the time for a family provision application unless the court allows a later one. Informational. | Succession Act 2006 (NSW) s 58. |
| Other states | VIC, QLD, WA, SA, TAS, ACT and NT estates show "rule not configured". Nothing is guessed. | Add the rule and its source here, then the check in `supabase/migrations` through `/customise`. |
| Debts before beneficiaries | A distribution may not leave less cash than the recorded unpaid debts. `/compliance` reports any estate with unpaid debts above the cash held after a distribution. | Local check reflecting the general order of administration: debts and expenses are provided for before beneficiaries are paid. |
| Residuary shares | Shares cannot be entered above 100%. Open estates whose shares do not add to exactly 100% are reported. | Local check against the will. |
| Minors | A minor's distribution must name who holds it on trust; it is never recorded as paid to the minor. | Local check. The will or the law decides who may hold it. |
| Identity | An adult beneficiary's identity check must be recorded, with the evidence seen, before a distribution. | Local check supporting the practice's own anti-money-laundering procedures. It does not replace them. |

## Sources

- Administration Act 1969 (NZ), sections 46 to 50: [legislation.govt.nz](https://www.legislation.govt.nz/act/public/1969/0052/latest/whole.html) and [NZLII](https://www.nzlii.org/nz/legis/consol_act/aa1969173/).
- Administration Amendment Act 1960 (NZ), s 30A, the predecessor of s 47: [legislation.govt.nz](https://www.legislation.govt.nz/act/public/1960/100/en/latest/).
- Supreme Court of NSW, notice of intended distribution: [supremecourt.nsw.gov.au](https://supremecourt.nsw.gov.au/wills-probate/online-probate-notices/notice-intended-distribution.html).
- UCPR Form 114, notice of intended distribution of estate: [NSW form](https://lpab.nsw.gov.au/content/dam/dcj/ctsd/ucpr/documents/doc/ucpr_form_114_v4.doc).
- Succession Act 2006 (NSW), s 58 and s 93: [AustLII](https://www.austlii.edu.au/au/legis/nsw/consol_act/sa2006138/).

## Limits

The protection checks follow the dates in the records. A notice the practice received but did not record is invisible to the system. A protected window means only that the recorded dates and claims meet the rule above; it does not protect a distribution that was not "properly made", and an executor who is also a beneficiary can face other exposure in NSW. The software does not track tax clearance, trustee investment duties or court orders beyond the claim status the operator records.

Database controls revoke public access, enable row security and use views that run with the caller's permissions. The activity log is append-only for application users but not against the database owner. Keep backups and test restores.
