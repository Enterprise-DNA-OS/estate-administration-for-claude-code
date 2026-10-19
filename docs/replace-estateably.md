# Replace Estateably

1. In Estateably, open each estate you are moving. In its Inventory module choose Reports, then Export Inventory. The download is an Excel workbook with a general inventory sheet and a sheet for the holdings in each bank account. The [vendor guide](https://support.estateably.com/en/articles/10736208-exporting-an-inventory-estates) documents this route.
2. Keep the untouched workbook. Save the general inventory sheet as UTF-8 CSV. Headings can differ between accounts; if yours do, copy `examples/column-map.json` and name your headings once.
3. Open the estate in this system first (`/add-estate`, then `/record-grant` and `/add-beneficiary`). The inventory export carries assets, not the estate's dates, people or account history.
4. Run the import with `--dry-run`. Fix every row it rejects: a missing description, an amount it cannot read, a duplicate.
5. Run it again without `--dry-run`. Compare the asset count and the total date-of-death value with the workbook.
6. Record what has already happened on the file: assets collected (`/collect`), debts paid (`/pay`), distributions made (`/distribute`, with the reason if they predate the protection window), claims and notices. Reconcile the estate account balance with the trust account before relying on `/position`.

```bash
npm run migrate
node scripts/estates.mjs add-estate --ref=EST-101 --deceased="Full Name" --died=2026-03-01 --jurisdiction=NZ --actor="Your name"
node scripts/estates.mjs import estateably inventory.csv --estate=EST-101 --map=column-map.json --actor="Your name" --dry-run
node scripts/estates.mjs import estateably inventory.csv --estate=EST-101 --map=column-map.json --actor="Your name"
```

| Destination | Headings accepted by default | Treatment |
|---|---|---|
| Description | Description, Asset, Item, Asset Description, Name | Required |
| Kind | Category, Type, Asset Type, Asset Category | Mapped by words (bank, property, shares, KiwiSaver, super, vehicle, household, insurance, loan, business); anything else is "other" |
| Institution | Institution, Financial Institution, Bank, Held With | Optional |
| Account | Account Number, Account, Account #, Reference | Optional; with the description it identifies the row on a repeat import |
| Date-of-death value | Date of Death Value, Value at Date of Death, DOD Value, Value | Optional; blank stays unknown. Commas and a dollar sign are accepted |

The bundled example is synthetic, not an untouched vendor export. Every source column is kept with the imported asset, including ones that are not mapped.

Identical rows are skipped on a repeat import. A row that matches an existing asset by description and account but has a different value or institution stops the whole import: nothing is written. Imported assets start as "identified".

What does not come across from the inventory export: the per-account holdings sheets (import them as separate assets or keep them as working papers), estate dates, beneficiaries, tasks, letters, notices, transactions, court forms, accounting reports and Vault records. Keep Estateably available until each moved estate is reconciled. Enterprise DNA does that mapping and reconciliation as part of a custom installation.
