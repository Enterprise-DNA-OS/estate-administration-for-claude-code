#!/usr/bin/env node
// The one CLI for the estate administration desk. Human tables by default, --json for machines.
//   node scripts/estates.mjs --help
import { getDb } from './lib/db.mjs';
import { run, commands } from './lib/domain.mjs';
import { table, money } from './lib/format.mjs';

const args = [];
const flags = {};
for (const a of process.argv.slice(2)) {
  if (!a.startsWith('--')) { args.push(a); continue; }
  const i = a.indexOf('=');
  const key = a.slice(2, i < 0 ? undefined : i);
  if (Object.hasOwn(flags, key)) { console.error(`Duplicate --${key}`); process.exit(1); }
  flags[key] = i < 0 ? true : a.slice(i + 1);
}
const command = args.shift();

const ALLOWED = ['json', 'help', 'actor', 'estate', 'ref', 'deceased', 'died', 'jurisdiction', 'grant-type', 'will-date', 'executors', 'responsible',
  'currency', 'date', 'name', 'relationship', 'share', 'gift', 'minor', 'contact', 'evidence', 'description', 'kind', 'institution', 'account',
  'value', 'outside', 'gift-to', 'amount', 'sold', 'note', 'creditor', 'reason', 'claimant', 'notice', 'filed', 'served', 'status', 'days',
  'reference', 'type', 'to-trustee', 'title', 'owner', 'due', 'map', 'dry-run', 'out'];

// *_cents columns print as money in the row's currency; everything else as written.
function cell(v, key, row) {
  if (v === null || v === undefined) return key.endsWith('_cents') ? 'unknown' : '';
  if (key.endsWith('_cents')) return money(v, row.currency);
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
function human(value) {
  if (Array.isArray(value)) {
    if (!value.length) return '  (none)';
    if (value[0]?.question) return value.map((x, i) => `${i + 1}. ${x.question}\n${human(x.rows)}`).join('\n\n');
    const keys = Object.keys(value[0]);
    return table(value, keys.map((key) => ({ key, label: key.replace(/_cents$/, ''), align: key.endsWith('_cents') ? 'right' : 'left', width: 60, format: (v, row) => cell(v, key, row) })));
  }
  if (value && typeof value === 'object' && value.estate && value.activity) {
    const e = value.estate;
    return [`${e.ref}  ${e.deceased_name}  (${e.jurisdiction}, ${e.status}, ${e.responsible})`,
      `Died ${e.date_of_death}. Grant ${e.grant_date ?? 'not yet'}. Window: ${value.window.window_status}${value.window.protected_from ? ` from ${value.window.protected_from}` : ''}.`,
      `Held ${money(value.position.cash_held_cents, e.currency)}, unpaid debts ${money(value.position.unpaid_liabilities_cents, e.currency)}, ${value.position.assets_to_collect} asset(s) to collect.`,
      '', 'Beneficiaries', human(value.beneficiaries), '', 'Assets', human(value.assets.map((r) => ({ ...r, currency: e.currency }))),
      '', 'Liabilities', human(value.liabilities.map((r) => ({ ...r, currency: e.currency }))), '', 'Claims', human(value.claims),
      '', 'Recent activity', human(value.activity.map((r) => ({ ...r, at: new Date(r.at).toISOString().slice(0, 16).replace('T', ' ') })))].join('\n');
  }
  return Object.entries(value || {}).map(([k, v]) => `  ${k}: ${cell(v, k, value)}`).join('\n');
}

if (!command || flags.help) {
  console.log(`Estate administration desk. Commands: ${commands.join(', ')}.
Options use --key=value. Every write needs --actor="<your name>". See docs/cli.md.`);
} else {
  let db;
  try {
    for (const key of Object.keys(flags)) if (!ALLOWED.includes(key)) throw Error(`Unknown option --${key}`);
    db = await getDb();
    const result = await run(db, command, args, flags);
    console.log(flags.json ? JSON.stringify(result, null, 2) : human(result));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await db?.close();
  }
}
