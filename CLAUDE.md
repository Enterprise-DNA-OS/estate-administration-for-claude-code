# Estate Administration for Claude Code: operating instructions

Claude Code reads this file at the start of every session. It says who this is for, the house rules, and the one right way to do each recurring job.

## Who this is for

- **Practice:** [YOUR FIRM]
- **Operator:** [YOUR NAME], [your role]
- **What matters most:** [for example: no distribution before it is protected, and no estate account left unreconciled]

The work is estate administration for a law firm, accounting practice or trustee company: from the date of death to the final distribution and the estate accounts.

## Rules

- Read the CLI result before answering. Every answer about an estate starts with data from `node scripts/estates.mjs`. Never answer from memory.
- Resolve names first. If the CLI says a name is ambiguous, list the candidates and ask; never pick the first.
- Every write names `--actor`. That is a label in the activity log, not a verified identity or a signature.
- Never invent a value, date, balance, claim or instruction. Unknown values stay unknown.
- Never record a distribution reason for the operator. `--reason` on `/distribute` is the advice relied on, in the operator's words.
- Never send, pay, publish or delete. Letters, updates and reviews are drafts in `drafts/`. Recording a payment or distribution does not move money; a person does that outside this system.
- The rules in `docs/compliance.md` are records checks, not legal advice. If a rule looks out of date or an estate is in a place with no configured rule, say so and stop.
- Back up before a schema change. Use a new numbered migration (`/customise`), run `npm test`, and keep real data, exports and credentials out of Git.
- The database owner can bypass every application check. Protect that credential. Row security and revoked public privileges restrict unrelated database roles; a shared installation needs authenticated access.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| Add an asset with its date-of-death value. Mark joint accounts and nominated benefits with --outside. | `/add-asset` |
| Add a beneficiary with their residuary share as a percentage and any specific gift. | `/add-beneficiary` |
| Open a new estate file at intake. | `/add-estate` |
| Add a debt or expense the estate owes. | `/add-liability` |
| Add a task to an estate with an owner and a due date. | `/add-task` |
| List assets by estate with date-of-death value, status and what was realised. Use --estate=<ref> for one estate. | `/assets` |
| Show what needs a person this week: overdue tasks, uncollected assets, lapsing claim notices, missing grants, quiet files and estates ready to distribute. | `/attention` |
| List beneficiaries with residuary share, specific gifts, identity check and what each has received. | `/beneficiaries` |
| Record that a beneficiary's identity was checked, and the evidence seen. | `/check-identity` |
| List claims and written notices of intention to claim, with the date an NZ notice lapses. | `/claims` |
| Close an estate once cash is nil, debts are paid, assets are dealt with, claims are resolved and tasks are done. | `/close` |
| Record money collected or an asset sold, as a receipt in the estate account. | `/collect` |
| Check the records against the rules in docs/compliance.md and report breaches, holds and what is due, with the source of each rule. | `/compliance` |
| Make this system yours in plain language. Add a field, rename stages, change a rule, add a column to a document. Writes the migration, applies it, updates the commands that touch it. | `/customise` |
| Record a distribution to a beneficiary. Refuses outside the protection window unless the advice relied on is recorded, refuses to leave less than the unpaid debts, and never pays a minor's share out. | `/distribute` |
| Render estate accounts, beneficiary statements and the date-of-death inventory as branded HTML from the records. | `/documents` |
| Mark an open task done. | `/done` |
| Draft an update for beneficiaries: money collected, paid, distributed and held, what is left to collect and when distribution can happen. | `/draft-beneficiary-update` |
| Draft a letter to a bank, registry or fund asking for the date-of-death balance and what it needs to release the asset. | `/draft-institution-letter` |
| List every estate with its status, distribution window, assets still to collect and cash held. | `/estates` |
| Record an administration expense paid from the estate account (filing fees, valuations). | `/expense` |
| Write every record to one JSON file the business keeps. | `/export` |
| Show one estate in full: window, money, beneficiaries, assets, debts, claims and recent activity. | `/history` |
| Bring an Estateably inventory export into an estate. Dry run first. | `/import` |
| Answer the ten questions in the README from the records in one run. | `/insights` |
| Show the estate account line by line: receipts, payments and distributions. | `/ledger` |
| List debts and expenses by estate, unpaid first. Use --estate=<ref> for one estate. | `/liabilities` |
| Add a file note to an estate: a call, a letter, an instruction. | `/log` |
| Add a read-only HTML view (a dashboard page) from a plain-language description, rendered in the operator's brand by `npm run view`. | `/new-view` |
| Record that the bank, registry or other holder of an asset was notified of the death. | `/notify` |
| Pay a debt from the estate account. Refuses when the cash is not there. | `/pay` |
| Show the money in each estate account: receipts, payments, distributions, cash held and unpaid debts. Use --estate=<ref> for one estate. | `/position` |
| Record a claim, or a written notice of intention to claim, against the estate. | `/record-claim` |
| Record the date of probate or letters of administration. The protection and claims periods start from it in NZ. | `/record-grant` |
| Record a published notice: a notice of intended distribution (NSW, 30 days by default), a creditor notice or an institution letter. | `/record-notice` |
| Move an open estate to another stage (intake, grant_pending, collecting, administering, distributing). Closing uses /close. | `/status` |
| List open tasks by due date. Use --estate=<ref> for one estate. | `/tasks` |
| Record a specific gift handed to the beneficiary named in the will. | `/transfer` |
| Record that a claim was filed, served, settled, dismissed or withdrawn. | `/update-claim` |
| Render the read-only dashboards in views.json (this week, distribution windows, money held) as HTML in your brand. | `/view` |
| Write the Monday review from attention, windows and money held. | `/weekly-review` |
| Show when each open estate can safely distribute and when its claims period ends. | `/windows` |

If an ask fits nothing here, run `node scripts/estates.mjs --help`, answer from the records, then propose a new command for it.

## Where things live

- `scripts/estates.mjs` is the one CLI. `scripts/lib/domain.mjs` holds its rules.
- `supabase/migrations/` is the schema in plain SQL. `npm run migrate` applies it. `DATABASE_URL` chooses Postgres; unset, it uses PGlite in `.data/`.
- `views.json` and `documents.json` define the dashboards and documents. `brand.json` is your name, colours and logo.
- `docs/compliance.md` lists the rules and their sources. `docs/replace-estateably.md` is the switching guide.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=estateably&utm_medium=readme
