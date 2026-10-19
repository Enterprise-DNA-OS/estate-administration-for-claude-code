# Estate Administration for Claude Code

Know which estates can distribute, which claim notices are about to lapse and how much each estate account holds. Your estates, assets, debts, beneficiaries, claims and estate accounts live in a database you own. MIT licensed. Built by Enterprise DNA.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free. Install, try the demo and import an Estateably inventory. | Your fields, your rules, your letters, your Estateably files brought across. | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=estateably&utm_medium=readme) | [Talk to Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=estateably&utm_medium=readme) |

Estateably's Pro platform plan lists US$1,083 a month billed annually, US$12,996 a year, for 50 new files a year. Extra files cost US$320 each on a platform plan. [Vendor pricing](https://estateably.com/pricing), checked 19 October 2026. No verified customer invoice is claimed.

This is the estate administration desk of a law firm, an accounting practice or a trustee company: from the date of death to the final distribution. It tracks the grant, the assets to collect, the debts to pay, the beneficiaries and their shares, claims against the estate and the estate account, and it checks each estate against the distribution rules for New Zealand and New South Wales.

## Quick start

```bash
git clone https://github.com/Enterprise-DNA-OS/estate-administration-for-claude-code.git
cd estate-administration-for-claude-code
npm install
npm test
npm run demo
```

Use Node 20 or later. Tests and the demo use temporary fictional databases and remove them afterwards. For persistent demo data run `npm run seed`. For real work run `npm run migrate` and do not seed. Leave `DATABASE_URL` unset to use the embedded PGlite database in `.data/`, or set it to a private Postgres database. Keep the database, backups, exports and drafts private: they hold personal information about the deceased and their family.

Open the folder in Claude Code, Codex, OpenCode or Cursor and type `/attention`. Every agent uses the same commands. The code does not call any paid model service.

```bash
node scripts/estates.mjs attention
node scripts/estates.mjs windows
node scripts/estates.mjs position --json
npm run view
npm run docs
```

Three dashboards (this week, distribution windows, money held) and three documents (estate accounts, beneficiary statements, the date-of-death inventory) render as HTML in your brand. Change the name, colours and logo in `brand.json`.

## The weekly rituals

| Command | What it does |
|---|---|
| `/attention` | Overdue tasks, assets not collected 90 days after the grant, claim notices that lapse in 14 days, missing grants, quiet files, estates ready to distribute |
| `/windows` | When each estate is protected for distribution and when its claims period ends |
| `/position` | Each estate account: receipts, payments, distributions, cash held and unpaid debts |
| `/compliance` | Breaches, holds and what is due against the rules in [docs/compliance.md](docs/compliance.md), with sources |
| `/weekly-review` | The Monday review, written to `drafts/` from attention, windows and money held |
| `/draft-institution-letter` | A letter to a bank, registry or fund asking for the balance and release requirements |
| `/draft-beneficiary-update` | An update for beneficiaries from the estate account |

The working commands: `/add-estate`, `/record-grant`, `/add-beneficiary`, `/check-identity`, `/add-asset`, `/notify`, `/collect`, `/transfer`, `/add-liability`, `/pay`, `/expense`, `/record-claim`, `/update-claim`, `/record-notice`, `/distribute`, `/close`, `/add-task`, `/done`, `/log`, `/status`. The reads: `/estates`, `/history`, `/assets`, `/liabilities`, `/beneficiaries`, `/claims`, `/tasks`, `/ledger`, `/insights`. Plus `/import`, `/export`, `/view`, `/documents`, `/new-view` and `/customise`. 42 commands in all; [docs/cli.md](docs/cli.md) lists every option.

Names match case-insensitively. A partial name or reference works when it is unique; when it is not, the command lists the candidates and stops.

## The distribution gate

`/distribute` refuses when:

- the estate is not protected for distribution (inside six months of an NZ grant, a live claim, no NSW notice of intended distribution, or a state with no configured rule), unless the advice relied on is recorded with `--reason`, which `/compliance` then reports;
- the distribution would leave less cash than the unpaid debts;
- the beneficiary is a minor and no trustee is named, or an adult beneficiary's identity check is not recorded.

The software records and checks; the responsible lawyer decides. It is not legal advice, it does not move money, and it does not decide whether a claim is valid.

## Bring your Estateably files

In Estateably, open an estate's Inventory module, choose Reports, then Export Inventory. Save the general inventory sheet as CSV and import it into the matching estate, dry run first:

```bash
node scripts/estates.mjs import estateably examples/estateably-inventory.csv --estate=EST-004 --actor="Your name" --dry-run
```

The [switching guide](docs/replace-estateably.md) covers headings, what maps and what does not come across. Imports are atomic: identical rows are skipped, a conflicting row stops the whole file, and every source column is kept with the asset.

## Ten questions answered from your records

`/insights` runs all ten today. They combine your own records; they are not a claim that Estateably cannot produce a similar report.

1. Which estates could distribute today, and how much is free after the unpaid debts?
2. Which assets are still uncollected more than 90 days after the grant?
3. Which claim notices are live, and when does each lapse?
4. Which open estates are past their claims period but not yet finalised?
5. Which minor beneficiaries have a share in an estate that is administering or distributing?
6. Which open estates have residuary shares that do not add to 100%?
7. How much cash is held across open estates, by responsible person?
8. Which estates have unpaid debts after a distribution was made?
9. Which open files have had no recorded activity for 30 days?
10. Which assets realised less than their date-of-death value, and by how much?

## Your first hour: ten things to ask for

1. What needs my attention this week?
2. Which estates can we distribute from now?
3. When does the claim notice on the Kingi estate lapse?
4. Draft the letter to Kauri Registry for the Hart share portfolio.
5. Show the Hart estate account.
6. Write the beneficiary update for the Hart estate.
7. Record that the probate for Peter Lowe was granted today.
8. Put our firm's name and logo on the estate accounts.
9. Add a field for the deceased's IRD or tax file number through /customise.
10. Add a page of every estate by responsible lawyer through /new-view.

## Verification

`npm test` runs 161 checks on a temporary database: migrations, repeatable seed data, every read and write, the distribution gate, claim notices lapsing and staying live, NSW notice periods, unconfigured states, closing an estate, import repeats and rollback, drafts, export, the append-only activity log, read-only views, row security for unrelated database roles, and escaped HTML. Set `TEST_DATABASE_URL` to run the same checks on an empty Postgres database.

Read the [operating rules](CLAUDE.md), the [rules and sources](docs/compliance.md), the [selection evidence](docs/research.md) and [why there is no front end](docs/why-no-front-end.md).

## Want it installed and run for you?

Enterprise DNA installs Estate Administration for Claude Code for your practice, brings your Estateably files across, adds your letters and rules, and runs it for you as part of Omni. One setup fee, then a monthly retainer. [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=estateably&utm_medium=readme).

## License

MIT. Copyright (c) 2026 Enterprise DNA.
