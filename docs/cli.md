# CLI reference

One CLI: `node scripts/estates.mjs <command> [arguments] [--key=value ...]`. Human tables by default; `--json` prints every field. Every write needs `--actor`. Dates are `YYYY-MM-DD`. Amounts accept `1234.56`, `1,234.56` or `$1,234.56`. Unknown options are rejected.

Estates match by reference, deceased's name or id; beneficiaries, assets, creditors, claims and tasks match by name within the estate. Exact matches win; a unique partial match works; anything else lists the candidates and exits 1.

## add-asset

Add an asset with its date-of-death value. Mark joint accounts and nominated benefits with --outside.

```bash
node scripts/estates.mjs add-asset <ref> --description="<asset>" --kind=<bank|property|shares|kiwisaver|superannuation|vehicle|chattels|...> --institution="<holder>" --account=<number> --value=<amount> [--outside] [--gift-to="<beneficiary>"] --actor="<name>"
```

## add-beneficiary

Add a beneficiary with their residuary share as a percentage and any specific gift.

```bash
node scripts/estates.mjs add-beneficiary <ref> --name="<name>" --share=<percent> --relationship=<relationship> [--gift="<item>"] [--minor] --actor="<name>"
```

## add-estate

Open a new estate file at intake.

```bash
node scripts/estates.mjs add-estate --ref=<EST-ref> --deceased="<full name>" --died=<YYYY-MM-DD> --jurisdiction=<NZ|NSW|VIC|...> --executors="<names>" --responsible="<staff>" --actor="<name>"
```

## add-liability

Add a debt or expense the estate owes.

```bash
node scripts/estates.mjs add-liability <ref> --creditor="<who>" --amount=<amount> --kind=<funeral|tax|debt|mortgage|credit_card|expense|professional_fees|other> --actor="<name>"
```

## add-task

Add a task to an estate with an owner and a due date.

```bash
node scripts/estates.mjs add-task <ref> --title="<task>" --owner="<staff>" --due=<YYYY-MM-DD> --actor="<name>"
```

## assets

List assets by estate with date-of-death value, status and what was realised. Use --estate=<ref> for one estate.

```bash
node scripts/estates.mjs assets --estate=<ref>
```

## attention

Show what needs a person this week: overdue tasks, uncollected assets, lapsing claim notices, missing grants, quiet files and estates ready to distribute.

```bash
node scripts/estates.mjs attention
```

## beneficiaries

List beneficiaries with residuary share, specific gifts, identity check and what each has received.

```bash
node scripts/estates.mjs beneficiaries --estate=<ref>
```

## check-identity

Record that a beneficiary's identity was checked, and the evidence seen.

```bash
node scripts/estates.mjs check-identity <ref> "<beneficiary>" --evidence="<what was sighted>" --actor="<name>"
```

## claims

List claims and written notices of intention to claim, with the date an NZ notice lapses.

```bash
node scripts/estates.mjs claims
```

## close

Close an estate once cash is nil, debts are paid, assets are dealt with, claims are resolved and tasks are done.

```bash
node scripts/estates.mjs close <ref> --actor="<name>"
```

## collect

Record money collected or an asset sold, as a receipt in the estate account.

```bash
node scripts/estates.mjs collect <ref> "<asset>" --amount=<amount> [--sold] --date=<YYYY-MM-DD> --actor="<name>"
```

## compliance

Check the records against the rules in docs/compliance.md and report breaches, holds and what is due, with the source of each rule.

```bash
node scripts/estates.mjs compliance
```

## customise

Make this system yours in plain language. Add a field, rename stages, change a rule, add a column to a document. Writes the migration, applies it, updates the commands that touch it.

```bash
npm run migrate
```

## distribute

Record a distribution to a beneficiary. Refuses outside the protection window unless the advice relied on is recorded, refuses to leave less than the unpaid debts, and never pays a minor's share out.

```bash
node scripts/estates.mjs distribute <ref> "<beneficiary>" --amount=<amount> --type=<interim|final|specific_gift> --actor="<name>"
```

## documents

Render estate accounts, beneficiary statements and the date-of-death inventory as branded HTML from the records.

```bash
npm run docs
```

## done

Mark an open task done.

```bash
node scripts/estates.mjs done <ref> "<task>" --actor="<name>"
```

## draft-beneficiary-update

Draft an update for beneficiaries: money collected, paid, distributed and held, what is left to collect and when distribution can happen.

```bash
node scripts/estates.mjs draft-beneficiary-update <ref>
```

## draft-institution-letter

Draft a letter to a bank, registry or fund asking for the date-of-death balance and what it needs to release the asset.

```bash
node scripts/estates.mjs draft-institution-letter <ref> "<asset>"
```

## estates

List every estate with its status, distribution window, assets still to collect and cash held.

```bash
node scripts/estates.mjs estates
```

## expense

Record an administration expense paid from the estate account (filing fees, valuations).

```bash
node scripts/estates.mjs expense <ref> --description="<what>" --amount=<amount> --actor="<name>"
```

## export

Write every record to one JSON file the business keeps.

```bash
node scripts/estates.mjs export --out=<file.json>
```

## history

Show one estate in full: window, money, beneficiaries, assets, debts, claims and recent activity.

```bash
node scripts/estates.mjs history <ref or name>
```

## import

Bring an Estateably inventory export into an estate. Dry run first.

```bash
node scripts/estates.mjs import estateably <file.csv> --estate=<ref> [--map=<column-map.json>] --actor="<name>" --dry-run
```

## insights

Answer the ten questions in the README from the records in one run.

```bash
node scripts/estates.mjs insights
```

## ledger

Show the estate account line by line: receipts, payments and distributions.

```bash
node scripts/estates.mjs ledger --estate=<ref>
```

## liabilities

List debts and expenses by estate, unpaid first. Use --estate=<ref> for one estate.

```bash
node scripts/estates.mjs liabilities --estate=<ref>
```

## log

Add a file note to an estate: a call, a letter, an instruction.

```bash
node scripts/estates.mjs log <ref> --note="<what happened>" --actor="<name>"
```

## new-view

Add a read-only HTML view (a dashboard page) from a plain-language description, rendered in the operator's brand by `npm run view`.

```bash
npm run view -- <name>
```

## notify

Record that the bank, registry or other holder of an asset was notified of the death.

```bash
node scripts/estates.mjs notify <ref> "<asset>" --date=<YYYY-MM-DD> --actor="<name>"
```

## pay

Pay a debt from the estate account. Refuses when the cash is not there.

```bash
node scripts/estates.mjs pay <ref> "<creditor>" [--amount=<amount>] --date=<YYYY-MM-DD> --actor="<name>"
```

## position

Show the money in each estate account: receipts, payments, distributions, cash held and unpaid debts. Use --estate=<ref> for one estate.

```bash
node scripts/estates.mjs position
```

## record-claim

Record a claim, or a written notice of intention to claim, against the estate.

```bash
node scripts/estates.mjs record-claim <ref> --claimant="<name>" --kind=<family_protection|testamentary_promises|relationship_property|family_provision|creditor|other> --notice=<date received> [--filed=<date>] [--served=<date>] --actor="<name>"
```

## record-grant

Record the date of probate or letters of administration. The protection and claims periods start from it in NZ.

```bash
node scripts/estates.mjs record-grant <ref> --date=<YYYY-MM-DD> --actor="<name>"
```

## record-notice

Record a published notice: a notice of intended distribution (NSW, 30 days by default), a creditor notice or an institution letter.

```bash
node scripts/estates.mjs record-notice <ref> --kind=<intended_distribution|creditor_notice|institution_letter|other> --date=<published> [--days=<period>] --actor="<name>"
```

## status

Move an open estate to another stage (intake, grant_pending, collecting, administering, distributing). Closing uses /close.

```bash
node scripts/estates.mjs status <ref> <stage> --actor="<name>"
```

## tasks

List open tasks by due date. Use --estate=<ref> for one estate.

```bash
node scripts/estates.mjs tasks
```

## transfer

Record a specific gift handed to the beneficiary named in the will.

```bash
node scripts/estates.mjs transfer <ref> "<asset>" --actor="<name>"
```

## update-claim

Record that a claim was filed, served, settled, dismissed or withdrawn.

```bash
node scripts/estates.mjs update-claim <ref> "<claimant>" [--filed=<date>] [--served=<date>] [--status=<settled|dismissed|withdrawn>] --note="<order or letter relied on>" --actor="<name>"
```

## view

Render the read-only dashboards in views.json (this week, distribution windows, money held) as HTML in your brand.

```bash
npm run view
```

## weekly-review

Write the Monday review from attention, windows and money held.

```bash
node scripts/estates.mjs weekly-review
```

## windows

Show when each open estate can safely distribute and when its claims period ends.

```bash
node scripts/estates.mjs windows
```

