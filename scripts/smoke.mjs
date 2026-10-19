#!/usr/bin/env node
// npm test: a temporary database, the demo estates, every command exercised, then cleaned up.
// Set TEST_DATABASE_URL to run the same checks against an empty Postgres database instead of PGlite.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { run, reads, commands, insights, today, date, cents } from './lib/domain.mjs';
import { parseCsv } from './lib/csv.mjs';

const root = mkdtempSync(path.join(os.tmpdir(), 'estates-test-'));
process.env.DATA_DIR = path.join(root, 'db');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.OUTPUT_DIR = path.join(root, 'out');

let db;
let checks = 0;
const ok = (v, msg) => { assert.ok(v, msg); checks++; };
const eq = (a, b, msg) => { assert.equal(a, b, msg); checks++; };
const fails = async (fn, re) => { await assert.rejects(fn, re); checks++; };
const call = (cmd, args = [], f = {}) => run(db, cmd, args, f);
const shift = (n) => new Date(Date.parse(today()) + n * 86400000).toISOString().slice(0, 10);
const A = { actor: 'Test' };

try {
  db = await getDb();
  await migrate(db);
  eq((await migrate(db)).ran.length, 0, 'migrate twice is a no-op');
  await seed(db);
  await seed(db);
  eq((await call('estates')).length, 5, 'seed is idempotent');

  // Every read runs and returns rows.
  for (const cmd of Object.keys(reads)) {
    const f = cmd === 'ledger' ? { estate: 'EST-001' } : {};
    ok(Array.isArray(await call(cmd, [], f)), `read ${cmd}`);
  }

  // The demo data says what it should.
  const windows = Object.fromEntries((await call('windows')).map((r) => [r.ref, r.window_status]));
  eq(windows['EST-001'], 'protected', 'NZ estate past 6 months from grant is protected');
  eq(windows['EST-002'], 'live claim', 'live claim notice holds distribution');
  eq(windows['EST-003'], 'no notice of intended distribution', 'NSW needs the notice');
  eq(windows['EST-004'], 'no grant recorded', 'no grant');
  const attention = await call('attention');
  ok(attention.some((r) => r.item === 'claim notice lapses soon' && r.ref === 'EST-002'), 'lapsing claim notice');
  ok(attention.some((r) => r.item === 'task overdue'), 'overdue task');
  ok(attention.some((r) => r.item === 'asset not collected' && r.detail.includes('share portfolio')), 'uncollected asset');
  ok(attention.some((r) => r.item === 'quiet file' && r.ref === 'EST-003'), 'quiet file');
  ok(attention.some((r) => r.item === 'ready to distribute' && r.ref === 'EST-001'), 'ready to distribute');
  const [p1] = await call('position', [], { estate: 'EST-001' });
  eq(Number(p1.cash_held_cents), 10526055, 'cash held = receipts - payments - distributions');
  eq(Number(p1.unpaid_liabilities_cents), 460000, 'unpaid debts');
  const comp = await call('compliance');
  ok(comp.some((r) => r.ref === 'EST-003' && r.rule === 'residuary shares'), 'shares not adding to 100% caught');
  ok(comp.some((r) => r.ref === 'EST-002' && r.rule === 'live claim'), 'live claim reported');
  ok(!comp.some((r) => r.rule === 'distribution before protection'), 'demo distributions were protected');
  const qs = await call('insights');
  eq(qs.length, 10, 'ten questions');
  eq(insights.length, 10);
  eq(Number(qs[0].rows[0].free_cents), 10066055, 'free cash after debts');
  eq(qs[9].rows[0].description, '2016 hatchback', 'realised below date-of-death value');

  // Name matching: exact, case-insensitive, partial when unique, ambiguity lists candidates.
  eq((await call('history', ['est-001'])).estate.ref, 'EST-001');
  eq((await call('history', ['kingi'])).estate.ref, 'EST-002');
  await fails(() => call('history', ['e']), /ambiguous/);
  await fails(() => call('history', ['nobody']), /not found/);

  // Writes need an actor.
  await fails(() => call('log', ['EST-001'], { note: 'x' }), /--actor/);

  // A new estate from intake to close.
  const e = await call('add-estate', [], { ...A, ref: 'EST-T1', deceased: 'Test Person', died: shift(-250), jurisdiction: 'nz' });
  eq(e.status, 'intake');
  await fails(() => call('add-estate', [], { ...A, ref: 'est-t1', deceased: 'Dup', died: shift(-1) }), /already exists/);
  await fails(() => call('add-estate', [], { ...A, ref: 'BAD', deceased: 'Bad', died: '2026-02-30' }), /valid date/);
  await fails(() => call('record-grant', ['EST-T1'], { ...A, date: shift(-300) }), /before the death/);
  await fails(() => call('record-grant', ['EST-T1'], { ...A, date: shift(5) }), /future/);
  eq((await call('record-grant', ['EST-T1'], { ...A, date: shift(-200) })).status, 'collecting');
  await call('add-beneficiary', ['EST-T1'], { ...A, name: 'Ben One', share: '60', relationship: 'son' });
  await fails(() => call('add-beneficiary', ['EST-T1'], { ...A, name: 'Too Much', share: '50' }), /110%/);
  await call('add-beneficiary', ['EST-T1'], { ...A, name: 'Kid Two', share: '40', minor: true });
  await fails(() => call('add-beneficiary', ['EST-T1'], { ...A, name: 'ben one', share: '0' }), /unique|duplicate/i);
  const bank = await call('add-asset', ['EST-T1'], { ...A, description: 'Test account', kind: 'bank', institution: 'Test Bank', value: '50,000.00' });
  eq(Number(bank.dod_value_cents), 5000000);
  await fails(() => call('add-asset', ['EST-T1'], { ...A, description: 'Bad', kind: 'yacht' }), /--kind/);
  await call('add-asset', ['EST-T1'], { ...A, description: 'Joint account', kind: 'bank', value: '1000', outside: true });
  await call('notify', ['EST-T1', 'test account'], A);
  await fails(() => call('collect', ['EST-T1', 'joint'], { ...A, amount: '1000' }), /outside the estate/);
  await fails(() => call('collect', ['EST-T1', 'account'], { ...A, amount: '1' }), /ambiguous/);
  await call('collect', ['EST-T1', 'Test account'], { ...A, amount: '50000' });
  await fails(() => call('collect', ['EST-T1', 'Test account'], { ...A, amount: '1' }), /already collected/);
  await call('add-liability', ['EST-T1'], { ...A, creditor: 'Funeral Co', kind: 'funeral', amount: '8000' });
  await call('add-liability', ['EST-T1'], { ...A, creditor: 'Tax Office', kind: 'tax', amount: '2000' });
  await fails(() => call('pay', ['EST-T1', 'Funeral Co'], { ...A, amount: '90000' }), /not enough/);
  await call('pay', ['EST-T1', 'funeral'], A);
  await fails(() => call('pay', ['EST-T1', 'funeral'], A), /already paid/);
  await call('expense', ['EST-T1'], { ...A, description: 'Probate filing fee', amount: '200' });
  eq(Number((await call('position', [], { estate: 'EST-T1' }))[0].cash_held_cents), 4180000, 'cash after payments');

  // Distribution gates.
  await fails(() => call('distribute', ['EST-T1', 'Ben One'], { ...A, amount: '1000' }), /identity/);
  await call('check-identity', ['EST-T1', 'Ben One'], { ...A, evidence: 'Passport sighted' });
  await fails(() => call('distribute', ['EST-T1', 'Kid Two'], { ...A, amount: '1000' }), /minor/);
  await fails(() => call('distribute', ['EST-T1', 'Ben One'], { ...A, amount: '40000' }), /unpaid debts/);
  await fails(() => call('distribute', ['EST-T1', 'Ben One'], { ...A, amount: '50000' }), /not enough/);
  const claimRow = await call('record-claim', ['EST-T1'], { ...A, claimant: 'Late Claimant', kind: 'family_protection', notice: shift(-10) });
  eq(claimRow.status, 'notice');
  await fails(() => call('distribute', ['EST-T1', 'Ben One'], { ...A, amount: '1000' }), /not protected.*live claim/);
  await fails(() => call('update-claim', ['EST-T1', 'late'], { ...A, status: 'withdrawn' }), /--note/);
  await call('update-claim', ['EST-T1', 'late'], { ...A, status: 'withdrawn', note: 'Withdrawn by letter' });
  const d1 = await call('distribute', ['EST-T1', 'Ben One'], { ...A, amount: '10000' });
  eq(d1.type, 'interim');
  await call('distribute', ['EST-T1', 'Kid Two'], { ...A, amount: '5000', 'to-trustee': 'Kid Two Trust' });
  eq((await call('history', ['EST-T1'])).estate.status, 'distributing');

  // A notice lapses three months after receipt unless filed or served (NZ).
  await call('record-claim', ['EST-T1'], { ...A, claimant: 'Old Notice', notice: shift(-120) });
  ok((await call('claims')).some((r) => r.claimant === 'Old Notice' && r.live === false), 'lapsed notice is not live');
  await call('update-claim', ['EST-T1', 'old notice'], { ...A, filed: shift(-100) });
  ok((await call('claims')).some((r) => r.claimant === 'Old Notice' && r.live === true), 'filed claim stays live');
  await call('update-claim', ['EST-T1', 'old notice'], { ...A, status: 'dismissed', note: 'Order dismissing claim' });

  // Early distribution with a recorded reason is allowed, then reported by compliance.
  const nsw = await call('add-estate', [], { ...A, ref: 'EST-T2', deceased: 'Nsw Person', died: shift(-100), jurisdiction: 'NSW' });
  eq(nsw.currency, 'AUD');
  await call('record-grant', ['EST-T2'], { ...A, date: shift(-50) });
  await call('add-beneficiary', ['EST-T2'], { ...A, name: 'Only Child', share: '100' });
  await call('check-identity', ['EST-T2', 'only'], { ...A, evidence: 'Licence sighted' });
  await call('add-asset', ['EST-T2'], { ...A, description: 'Cash', kind: 'bank', value: '2000' });
  await call('collect', ['EST-T2', 'cash'], { ...A, amount: '2000' });
  await fails(() => call('distribute', ['EST-T2', 'only'], { ...A, amount: '500' }), /no notice of intended distribution/);
  await call('distribute', ['EST-T2', 'only'], { ...A, amount: '500', reason: 'Hardship advance approved by counsel' });
  ok((await call('compliance')).some((r) => r.ref === 'EST-T2' && r.rule === 'distribution before protection' && r.finding.includes('Hardship')), 'early distribution reported with reason');
  await call('record-notice', ['EST-T2'], { ...A, kind: 'intended_distribution', date: shift(-40) });
  const w2 = (await call('windows')).find((r) => r.ref === 'EST-T2');
  ok(w2.protected_from > shift(60), 'NSW protection starts 6 months after death when that is later than the notice period');
  ok(w2.window_status === 'notice period running', 'NSW waits for 6 months after death');
  await call('add-estate', [], { ...A, ref: 'EST-T3', deceased: 'Vic Person', died: shift(-30), jurisdiction: 'VIC' });
  await call('record-grant', ['EST-T3'], { ...A, date: shift(-5) });
  eq((await call('windows')).find((r) => r.ref === 'EST-T3').window_status, 'rule not configured', 'unconfigured state is never guessed');

  // Tasks, notes, status, close.
  await call('add-task', ['EST-T1'], { ...A, title: 'Final accounts', due: shift(-1) });
  ok((await call('attention')).some((r) => r.ref === 'EST-T1' && r.item === 'task overdue'));
  await fails(() => call('close', ['EST-T1'], A), /cannot close/);
  await call('done', ['EST-T1', 'final accounts'], A);
  await call('log', ['EST-T1'], { ...A, note: 'Called the bank' });
  await call('status', ['EST-T1', 'administering'], A);
  await fails(() => call('status', ['EST-T1', 'closed'], A), /--status/);
  await call('pay', ['EST-T1', 'tax'], A);
  const [pt] = await call('position', [], { estate: 'EST-T1' });
  await call('distribute', ['EST-T1', 'Ben One'], { ...A, amount: String((Number(pt.cash_held_cents) * 0.6 / 100).toFixed(2)), type: 'final' });
  const [pt2] = await call('position', [], { estate: 'EST-T1' });
  await call('distribute', ['EST-T1', 'Kid Two'], { ...A, amount: String((Number(pt2.cash_held_cents) / 100).toFixed(2)), type: 'final', 'to-trustee': 'Kid Two Trust' });
  eq((await call('close', ['EST-T1'], A)).status, 'closed');
  await fails(() => call('distribute', ['EST-T1', 'Ben One'], { ...A, amount: '1' }), /closed/);
  ok((await call('history', ['EST-T1'])).activity.length > 15, 'every write logged');

  // Specific gifts transfer instead of collecting.
  await fails(() => call('transfer', ['EST-001', 'share portfolio'], A), /not a specific gift/);
  eq((await call('transfer', ['EST-001', 'watch'], A)).status, 'transferred');

  // Import from the Estateably inventory export (saved as CSV).
  const file = path.join(REPO_ROOT, 'examples', 'estateably-inventory.csv');
  const map = path.join(REPO_ROOT, 'examples', 'column-map.json');
  eq((await call('import', ['estateably', file], { ...A, estate: 'EST-004', 'dry-run': true })).added, 3, 'dry run counts');
  eq((await call('assets', [], { estate: 'EST-004' })).length, 1, 'dry run rolled back');
  eq((await call('import', ['estateably', file], { ...A, estate: 'EST-004', map })).added, 3);
  eq((await call('import', ['estateably', file], { ...A, estate: 'EST-004' })).skipped, 3, 'repeat import skipped');
  const imported = await call('assets', [], { estate: 'EST-004' });
  eq(imported.find((r) => r.description === 'Managed fund').kind, 'shares', 'category mapped');
  eq(imported.find((r) => r.description === 'Household contents').dod_value_cents, null, 'blank value stays unknown');
  eq(Number(imported.find((r) => r.description === 'Savings account' && r.institution === 'Harbour Bank' && r.dod_value_cents === 421033)?.dod_value_cents), 421033, 'quoted amount parsed');
  const conflict = path.join(root, 'conflict.csv');
  writeFileSync(conflict, 'Description,Account Number,Date of Death Value\nFresh item,,10\nManaged fund,KF-30021,99999\n');
  await fails(() => call('import', ['estateably', conflict], { ...A, estate: 'EST-004' }), /conflict/);
  ok(!(await call('assets', [], { estate: 'EST-004' })).some((r) => r.description === 'Fresh item'), 'conflict rolls back the whole file');
  const dup = path.join(root, 'dup.csv');
  writeFileSync(dup, 'Description,Account Number\nA,1\na,1\n');
  await fails(() => call('import', ['estateably', dup], { ...A, estate: 'EST-004' }), /Duplicate/);
  await fails(() => call('import', ['other', file], A), /Usage/);

  // Helpers.
  assert.throws(() => date('2026-13-01', 'date'), /valid/);
  assert.throws(() => cents('12.345', 'amount'), /amount/);
  eq(cents('$1,234.5', 'amount'), 123450);
  assert.throws(() => parseCsv('x,x\n1,2'), /unique/);
  ok(parseCsv('﻿x,y\r\n"a,b","c""d"\r\n')[0].y === 'c"d', 'CSV quoting');

  // Drafts are written locally and say nothing was sent.
  for (const [cmd, args] of [['draft-institution-letter', ['EST-002', 'house']], ['draft-beneficiary-update', ['EST-001']], ['weekly-review', []]]) {
    const { file: out } = await call(cmd, args);
    ok(existsSync(out), `${cmd} wrote a file`);
    ok(readFileSync(out, 'utf8').includes('Nothing sent'), `${cmd} is a draft`);
  }

  // Export, append-only history, read-only views, and unrelated roles see nothing.
  const archive = await call('export');
  ok(archive.estates.length === 8 && archive.activity.length > 20, 'export holds everything');
  const exportPath = path.join(root, 'export.json');
  await call('export', [], { out: exportPath });
  await fails(() => call('export', [], { out: exportPath }), /EEXIST/);
  await fails(() => db.exec("update activity set actor = 'rewrite'"), /Append-only/);
  await fails(() => db.exec('delete from activity'), /Append-only/);
  await db.exec('begin read only');
  await fails(() => db.query("insert into tasks (estate_id, title) select id, 'x' from estates limit 1"), /read.only/i);
  await db.exec('rollback');
  await db.exec('create role estates_reader');
  await db.exec('grant usage on schema public to estates_reader');
  await db.exec('grant select on estates, v_position to estates_reader');
  await db.exec('set role estates_reader');
  eq((await db.query('select * from estates')).length, 0, 'row security hides estates from an unrelated role');
  await fails(() => db.query('select * from v_windows'), /permission denied/);
  await db.exec('reset role');
  await db.close();
  db = null;

  // The CLI, views and documents, run as a person would.
  const shell = (script, args = [], expect = 0) => {
    const r = spawnSync(process.execPath, [script, ...args], { cwd: REPO_ROOT, env: process.env, encoding: 'utf8' });
    assert.equal(r.status, expect, r.stdout + r.stderr);
    checks++;
    return r;
  };
  eq(JSON.parse(shell('scripts/estates.mjs', ['estates', '--json']).stdout).length, 8);
  ok(shell('scripts/estates.mjs', ['history', 'e'], 1).stderr.includes('ambiguous'));
  ok(shell('scripts/estates.mjs', ['attention', '--nope'], 1).stderr.includes('Unknown option'));
  ok(shell('scripts/estates.mjs', ['--help']).stdout.includes('distribute'));
  ok(shell('scripts/estates.mjs', ['history', 'EST-001']).stdout.includes('Margaret Ellen Hart'));
  ok(shell('scripts/estates.mjs', ['insights']).stdout.includes('10. '));
  for (const s of ['scripts/view.mjs', 'scripts/docs.mjs']) shell(s);
  const week = readFileSync(path.join(root, 'out', 'views', 'week.html'), 'utf8');
  ok(week.includes('EST-002') && week.includes('claim notice lapses soon'), 'week view rendered');
  ok(readdirSync(path.join(root, 'out', 'docs-out', 'estate-accounts')).length === 8, 'estate accounts for every estate');
  const accounts = readdirSync(path.join(root, 'out', 'docs-out', 'estate-accounts')).find((f) => f.includes('est-001'));
  ok(readFileSync(path.join(root, 'out', 'docs-out', 'estate-accounts', accounts), 'utf8').includes('84,210.55'), 'accounts show the receipts');
  const { table } = await import('./lib/render.mjs');
  ok(table([{ name: '<script>alert(1)</script>' }]).includes('&lt;script&gt;'), 'HTML escaped');

  // Every command has a recipe, and every recipe names a real command.
  const recipes = readdirSync(path.join(REPO_ROOT, '.claude', 'commands')).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => f.slice(0, -3));
  for (const c of commands) ok(recipes.includes(c), `/${c} recipe exists`);
  ok(recipes.length >= commands.length, 'recipes cover the CLI');

  console.log(`PASS: ${checks} checks (${commands.length} CLI commands, ${recipes.length} slash commands): migrations, reads, writes, distribution gates, claims, import rollback, drafts, export, row security and rendering.`);
} finally {
  await db?.close();
  rmSync(root, { recursive: true, force: true });
}
