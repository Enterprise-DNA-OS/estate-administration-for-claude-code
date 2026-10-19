# Examples

`estateably-inventory.csv` is a synthetic file shaped like the general inventory sheet of an Estateably inventory export, saved as CSV. It is not an untouched vendor export: headings in a real export can differ. `column-map.json` shows how to name your own headings once.

```bash
node scripts/estates.mjs import estateably examples/estateably-inventory.csv --estate=EST-004 --actor="Your name" --dry-run
```
