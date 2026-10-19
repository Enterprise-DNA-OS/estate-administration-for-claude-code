-- Estate administration: the records an executor's adviser keeps from intake to final distribution.
-- Portable Postgres: runs on any Postgres 15+ and on the embedded PGlite. No extensions.
-- Money is stored in cents (bigint) in the estate's currency. Dates are calendar dates (UTC).

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create table estates (
  id uuid primary key default gen_random_uuid(),
  ref text not null,
  deceased_name text not null,
  date_of_death date not null,
  jurisdiction text not null default 'NZ'
    check (jurisdiction in ('NZ','NSW','VIC','QLD','WA','SA','TAS','ACT','NT')),
  grant_type text not null default 'probate'
    check (grant_type in ('probate','letters_of_administration','no_grant')),
  grant_date date,
  will_date date,
  executors text not null default '',
  responsible text not null default 'Unassigned',
  status text not null default 'intake'
    check (status in ('intake','grant_pending','collecting','administering','distributing','closed')),
  currency text not null default 'NZD' check (currency ~ '^[A-Z]{3}$'),
  notes text not null default '',
  closed_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (grant_date is null or grant_date >= date_of_death)
);
create unique index estates_ref_key on estates (lower(ref));
create trigger estates_touch before update on estates for each row execute function touch_updated_at();

create table beneficiaries (
  id uuid primary key default gen_random_uuid(),
  estate_id uuid not null references estates(id),
  name text not null,
  relationship text not null default '',
  residuary_share_bps integer not null default 0 check (residuary_share_bps between 0 and 10000),
  specific_gift text not null default '',
  is_minor boolean not null default false,
  contact text not null default '',
  identity_checked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index beneficiaries_name_key on beneficiaries (estate_id, lower(name));
create trigger beneficiaries_touch before update on beneficiaries for each row execute function touch_updated_at();

create table assets (
  id uuid primary key default gen_random_uuid(),
  estate_id uuid not null references estates(id),
  description text not null,
  kind text not null default 'other'
    check (kind in ('bank','property','shares','kiwisaver','superannuation','vehicle','chattels','debt_owed','insurance','business','other')),
  institution text not null default '',
  account_ref text not null default '',
  dod_value_cents bigint check (dod_value_cents is null or dod_value_cents >= 0),
  status text not null default 'identified'
    check (status in ('identified','notified','valued','collected','sold','transferred','written_off')),
  passes_outside_estate boolean not null default false,
  specific_gift_to uuid references beneficiaries(id),
  notified_on date,
  realised_cents bigint check (realised_cents is null or realised_cents >= 0),
  realised_on date,
  source jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger assets_touch before update on assets for each row execute function touch_updated_at();

create table liabilities (
  id uuid primary key default gen_random_uuid(),
  estate_id uuid not null references estates(id),
  creditor text not null,
  description text not null default '',
  kind text not null default 'debt'
    check (kind in ('funeral','tax','debt','mortgage','credit_card','expense','professional_fees','other')),
  amount_cents bigint not null check (amount_cents >= 0),
  status text not null default 'notified' check (status in ('notified','agreed','paid','disputed','written_off')),
  paid_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger liabilities_touch before update on liabilities for each row execute function touch_updated_at();

-- A claim or a written notice of intention to claim against the estate.
create table claims (
  id uuid primary key default gen_random_uuid(),
  estate_id uuid not null references estates(id),
  claimant text not null,
  kind text not null default 'family_protection'
    check (kind in ('family_protection','testamentary_promises','relationship_property','family_provision','creditor','other')),
  notice_received_on date,
  filed_on date,
  served_on date,
  status text not null default 'notice' check (status in ('notice','filed','settled','dismissed','withdrawn')),
  resolved_on date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (notice_received_on is not null or filed_on is not null or served_on is not null)
);
create trigger claims_touch before update on claims for each row execute function touch_updated_at();

-- Published or sent notices: creditor notices, notices of intended distribution, institution letters.
create table notices (
  id uuid primary key default gen_random_uuid(),
  estate_id uuid not null references estates(id),
  kind text not null check (kind in ('intended_distribution','creditor_notice','institution_letter','other')),
  published_on date not null,
  period_days integer not null default 0 check (period_days >= 0),
  reference text not null default '',
  created_at timestamptz not null default now()
);

-- The estate account. Receipts and payments move cash; distributions pay beneficiaries.
create table ledger (
  id uuid primary key default gen_random_uuid(),
  estate_id uuid not null references estates(id),
  occurred_on date not null,
  kind text not null check (kind in ('receipt','payment','distribution')),
  description text not null,
  amount_cents bigint not null check (amount_cents > 0),
  asset_id uuid references assets(id),
  liability_id uuid references liabilities(id),
  beneficiary_id uuid references beneficiaries(id),
  distribution_type text check (distribution_type in ('interim','final','specific_gift')),
  override_reason text,
  created_at timestamptz not null default now(),
  check ((kind = 'distribution') = (beneficiary_id is not null and distribution_type is not null))
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  estate_id uuid not null references estates(id),
  title text not null,
  owner text not null default 'Unassigned',
  due_on date,
  done_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tasks_touch before update on tasks for each row execute function touch_updated_at();

-- Append-only file notes and change history.
create table activity (
  id bigint generated always as identity primary key,
  estate_id uuid references estates(id),
  at timestamptz not null default now(),
  actor text not null check (length(trim(actor)) > 0),
  action text not null,
  detail text not null default ''
);
create or replace function activity_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'Append-only: activity rows cannot be changed or removed';
end $$;
create trigger activity_no_update before update or delete on activity for each row execute function activity_append_only();

-- ------------------------------------------------------------------ views

-- Where each estate stands in money.
create view v_position with (security_invoker = true) as
select e.id as estate_id, e.ref, e.deceased_name, e.responsible, e.status, e.currency,
  coalesce((select sum(a.dod_value_cents) from assets a where a.estate_id = e.id and not a.passes_outside_estate), 0) as dod_assets_cents,
  coalesce((select sum(l.amount_cents) from ledger l where l.estate_id = e.id and l.kind = 'receipt'), 0) as receipts_cents,
  coalesce((select sum(l.amount_cents) from ledger l where l.estate_id = e.id and l.kind = 'payment'), 0) as payments_cents,
  coalesce((select sum(l.amount_cents) from ledger l where l.estate_id = e.id and l.kind = 'distribution'), 0) as distributed_cents,
  coalesce((select sum(l.amount_cents) filter (where l.kind = 'receipt') - coalesce(sum(l.amount_cents) filter (where l.kind <> 'receipt'), 0)
            from ledger l where l.estate_id = e.id), 0) as cash_held_cents,
  coalesce((select sum(li.amount_cents) from liabilities li where li.estate_id = e.id and li.status in ('notified','agreed','disputed')), 0) as unpaid_liabilities_cents,
  (select count(*) from assets a where a.estate_id = e.id and not a.passes_outside_estate
     and a.status in ('identified','notified','valued'))::int as assets_to_collect,
  (select max(x.at)::date from activity x where x.estate_id = e.id) as last_activity_on
from estates e;

-- When each estate can safely distribute, under the rules in docs/compliance.md.
-- A claim notice is live until it lapses (NZ: 3 months after receipt unless the claim is filed
-- or served first) or the claim is resolved.
create view v_claims_live with (security_invoker = true) as
select c.*, e.ref, e.jurisdiction,
  case when e.jurisdiction = 'NZ' and c.filed_on is null and c.served_on is null and c.notice_received_on is not null
       then (c.notice_received_on + interval '3 months')::date end as lapses_on,
  (c.status in ('notice','filed') and not (
     e.jurisdiction = 'NZ' and c.filed_on is null and c.served_on is null and c.notice_received_on is not null
     and (c.notice_received_on + interval '3 months')::date <= current_date)) as live
from claims c join estates e on e.id = c.estate_id;

create view v_windows with (security_invoker = true) as
select e.id as estate_id, e.ref, e.deceased_name, e.jurisdiction, e.status, e.responsible,
  e.date_of_death, e.grant_date,
  case e.jurisdiction
    when 'NZ' then (e.grant_date + interval '6 months')::date
    when 'NSW' then case when n.last_notice is null then null
      else greatest((e.date_of_death + interval '6 months')::date, n.notice_period_ends) end
  end as protected_from,
  case e.jurisdiction
    when 'NZ' then (e.grant_date + interval '12 months')::date
    when 'NSW' then (e.date_of_death + interval '12 months')::date
  end as claim_period_ends,
  n.last_notice as distribution_notice_on,
  (select count(*) from v_claims_live c where c.estate_id = e.id and c.live)::int as live_claims,
  case
    when e.status = 'closed' then 'closed'
    when e.jurisdiction not in ('NZ','NSW') then 'rule not configured'
    when e.grant_type = 'no_grant' then 'no grant: adviser to confirm'
    when e.grant_date is null then 'no grant recorded'
    when (select count(*) from v_claims_live c where c.estate_id = e.id and c.live) > 0 then 'live claim'
    when e.jurisdiction = 'NSW' and n.last_notice is null then 'no notice of intended distribution'
    when e.jurisdiction = 'NZ' and current_date < (e.grant_date + interval '6 months')::date then 'inside 6 months of grant'
    when e.jurisdiction = 'NSW' and current_date < greatest((e.date_of_death + interval '6 months')::date, n.notice_period_ends) then 'notice period running'
    else 'protected'
  end as window_status
from estates e
left join lateral (
  select max(published_on) as last_notice,
         max((published_on + period_days)) as notice_period_ends
  from notices where estate_id = e.id and kind = 'intended_distribution'
) n on true;

-- Everything that needs a person this week.
create view v_attention with (security_invoker = true) as
select e.ref, e.responsible as owner, 'task overdue' as item, t.title as detail, t.due_on as date, (current_date - t.due_on) as days
  from tasks t join estates e on e.id = t.estate_id
  where t.done_on is null and t.due_on < current_date and e.status <> 'closed'
union all
select e.ref, e.responsible, 'task due this week', t.title, t.due_on, (current_date - t.due_on)
  from tasks t join estates e on e.id = t.estate_id
  where t.done_on is null and t.due_on between current_date and current_date + 7 and e.status <> 'closed'
union all
select e.ref, e.responsible, 'asset not collected', a.description || coalesce(' (' || nullif(a.institution, '') || ')', ''),
       e.grant_date, (current_date - e.grant_date)
  from assets a join estates e on e.id = a.estate_id
  where e.grant_date is not null and current_date - e.grant_date > 90 and not a.passes_outside_estate
    and a.status in ('identified','notified','valued') and e.status <> 'closed'
union all
select c.ref, e.responsible, 'claim notice lapses soon', c.claimant || ' (' || c.kind || ')', c.lapses_on, (current_date - c.lapses_on)
  from v_claims_live c join estates e on e.id = c.estate_id
  where c.live and c.lapses_on between current_date and current_date + 14
union all
select e.ref, e.responsible, 'no grant yet', 'date of death ' || e.date_of_death, e.date_of_death, (current_date - e.date_of_death)
  from estates e where e.grant_date is null and e.grant_type <> 'no_grant' and e.status <> 'closed' and current_date - e.date_of_death > 60
union all
select p.ref, p.responsible, 'quiet file', 'no activity recorded', p.last_activity_on, (current_date - p.last_activity_on)
  from v_position p where p.status <> 'closed' and p.last_activity_on is not null and current_date - p.last_activity_on > 30
union all
select w.ref, w.responsible, 'ready to distribute', 'protected and cash held', w.protected_from, (current_date - w.protected_from)
  from v_windows w join v_position p on p.estate_id = w.estate_id
  where w.window_status = 'protected' and p.cash_held_cents > p.unpaid_liabilities_cents and p.cash_held_cents > 0 and w.status <> 'closed';

-- ------------------------------------------------------------------ access

do $$
declare t text;
begin
  foreach t in array array['estates','beneficiaries','assets','liabilities','claims','notices','ledger','tasks','activity'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from public', t);
  end loop;
end $$;
revoke all on v_position, v_claims_live, v_windows, v_attention from public;
