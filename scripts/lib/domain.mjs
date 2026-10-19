// The rules of the estate administration desk. scripts/estates.mjs is a thin shell over run().
// Every write names an actor and leaves a row in the append-only activity log.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './db.mjs';
import { parseCsv, pick } from './csv.mjs';
import { money } from './format.mjs';

export const today = () => new Date().toISOString().slice(0, 10);

export function date(v, label) {
  const s = String(v ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw Error(`--${label} must be a valid date (YYYY-MM-DD)`);
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw Error(`--${label} must be a valid date (YYYY-MM-DD)`);
  return s;
}

// "12,345.60" or "$12345.6" -> 1234560 cents. Never guesses at a blank.
export function cents(v, label) {
  const s = String(v ?? '').replace(/[$,\s]/g, '').replace(/^(NZD|AUD|USD)/i, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw Error(`--${label} must be an amount like 1234.56`);
  return Math.round(parseFloat(s) * 100);
}

function need(flags, ...keys) {
  for (const k of keys) if (flags[k] === undefined || flags[k] === true || String(flags[k]).trim() === '') throw Error(`--${k} is required`);
}
function oneOf(v, allowed, label) {
  if (!allowed.includes(v)) throw Error(`--${label} must be one of: ${allowed.join(', ')}`);
  return v;
}

async function tx(db, fn) {
  await db.exec('begin');
  try { const r = await fn(); await db.exec('commit'); return r; } catch (e) { await db.exec('rollback'); throw e; }
}
async function note(db, estateId, actor, action, detail) {
  await db.query('insert into activity (estate_id, actor, action, detail) values ($1,$2,$3,$4)', [estateId, actor, action, detail]);
}

// Resolve one record from a reference, id prefix or name. Exact (case-insensitive) beats partial;
// more than one partial match lists the candidates and fails.
function choose(rows, term, what, label) {
  const t = String(term ?? '').trim().toLowerCase();
  if (!t) throw Error(`Name the ${what}`);
  const exact = rows.filter((r) => label(r).some((x) => String(x).toLowerCase() === t));
  if (exact.length === 1) return exact[0];
  const partial = exact.length ? exact : rows.filter((r) => label(r).some((x) => String(x).toLowerCase().includes(t)));
  if (partial.length === 1) return partial[0];
  if (!partial.length) throw Error(`${what} "${term}" not found`);
  throw Error(`"${term}" is ambiguous: ${partial.map((r) => label(r).filter(Boolean).slice(0, 2).join(' / ')).join('; ')}`);
}
export async function estate(db, term) {
  const rows = await db.query('select * from estates order by ref');
  return choose(rows, term, 'Estate', (r) => [r.ref, r.deceased_name, r.id]);
}
async function beneficiary(db, e, term) {
  const rows = await db.query('select * from beneficiaries where estate_id = $1 order by name', [e.id]);
  return choose(rows, term, 'Beneficiary', (r) => [r.name, r.id]);
}
async function asset(db, e, term) {
  const rows = await db.query('select * from assets where estate_id = $1 order by description', [e.id]);
  return choose(rows, term, 'Asset', (r) => [r.description, r.id, r.account_ref]);
}
async function liability(db, e, term) {
  const rows = await db.query('select * from liabilities where estate_id = $1 order by creditor', [e.id]);
  return choose(rows, term, 'Liability', (r) => [r.creditor, r.id, r.description]);
}
async function claim(db, e, term) {
  const rows = await db.query('select * from claims where estate_id = $1 order by created_at', [e.id]);
  return choose(rows, term, 'Claim', (r) => [r.claimant, r.id]);
}

const filterEstate = async (db, flags) => (flags.estate ? (await estate(db, flags.estate)).id : null);

// ------------------------------------------------------------------ reads

export const reads = {
  async estates(db) {
    return db.query(`select e.ref, e.deceased_name as deceased, e.jurisdiction as juris, e.status, e.responsible,
        e.date_of_death as died, e.grant_date as grant, w.window_status, p.assets_to_collect as to_collect, p.currency,
        p.cash_held_cents as cash_held_cents
      from estates e join v_windows w on w.estate_id = e.id join v_position p on p.estate_id = e.id
      order by e.status = 'closed', e.ref`);
  },
  async attention(db) {
    return db.query(`select ref, owner, item, detail, date,
        case when days < 0 then 'in ' || -days || ' days' when days = 0 then 'today' else days || ' days ago' end as timing
      from v_attention
      order by case item when 'claim notice lapses soon' then 0 when 'task overdue' then 1 when 'asset not collected' then 2
        when 'no grant yet' then 3 when 'ready to distribute' then 4 when 'task due this week' then 5 else 6 end, days desc, ref`);
  },
  async windows(db) {
    return db.query(`select ref, deceased_name as deceased, jurisdiction as juris, grant_date as grant, protected_from,
        claim_period_ends, distribution_notice_on as notice, live_claims, window_status
      from v_windows where status <> 'closed' order by ref`);
  },
  async position(db, args, flags) {
    const id = await filterEstate(db, flags);
    return db.query(`select ref, deceased_name as deceased, currency, dod_assets_cents, receipts_cents, payments_cents,
        distributed_cents, cash_held_cents, unpaid_liabilities_cents, assets_to_collect
      from v_position where ($1::uuid is null or estate_id = $1) and (status <> 'closed' or $1::uuid is not null) order by ref`, [id]);
  },
  async assets(db, args, flags) {
    const id = await filterEstate(db, flags);
    return db.query(`select e.ref, a.description, a.kind, a.institution, a.status, e.currency, a.dod_value_cents, a.realised_cents,
        a.passes_outside_estate as outside_estate, b.name as gift_to
      from assets a join estates e on e.id = a.estate_id left join beneficiaries b on b.id = a.specific_gift_to
      where ($1::uuid is null or e.id = $1) and (e.status <> 'closed' or $1::uuid is not null) order by e.ref, a.description`, [id]);
  },
  async liabilities(db, args, flags) {
    const id = await filterEstate(db, flags);
    return db.query(`select e.ref, l.creditor, l.description, l.kind, l.status, e.currency, l.amount_cents, l.paid_on
      from liabilities l join estates e on e.id = l.estate_id
      where ($1::uuid is null or e.id = $1) and (e.status <> 'closed' or $1::uuid is not null) order by e.ref, l.status = 'paid', l.creditor`, [id]);
  },
  async beneficiaries(db, args, flags) {
    const id = await filterEstate(db, flags);
    return db.query(`select e.ref, b.name, b.relationship, round(b.residuary_share_bps / 100.0, 2) as share_pct, b.specific_gift,
        b.is_minor as minor, b.identity_checked as id_checked, e.currency,
        coalesce((select sum(amount_cents) from ledger l where l.beneficiary_id = b.id), 0) as received_cents
      from beneficiaries b join estates e on e.id = b.estate_id
      where ($1::uuid is null or e.id = $1) and (e.status <> 'closed' or $1::uuid is not null) order by e.ref, b.name`, [id]);
  },
  async claims(db) {
    return db.query(`select ref, claimant, kind, status, notice_received_on as notice, filed_on as filed, served_on as served, lapses_on, live
      from v_claims_live order by live desc, ref`);
  },
  async tasks(db, args, flags) {
    const id = await filterEstate(db, flags);
    return db.query(`select e.ref, t.title, t.owner, t.due_on, case when t.due_on < current_date then current_date - t.due_on else 0 end as days_late
      from tasks t join estates e on e.id = t.estate_id
      where t.done_on is null and ($1::uuid is null or e.id = $1) order by t.due_on nulls last`, [id]);
  },
  async ledger(db, args, flags) {
    need(flags, 'estate');
    const e = await estate(db, flags.estate);
    return db.query(`select l.occurred_on as date, l.kind, l.description, coalesce(b.name, '') as beneficiary,
        coalesce(l.distribution_type, '') as type, $2::text as currency, l.amount_cents
      from ledger l left join beneficiaries b on b.id = l.beneficiary_id where l.estate_id = $1 order by l.occurred_on, l.created_at`, [e.id, e.currency]);
  },
  async compliance(db) { return compliance(db); },
  async insights(db) { return runInsights(db); },
};

export async function compliance(db) {
  const rows = [];
  const add = (ref, rule, severity, finding, source) => rows.push({ ref, rule, severity, finding, source });
  const NZ = 'Administration Act 1969 (NZ) ss 47-49';
  const NSW = 'Succession Act 2006 (NSW) s 58; Probate and Administration Act 1898 (NSW) s 92; UCPR Form 114';
  // Distributions made before the protection date, or while a claim notice was live.
  const early = await db.query(`select e.ref, e.jurisdiction, l.occurred_on, l.distribution_type, b.name, w.protected_from, l.override_reason
      from ledger l join estates e on e.id = l.estate_id join beneficiaries b on b.id = l.beneficiary_id
      join v_windows w on w.estate_id = e.id
      where l.kind = 'distribution' and e.jurisdiction in ('NZ','NSW') and l.distribution_type <> 'specific_gift'
        and (w.protected_from is null or l.occurred_on < w.protected_from)`);
  for (const r of early) add(r.ref, 'distribution before protection', 'breach',
    `${r.distribution_type} distribution to ${r.name} on ${r.occurred_on}; protected from ${r.protected_from ?? 'not yet established'}${r.override_reason ? `; recorded reason: ${r.override_reason}` : ''}`,
    r.jurisdiction === 'NZ' ? NZ : NSW);
  const live = await db.query(`select ref, claimant, kind, lapses_on, filed_on, served_on from v_claims_live where live`);
  for (const r of live) add(r.ref, 'live claim', 'hold',
    r.lapses_on ? `${r.claimant} (${r.kind}): notice lapses ${r.lapses_on} unless filed or served first` : `${r.claimant} (${r.kind}): filed or served, no distribution until resolved`, NZ);
  const w = await db.query(`select * from v_windows where status <> 'closed'`);
  for (const r of w) {
    if (r.window_status === 'no notice of intended distribution') add(r.ref, 'notice of intended distribution', 'due', 'No notice published: distribution is not protected until 30 days after publication and 6 months after death', NSW);
    if (r.window_status === 'rule not configured') add(r.ref, 'jurisdiction', 'unknown', `${r.jurisdiction} rules are not configured: confirm the rule and add it to docs/compliance.md`, 'docs/compliance.md');
    if (r.window_status === 'no grant recorded') add(r.ref, 'grant', 'due', 'No grant date recorded: protection periods cannot start', r.jurisdiction === 'NZ' ? NZ : NSW);
    if (r.claim_period_ends && r.claim_period_ends >= today()) add(r.ref, 'claim period', 'note', `Claims period runs to ${r.claim_period_ends}${r.jurisdiction === 'NZ' ? ' (2 years from grant for an administrator applying for a minor or person lacking capacity)' : ''}`, r.jurisdiction === 'NZ' ? NZ : NSW);
  }
  const shares = await db.query(`select e.ref, sum(b.residuary_share_bps) as total from estates e join beneficiaries b on b.estate_id = e.id
      where e.status <> 'closed' group by e.ref having sum(b.residuary_share_bps) <> 10000`);
  for (const r of shares) add(r.ref, 'residuary shares', 'breach', `Residuary shares add to ${(Number(r.total) / 100).toFixed(2)}%, not 100%`, 'Local check against the will');
  const solvency = await db.query(`select ref, currency, cash_held_cents, unpaid_liabilities_cents, distributed_cents from v_position
      where status <> 'closed' and distributed_cents > 0 and unpaid_liabilities_cents > cash_held_cents`);
  for (const r of solvency) add(r.ref, 'debts before beneficiaries', 'breach', `Distributed ${money(r.distributed_cents, r.currency)} while unpaid debts exceed cash held`, 'Local check: debts are paid before beneficiaries');
  const minors = await db.query(`select e.ref, b.name from beneficiaries b join estates e on e.id = b.estate_id
      where b.is_minor and e.status in ('administering','distributing')`);
  for (const r of minors) add(r.ref, 'minor beneficiary', 'note', `${r.name} is a minor: the share is held on trust, not paid out`, 'Local check against the will');
  const ids = await db.query(`select e.ref, b.name from beneficiaries b join estates e on e.id = b.estate_id
      where not b.identity_checked and not b.is_minor and e.status in ('administering','distributing')`);
  for (const r of ids) add(r.ref, 'identity check', 'due', `${r.name}: identity not recorded as checked before distribution`, 'Local check');
  const order = { breach: 0, hold: 1, due: 2, unknown: 3, note: 4 };
  return rows.sort((a, b) => order[a.severity] - order[b.severity] || a.ref.localeCompare(b.ref));
}

// ------------------------------------------------------------------ ten questions

export const insights = [
  ['Which estates could distribute today, and how much is free after the unpaid debts?', `
    select w.ref, w.protected_from, p.currency, p.cash_held_cents, p.unpaid_liabilities_cents,
      p.cash_held_cents - p.unpaid_liabilities_cents as free_cents, p.distributed_cents
    from v_windows w join v_position p on p.estate_id = w.estate_id
    where w.window_status = 'protected' and p.cash_held_cents > p.unpaid_liabilities_cents
    order by free_cents desc`],
  ['Which assets are still uncollected more than 90 days after the grant?', `
    select e.ref, a.description, a.institution, a.status, current_date - e.grant_date as days_since_grant
    from assets a join estates e on e.id = a.estate_id
    where e.grant_date is not null and current_date - e.grant_date > 90 and not a.passes_outside_estate
      and a.status in ('identified','notified','valued') and e.status <> 'closed' order by days_since_grant desc`],
  ['Which claim notices are live, and when does each lapse?', `
    select ref, claimant, kind, notice_received_on, lapses_on, case when lapses_on is null then null else lapses_on - current_date end as days_left
    from v_claims_live where live order by lapses_on nulls last`],
  ['Which open estates are past their claims period but not yet finalised?', `
    select w.ref, w.claim_period_ends, w.status, p.currency, p.cash_held_cents
    from v_windows w join v_position p on p.estate_id = w.estate_id
    where w.claim_period_ends < current_date and w.status <> 'closed' order by w.claim_period_ends`],
  ['Which minor beneficiaries have a share in an estate that is administering or distributing?', `
    select e.ref, b.name, round(b.residuary_share_bps / 100.0, 2) as share_pct, e.status
    from beneficiaries b join estates e on e.id = b.estate_id where b.is_minor and e.status in ('administering','distributing')`],
  ['Which open estates have residuary shares that do not add to 100%?', `
    select e.ref, round(sum(b.residuary_share_bps) / 100.0, 2) as total_pct
    from estates e join beneficiaries b on b.estate_id = e.id where e.status <> 'closed'
    group by e.ref having sum(b.residuary_share_bps) <> 10000`],
  ['How much cash is held across open estates, by responsible person?', `
    select responsible, currency, count(*)::int as estates, sum(cash_held_cents) as cash_held_cents
    from v_position where status <> 'closed' group by responsible, currency order by sum(cash_held_cents) desc`],
  ['Which estates have unpaid debts after a distribution was made?', `
    select p.ref, l.creditor, l.status, p.currency, l.amount_cents
    from v_position p join liabilities l on l.estate_id = p.estate_id
    where p.distributed_cents > 0 and l.status in ('notified','agreed','disputed') and p.status <> 'closed' order by p.ref`],
  ['Which open files have had no recorded activity for 30 days?', `
    select ref, responsible, last_activity_on, current_date - last_activity_on as days_quiet
    from v_position where status <> 'closed' and current_date - last_activity_on > 30 order by days_quiet desc`],
  ['Which assets realised less than their date-of-death value, and by how much?', `
    select e.ref, a.description, e.currency, a.dod_value_cents, a.realised_cents, a.dod_value_cents - a.realised_cents as shortfall_cents
    from assets a join estates e on e.id = a.estate_id
    where a.realised_cents is not null and a.dod_value_cents is not null and a.realised_cents < a.dod_value_cents order by shortfall_cents desc`],
];
async function runInsights(db) {
  const out = [];
  for (const [question, sql] of insights) out.push({ question, rows: await db.query(sql) });
  return out;
}

// ------------------------------------------------------------------ writes

const ESTATE_STATUS = ['intake', 'grant_pending', 'collecting', 'administering', 'distributing', 'closed'];
const JURIS = ['NZ', 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
const ASSET_KINDS = ['bank', 'property', 'shares', 'kiwisaver', 'superannuation', 'vehicle', 'chattels', 'debt_owed', 'insurance', 'business', 'other'];
const LIAB_KINDS = ['funeral', 'tax', 'debt', 'mortgage', 'credit_card', 'expense', 'professional_fees', 'other'];
const CLAIM_KINDS = ['family_protection', 'testamentary_promises', 'relationship_property', 'family_provision', 'creditor', 'other'];

const writes = {
  async 'add-estate'(db, args, f) {
    need(f, 'actor', 'ref', 'deceased', 'died');
    const juris = oneOf(String(f.jurisdiction || 'NZ').toUpperCase(), JURIS, 'jurisdiction');
    const currency = String(f.currency || (juris === 'NZ' ? 'NZD' : 'AUD')).toUpperCase();
    return tx(db, async () => {
      if ((await db.query('select 1 from estates where lower(ref) = lower($1)', [f.ref])).length) throw Error(`Estate ${f.ref} already exists (refs are unique)`);
      const [e] = await db.query(`insert into estates (ref, deceased_name, date_of_death, jurisdiction, grant_type, will_date, executors, responsible, currency, status)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'intake') returning *`,
        [f.ref, f.deceased, date(f.died, 'died'), juris, oneOf(f['grant-type'] || 'probate', ['probate', 'letters_of_administration', 'no_grant'], 'grant-type'),
         f['will-date'] ? date(f['will-date'], 'will-date') : null, f.executors || '', f.responsible || f.actor, currency]);
      await note(db, e.id, f.actor, 'add-estate', `${e.ref} opened for ${e.deceased_name}`);
      return e;
    });
  },
  async 'record-grant'(db, [term], f) {
    need(f, 'actor', 'date');
    const e = await estate(db, term);
    const d = date(f.date, 'date');
    if (d < e.date_of_death) throw Error('The grant cannot be dated before the death');
    if (d > today()) throw Error('The grant date cannot be in the future');
    return tx(db, async () => {
      const [r] = await db.query(`update estates set grant_date = $2, status = case when status in ('intake','grant_pending') then 'collecting' else status end where id = $1 returning *`, [e.id, d]);
      await note(db, e.id, f.actor, 'record-grant', `Grant dated ${d}`);
      return r;
    });
  },
  async status(db, [term, next], f) {
    need(f, 'actor');
    const e = await estate(db, term);
    oneOf(next, ESTATE_STATUS.filter((s) => s !== 'closed'), 'status');
    return tx(db, async () => {
      const [r] = await db.query('update estates set status = $2 where id = $1 returning ref, status', [e.id, next]);
      await note(db, e.id, f.actor, 'status', `${e.status} -> ${next}`);
      return r;
    });
  },
  async 'add-beneficiary'(db, [term], f) {
    need(f, 'actor', 'name');
    const e = await estate(db, term);
    const bps = f.share === undefined ? 0 : Math.round(Number(f.share) * 100);
    if (!Number.isFinite(bps) || bps < 0 || bps > 10000) throw Error('--share must be a percentage between 0 and 100');
    return tx(db, async () => {
      const [{ total }] = await db.query('select coalesce(sum(residuary_share_bps), 0)::int as total from beneficiaries where estate_id = $1', [e.id]);
      if (total + bps > 10000) throw Error(`Residuary shares would add to ${(total + bps) / 100}%`);
      const [b] = await db.query(`insert into beneficiaries (estate_id, name, relationship, residuary_share_bps, specific_gift, is_minor, contact)
        values ($1,$2,$3,$4,$5,$6,$7) returning *`, [e.id, f.name, f.relationship || '', bps, f.gift || '', f.minor === true || f.minor === 'yes', f.contact || '']);
      await note(db, e.id, f.actor, 'add-beneficiary', `${b.name} ${bps / 100}%`);
      return b;
    });
  },
  async 'check-identity'(db, [term, who], f) {
    need(f, 'actor', 'evidence');
    const e = await estate(db, term);
    const b = await beneficiary(db, e, who);
    return tx(db, async () => {
      await db.query('update beneficiaries set identity_checked = true where id = $1', [b.id]);
      await note(db, e.id, f.actor, 'check-identity', `${b.name}: ${f.evidence}`);
      return { estate: e.ref, beneficiary: b.name, identity_checked: true };
    });
  },
  async 'add-asset'(db, [term], f) {
    need(f, 'actor', 'description');
    const e = await estate(db, term);
    const kind = oneOf(f.kind || 'other', ASSET_KINDS, 'kind');
    const gift = f['gift-to'] ? (await beneficiary(db, e, f['gift-to'])).id : null;
    return tx(db, async () => {
      const [a] = await db.query(`insert into assets (estate_id, description, kind, institution, account_ref, dod_value_cents, passes_outside_estate, specific_gift_to)
        values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
        [e.id, f.description, kind, f.institution || '', f.account || '', f.value === undefined ? null : cents(f.value, 'value'), f.outside === true || f.outside === 'yes', gift]);
      await note(db, e.id, f.actor, 'add-asset', `${a.description}${a.dod_value_cents !== null ? ` valued ${money(a.dod_value_cents, e.currency)} at death` : ', value unknown'}`);
      return a;
    });
  },
  async notify(db, [term, what], f) {
    need(f, 'actor');
    const e = await estate(db, term);
    const a = await asset(db, e, what);
    const on = f.date ? date(f.date, 'date') : today();
    return tx(db, async () => {
      await db.query(`update assets set notified_on = $2, status = case when status = 'identified' then 'notified' else status end where id = $1`, [a.id, on]);
      await note(db, e.id, f.actor, 'notify', `${a.description}: ${a.institution || 'holder'} notified ${on}`);
      return { estate: e.ref, asset: a.description, notified_on: on };
    });
  },
  // Money in: an asset collected or sold, recorded as a receipt in the estate account.
  async collect(db, [term, what], f) {
    need(f, 'actor', 'amount');
    const e = await estate(db, term);
    const a = await asset(db, e, what);
    if (a.passes_outside_estate) throw Error(`${a.description} passes outside the estate: it is not collected into the estate account`);
    if (['collected', 'sold', 'transferred'].includes(a.status)) throw Error(`${a.description} is already ${a.status}`);
    const amount = cents(f.amount, 'amount');
    const on = f.date ? date(f.date, 'date') : today();
    if (amount === 0) throw Error('--amount must be more than zero. If nothing was realised, record why with log');
    return tx(db, async () => {
      const status = f.sold ? 'sold' : 'collected';
      await db.query('update assets set status = $2, realised_cents = $3, realised_on = $4 where id = $1', [a.id, status, amount, on]);
      await db.query(`insert into ledger (estate_id, occurred_on, kind, description, amount_cents, asset_id) values ($1,$2,'receipt',$3,$4,$5)`,
        [e.id, on, f.note || `${a.description} ${status}`, amount, a.id]);
      await note(db, e.id, f.actor, 'collect', `${a.description} ${status}: ${money(amount, e.currency)}`);
      return { estate: e.ref, asset: a.description, status, realised: money(amount, e.currency) };
    });
  },
  async transfer(db, [term, what], f) {
    need(f, 'actor');
    const e = await estate(db, term);
    const a = await asset(db, e, what);
    if (!a.specific_gift_to) throw Error(`${a.description} is not a specific gift; collect or sell it instead`);
    const on = f.date ? date(f.date, 'date') : today();
    return tx(db, async () => {
      await db.query(`update assets set status = 'transferred', realised_on = $2 where id = $1`, [a.id, on]);
      await note(db, e.id, f.actor, 'transfer', `${a.description} handed to the named beneficiary ${on}`);
      return { estate: e.ref, asset: a.description, status: 'transferred' };
    });
  },
  async 'add-liability'(db, [term], f) {
    need(f, 'actor', 'creditor', 'amount');
    const e = await estate(db, term);
    return tx(db, async () => {
      const [l] = await db.query(`insert into liabilities (estate_id, creditor, description, kind, amount_cents) values ($1,$2,$3,$4,$5) returning *`,
        [e.id, f.creditor, f.description || '', oneOf(f.kind || 'debt', LIAB_KINDS, 'kind'), cents(f.amount, 'amount')]);
      await note(db, e.id, f.actor, 'add-liability', `${l.creditor} ${money(l.amount_cents, e.currency)}`);
      return l;
    });
  },
  // Money out: a debt or expense paid from the estate account.
  async pay(db, [term, who], f) {
    need(f, 'actor');
    const e = await estate(db, term);
    const l = await liability(db, e, who);
    if (l.status === 'paid') throw Error(`${l.creditor} is already paid`);
    if (l.status === 'disputed' && !f.reason) throw Error(`${l.creditor} is disputed: give --reason to pay it anyway`);
    const amount = f.amount ? cents(f.amount, 'amount') : Number(l.amount_cents);
    const on = f.date ? date(f.date, 'date') : today();
    return tx(db, async () => {
      const [p] = await db.query('select cash_held_cents from v_position where estate_id = $1', [e.id]);
      if (Number(p.cash_held_cents) < amount) throw Error(`Cash held is ${money(p.cash_held_cents, e.currency)}: not enough to pay ${money(amount, e.currency)}`);
      await db.query(`update liabilities set status = 'paid', paid_on = $2, amount_cents = $3 where id = $1`, [l.id, on, amount]);
      await db.query(`insert into ledger (estate_id, occurred_on, kind, description, amount_cents, liability_id) values ($1,$2,'payment',$3,$4,$5)`,
        [e.id, on, `${l.creditor} paid`, amount, l.id]);
      await note(db, e.id, f.actor, 'pay', `${l.creditor} paid ${money(amount, e.currency)}${f.reason ? ` (${f.reason})` : ''}`);
      return { estate: e.ref, creditor: l.creditor, paid: money(amount, e.currency) };
    });
  },
  async expense(db, [term], f) {
    need(f, 'actor', 'description', 'amount');
    const e = await estate(db, term);
    const amount = cents(f.amount, 'amount');
    const on = f.date ? date(f.date, 'date') : today();
    return tx(db, async () => {
      const [p] = await db.query('select cash_held_cents from v_position where estate_id = $1', [e.id]);
      if (Number(p.cash_held_cents) < amount) throw Error(`Cash held is ${money(p.cash_held_cents, e.currency)}: not enough to pay ${money(amount, e.currency)}`);
      await db.query(`insert into ledger (estate_id, occurred_on, kind, description, amount_cents) values ($1,$2,'payment',$3,$4)`, [e.id, on, f.description, amount]);
      await note(db, e.id, f.actor, 'expense', `${f.description} ${money(amount, e.currency)}`);
      return { estate: e.ref, paid: money(amount, e.currency), description: f.description };
    });
  },
  async 'record-claim'(db, [term], f) {
    need(f, 'actor', 'claimant');
    const e = await estate(db, term);
    const notice = f.notice ? date(f.notice, 'notice') : null;
    const filed = f.filed ? date(f.filed, 'filed') : null;
    const served = f.served ? date(f.served, 'served') : null;
    if (!notice && !filed && !served) throw Error('Give --notice, --filed or --served (the date the estate learned of the claim)');
    return tx(db, async () => {
      const [c] = await db.query(`insert into claims (estate_id, claimant, kind, notice_received_on, filed_on, served_on, status, notes)
        values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
        [e.id, f.claimant, oneOf(f.kind || 'family_protection', CLAIM_KINDS, 'kind'), notice, filed, served, filed || served ? 'filed' : 'notice', f.note || '']);
      await note(db, e.id, f.actor, 'record-claim', `${c.claimant} (${c.kind})`);
      return c;
    });
  },
  async 'update-claim'(db, [term, who], f) {
    need(f, 'actor');
    const e = await estate(db, term);
    const c = await claim(db, e, who);
    const status = f.status ? oneOf(f.status, ['filed', 'settled', 'dismissed', 'withdrawn'], 'status') : c.status;
    const filed = f.filed ? date(f.filed, 'filed') : c.filed_on;
    const served = f.served ? date(f.served, 'served') : c.served_on;
    const resolved = ['settled', 'dismissed', 'withdrawn'].includes(status) ? (f.date ? date(f.date, 'date') : today()) : null;
    if (resolved && !f.note) throw Error('--note is required to resolve a claim (the order, settlement or withdrawal relied on)');
    return tx(db, async () => {
      const [r] = await db.query(`update claims set status = $2, filed_on = $3, served_on = $4, resolved_on = $5,
          notes = case when $6::text is null then notes else trim(notes || ' ' || $6) end where id = $1 returning *`,
        [c.id, (filed || served) && status === 'notice' ? 'filed' : status, filed, served, resolved, f.note || null]);
      await note(db, e.id, f.actor, 'update-claim', `${c.claimant}: ${r.status}${f.note ? ` (${f.note})` : ''}`);
      return r;
    });
  },
  async 'record-notice'(db, [term], f) {
    need(f, 'actor', 'kind', 'date');
    const e = await estate(db, term);
    const kind = oneOf(f.kind, ['intended_distribution', 'creditor_notice', 'institution_letter', 'other'], 'kind');
    const days = f.days === undefined ? (kind === 'intended_distribution' ? 30 : 0) : Number(f.days);
    if (!Number.isInteger(days) || days < 0) throw Error('--days must be a whole number');
    return tx(db, async () => {
      const [n] = await db.query('insert into notices (estate_id, kind, published_on, period_days, reference) values ($1,$2,$3,$4,$5) returning *',
        [e.id, kind, date(f.date, 'date'), days, f.reference || '']);
      await note(db, e.id, f.actor, 'record-notice', `${kind} ${n.published_on}${days ? `, ${days} days` : ''}`);
      return n;
    });
  },
  // Money to beneficiaries. Refuses outside the protection window unless a reason is recorded,
  // refuses to leave less cash than the unpaid debts, and never pays a minor's share out.
  async distribute(db, [term, who], f) {
    need(f, 'actor', 'amount');
    const e = await estate(db, term);
    const b = await beneficiary(db, e, who);
    const type = oneOf(f.type || 'interim', ['interim', 'final', 'specific_gift'], 'type');
    const amount = cents(f.amount, 'amount');
    const on = f.date ? date(f.date, 'date') : today();
    if (e.status === 'closed') throw Error(`${e.ref} is closed`);
    if (b.is_minor && !f['to-trustee']) throw Error(`${b.name} is a minor: record who holds the share on trust with --to-trustee="<name>"`);
    if (!b.identity_checked && !b.is_minor) throw Error(`${b.name}: record the identity check first (check-identity)`);
    return tx(db, async () => {
      const [w] = await db.query('select * from v_windows where estate_id = $1', [e.id]);
      if (w.window_status !== 'protected' && !f.reason) throw Error(`${e.ref} is not protected for distribution (${w.window_status}). Record --reason="<the advice relied on>" to proceed`);
      const [p] = await db.query('select * from v_position where estate_id = $1', [e.id]);
      const left = Number(p.cash_held_cents) - amount;
      if (left < 0) throw Error(`Cash held is ${money(p.cash_held_cents, e.currency)}: not enough to distribute ${money(amount, e.currency)}`);
      if (left < Number(p.unpaid_liabilities_cents)) throw Error(`Distribution would leave ${money(left, e.currency)}, less than unpaid debts of ${money(p.unpaid_liabilities_cents, e.currency)}`);
      const desc = `${type === 'specific_gift' ? 'Specific gift' : type[0].toUpperCase() + type.slice(1) + ' distribution'}${b.is_minor ? ` held by ${f['to-trustee']} on trust` : ''}`;
      await db.query(`insert into ledger (estate_id, occurred_on, kind, description, amount_cents, beneficiary_id, distribution_type, override_reason)
        values ($1,$2,'distribution',$3,$4,$5,$6,$7)`, [e.id, on, desc, amount, b.id, type, w.window_status !== 'protected' ? f.reason : null]);
      if (e.status !== 'distributing') await db.query(`update estates set status = 'distributing' where id = $1`, [e.id]);
      await note(db, e.id, f.actor, 'distribute', `${desc} to ${b.name}: ${money(amount, e.currency)}${w.window_status !== 'protected' ? `; window ${w.window_status}; reason: ${f.reason}` : ''}`);
      return { estate: e.ref, beneficiary: b.name, type, amount: money(amount, e.currency), cash_left: money(left, e.currency) };
    });
  },
  async close(db, [term], f) {
    need(f, 'actor');
    const e = await estate(db, term);
    const [p] = await db.query('select * from v_position where estate_id = $1', [e.id]);
    const [w] = await db.query('select * from v_windows where estate_id = $1', [e.id]);
    const problems = [];
    if (Number(p.cash_held_cents) !== 0) problems.push(`cash held ${money(p.cash_held_cents, e.currency)}`);
    if (Number(p.unpaid_liabilities_cents) > 0) problems.push(`unpaid debts ${money(p.unpaid_liabilities_cents, e.currency)}`);
    if (p.assets_to_collect > 0) problems.push(`${p.assets_to_collect} asset(s) not collected`);
    if (w.live_claims > 0) problems.push(`${w.live_claims} live claim(s)`);
    const [{ open }] = await db.query('select count(*)::int as open from tasks where estate_id = $1 and done_on is null', [e.id]);
    if (open) problems.push(`${open} open task(s)`);
    if (problems.length) throw Error(`${e.ref} cannot close: ${problems.join('; ')}`);
    return tx(db, async () => {
      await db.query(`update estates set status = 'closed', closed_on = $2 where id = $1`, [e.id, today()]);
      await note(db, e.id, f.actor, 'close', 'Estate closed');
      return { estate: e.ref, status: 'closed' };
    });
  },
  async 'add-task'(db, [term], f) {
    need(f, 'actor', 'title');
    const e = await estate(db, term);
    return tx(db, async () => {
      const [t] = await db.query('insert into tasks (estate_id, title, owner, due_on) values ($1,$2,$3,$4) returning *',
        [e.id, f.title, f.owner || e.responsible, f.due ? date(f.due, 'due') : null]);
      await note(db, e.id, f.actor, 'add-task', `${t.title}${t.due_on ? ` due ${t.due_on}` : ''}`);
      return t;
    });
  },
  async done(db, [term, what], f) {
    need(f, 'actor');
    const e = await estate(db, term);
    const rows = await db.query('select * from tasks where estate_id = $1 and done_on is null', [e.id]);
    const t = choose(rows, what, 'Open task', (r) => [r.title, r.id]);
    return tx(db, async () => {
      await db.query('update tasks set done_on = $2 where id = $1', [t.id, today()]);
      await note(db, e.id, f.actor, 'done', t.title);
      return { estate: e.ref, task: t.title, done_on: today() };
    });
  },
  async log(db, [term], f) {
    need(f, 'actor', 'note');
    const e = await estate(db, term);
    await note(db, e.id, f.actor, 'note', f.note);
    return { estate: e.ref, noted: f.note };
  },
};

async function history(db, [term]) {
  const e = await estate(db, term);
  const [w] = await db.query('select * from v_windows where estate_id = $1', [e.id]);
  const [p] = await db.query('select * from v_position where estate_id = $1', [e.id]);
  return {
    estate: e, window: w, position: p,
    beneficiaries: await db.query('select name, relationship, residuary_share_bps, is_minor, identity_checked from beneficiaries where estate_id = $1 order by name', [e.id]),
    assets: await db.query('select description, kind, institution, status, dod_value_cents, realised_cents from assets where estate_id = $1 order by description', [e.id]),
    liabilities: await db.query('select creditor, kind, status, amount_cents from liabilities where estate_id = $1 order by creditor', [e.id]),
    claims: await db.query('select claimant, kind, status, notice_received_on, filed_on, served_on, lapses_on, live from v_claims_live where estate_id = $1', [e.id]),
    activity: await db.query('select at, actor, action, detail from activity where estate_id = $1 order by at desc, id desc limit 50', [e.id]),
  };
}

// ------------------------------------------------------------------ import and export

// Estateably's Inventory export (Inventory > Reports > Export Inventory) is an Excel workbook.
// Save the general inventory sheet as CSV. Headings vary, so a column map can rename them.
const DEFAULT_MAP = {
  description: ['Description', 'Asset', 'Item', 'Asset Description', 'Name'],
  kind: ['Category', 'Type', 'Asset Type', 'Asset Category'],
  institution: ['Institution', 'Financial Institution', 'Bank', 'Held With'],
  account_ref: ['Account Number', 'Account', 'Account #', 'Reference'],
  dod_value: ['Date of Death Value', 'Value at Date of Death', 'DOD Value', 'Value'],
};
const KIND_WORDS = [
  [/bank|cash|cheque|savings|deposit/i, 'bank'], [/real|property|house|land|home/i, 'property'], [/share|stock|securit|invest|fund/i, 'shares'],
  [/kiwisaver/i, 'kiwisaver'], [/super/i, 'superannuation'], [/vehicle|car|motor/i, 'vehicle'], [/household|chattel|personal|jewel/i, 'chattels'],
  [/insurance|policy/i, 'insurance'], [/loan|receivable|owed/i, 'debt_owed'], [/business|company/i, 'business'],
];
function mapKind(v) { for (const [re, k] of KIND_WORDS) if (re.test(v)) return k; return 'other'; }

async function importEstateably(db, file, f) {
  need(f, 'actor', 'estate');
  if (!file) throw Error('Give the path to the CSV saved from the Estateably inventory export');
  const e = await estate(db, f.estate);
  const map = { ...DEFAULT_MAP };
  if (f.map) for (const [k, v] of Object.entries(JSON.parse(readFileSync(path.resolve(f.map), 'utf8')))) map[k] = Array.isArray(v) ? v : [v];
  const rows = parseCsv(readFileSync(path.resolve(file), 'utf8'));
  const prepared = rows.map((r, i) => {
    const description = pick(r, ...map.description).trim();
    if (!description) throw Error(`Row ${i + 2}: no description`);
    const raw = pick(r, ...map.dod_value).trim();
    const value = raw === '' ? null : cents(raw, `value on row ${i + 2}`);
    return { description, kind: mapKind(pick(r, ...map.kind)), institution: pick(r, ...map.institution).trim(), account_ref: pick(r, ...map.account_ref).trim(), value, source: r };
  });
  const keys = new Set();
  for (const p of prepared) {
    const k = `${p.description.toLowerCase()}|${p.account_ref.toLowerCase()}`;
    if (keys.has(k)) throw Error(`Duplicate row in file: ${p.description} ${p.account_ref}`);
    keys.add(k);
  }
  let added = 0, skipped = 0;
  await db.exec('begin');
  try {
    for (const p of prepared) {
      const existing = await db.query('select * from assets where estate_id = $1 and lower(description) = lower($2) and lower(account_ref) = lower($3)', [e.id, p.description, p.account_ref]);
      if (existing.length) {
        const x = existing[0];
        const same = (x.dod_value_cents === null ? null : Number(x.dod_value_cents)) === p.value && x.institution === p.institution;
        if (!same) throw Error(`Import conflict: ${p.description} ${p.account_ref} already exists with different values. Nothing imported.`);
        skipped++;
        continue;
      }
      await db.query(`insert into assets (estate_id, description, kind, institution, account_ref, dod_value_cents, source) values ($1,$2,$3,$4,$5,$6,$7)`,
        [e.id, p.description, p.kind, p.institution, p.account_ref, p.value, JSON.stringify(p.source)]);
      added++;
    }
    await note(db, e.id, f.actor, 'import', `Estateably inventory: ${added} added, ${skipped} already there${f['dry-run'] ? ' (dry run)' : ''}`);
    await db.exec(f['dry-run'] ? 'rollback' : 'commit');
  } catch (err) { await db.exec('rollback'); throw err; }
  return { estate: e.ref, added, skipped, dry_run: Boolean(f['dry-run']) };
}

async function exportAll(db, f) {
  const out = {};
  for (const t of ['estates', 'beneficiaries', 'assets', 'liabilities', 'claims', 'notices', 'ledger', 'tasks', 'activity']) out[t] = await db.query(`select * from ${t} order by 1`);
  if (f.out) { writeFileSync(path.resolve(f.out), JSON.stringify(out, null, 2), { flag: 'wx', mode: 0o600 }); return { written: path.resolve(f.out) }; }
  return out;
}

// ------------------------------------------------------------------ drafts (never sent)

function draft(name, body) {
  const dir = path.resolve(process.env.OUTPUT_DIR || REPO_ROOT, 'drafts');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  let file = path.join(dir, `${today()}-${name}.md`);
  for (let i = 2; existsSync(file); i++) file = path.join(dir, `${today()}-${name}-${i}.md`);
  writeFileSync(file, `${body.trim()}\n\nDraft only. Nothing sent.\n`, { mode: 0o600 });
  return file;
}
const tableMd = (rows) => (rows.length ? [`| ${Object.keys(rows[0]).join(' | ')} |`, `|${Object.keys(rows[0]).map(() => '---').join('|')}|`, ...rows.map((r) => `| ${Object.values(r).map((v) => String(v ?? '')).join(' | ')} |`)].join('\n') : '_None._');

const drafts = {
  async 'draft-institution-letter'(db, [term, what]) {
    const e = await estate(db, term);
    const a = await asset(db, e, what);
    const file = draft(`${e.ref}-${a.institution || 'institution'}-letter`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'), `
# Letter to ${a.institution || '[holder]'}

Estate of ${e.deceased_name}, who died on ${e.date_of_death}. Our reference ${e.ref}.

${a.account_ref ? `Account or reference: ${a.account_ref}.` : ''}

We act for the ${e.grant_type === 'letters_of_administration' ? 'administrators' : 'executors'}, ${e.executors || '[names]'}.${e.grant_date ? ` ${e.grant_type === 'letters_of_administration' ? 'Letters of administration were' : 'Probate was'} granted on ${e.grant_date}; a copy is enclosed.` : ' The grant has not yet been made; we will send a copy once it is.'}

Please confirm the balance or value of ${a.description} at the date of death and today, any amounts owed, and what you need from us to ${a.kind === 'shares' ? 'transfer or sell the holding' : 'close the account and pay the proceeds to the estate'}.

[Signature]`);
    return { file };
  },
  async 'draft-beneficiary-update'(db, [term]) {
    const e = await estate(db, term);
    const [p] = await db.query('select * from v_position where estate_id = $1', [e.id]);
    const [w] = await db.query('select * from v_windows where estate_id = $1', [e.id]);
    const left = await db.query(`select description, status from assets where estate_id = $1 and not passes_outside_estate and status in ('identified','notified','valued')`, [e.id]);
    const file = draft(`${e.ref}-beneficiary-update`.toLowerCase(), `
# Estate of ${e.deceased_name}: update for beneficiaries

Collected so far: ${money(p.receipts_cents, e.currency)}. Paid out in debts and expenses: ${money(p.payments_cents, e.currency)}. Distributed: ${money(p.distributed_cents, e.currency)}. Held now: ${money(p.cash_held_cents, e.currency)}.

Still to collect:
${left.length ? left.map((a) => `- ${a.description} (${a.status})`).join('\n') : '- Nothing.'}

Distribution: ${w.window_status === 'protected' ? 'the estate can now make distributions once the remaining debts are provided for.' : `not yet (${w.window_status}).`}${w.claim_period_ends ? ` The claims period runs to ${w.claim_period_ends}.` : ''}

Next step: [what happens next, from the task list].`);
    return { file };
  },
  async 'weekly-review'(db) {
    const attention = await reads.attention(db);
    const windows = await reads.windows(db);
    const position = await reads.position(db, [], {});
    const file = draft('weekly-review', `
# Monday estates review, ${today()}

## Needs attention
${tableMd(attention)}

## Distribution windows
${tableMd(windows)}

## Money held
${tableMd(position.map((r) => ({ ref: r.ref, held: money(r.cash_held_cents, r.currency), unpaid_debts: money(r.unpaid_liabilities_cents, r.currency), to_collect: r.assets_to_collect })))}`);
    return { file, attention: attention.length };
  },
};

// ------------------------------------------------------------------ dispatch

export const commands = [...Object.keys(reads), 'history', ...Object.keys(writes), 'import', 'export', ...Object.keys(drafts)];

export async function run(db, command, args = [], flags = {}) {
  if (reads[command]) return reads[command](db, args, flags);
  if (command === 'history') return history(db, args);
  if (writes[command]) return writes[command](db, args, flags);
  if (drafts[command]) return drafts[command](db, args, flags);
  if (command === 'import') {
    if (String(args[0]).toLowerCase() !== 'estateably') throw Error('Usage: import estateably <file.csv> --estate=<ref> --actor=<name> [--map=<map.json>] [--dry-run]');
    return importEstateably(db, args[1], flags);
  }
  if (command === 'export') return exportAll(db, flags);
  throw Error(`Unknown command "${command}". Run with --help.`);
}
