-- Fictional demo estates. Every person, institution and amount is invented.
-- Dates are relative to today, so the attention list always has something to say.
-- Idempotent: run it as often as you like.

insert into estates (id, ref, deceased_name, date_of_death, jurisdiction, grant_type, grant_date, will_date, executors, responsible, status, currency, notes) values
 ('10000000-0000-0000-0000-000000000001','EST-001','Margaret Ellen Hart', current_date - 300, 'NZ','probate', current_date - 240, '2019-03-14','Anna Hart; Tom Hart','Priya','distributing','NZD','Two children share residue equally. Car sold. Shares still to transfer.'),
 ('10000000-0000-0000-0000-000000000002','EST-002','Robert James Kingi', current_date - 150, 'NZ','probate', current_date - 90, '2021-08-02','Hemi Kingi','Priya','collecting','NZD','Former partner has given notice of a possible claim.'),
 ('10000000-0000-0000-0000-000000000003','EST-003','Dorothy Anne Pryce', current_date - 210, 'NSW','probate', current_date - 120, '2016-11-21','Graham Pryce','Liam','administering','AUD','Grandchild is under 18. Notice of intended distribution not yet published.'),
 ('10000000-0000-0000-0000-000000000004','EST-004','Peter Lowe', current_date - 75, 'NZ','probate', null, '2023-05-09','Sarah Lowe','Liam','grant_pending','NZD','Application for probate being prepared.'),
 ('10000000-0000-0000-0000-000000000005','EST-005','Ivy Chen', current_date - 700, 'NZ','letters_of_administration', current_date - 620, null,'Daniel Chen','Priya','closed','NZD','Final distribution made. File closed.')
on conflict (id) do nothing;

update estates set closed_on = current_date - 200 where id = '10000000-0000-0000-0000-000000000005' and closed_on is null;

insert into beneficiaries (id, estate_id, name, relationship, residuary_share_bps, specific_gift, is_minor, contact, identity_checked) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Anna Hart','daughter',5000,'',false,'anna.hart@example.com',true),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Tom Hart','son',5000,'Grandfather''s watch',false,'tom.hart@example.com',true),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','Hemi Kingi','son',10000,'',false,'hemi.k@example.com',true),
 ('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000003','Graham Pryce','son',6000,'',false,'graham.p@example.com',true),
 ('20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000003','Ella Pryce','granddaughter',3000,'',true,'via Graham Pryce',false),
 ('20000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000004','Sarah Lowe','wife',10000,'',false,'sarah.lowe@example.com',false),
 ('20000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000005','Daniel Chen','son',10000,'',false,'daniel.chen@example.com',true)
on conflict (id) do nothing;

insert into assets (id, estate_id, description, kind, institution, account_ref, dod_value_cents, status, passes_outside_estate, specific_gift_to, notified_on, realised_cents, realised_on) values
 ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Cheque and savings accounts','bank','Harbour Bank','12-3456-0012345-00',8421055,'collected',false,null, current_date - 230, 8421055, current_date - 200),
 ('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','KiwiSaver balance','kiwisaver','Southern Scheme','KS-88412',6140000,'collected',false,null, current_date - 230, 6140000, current_date - 170),
 ('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','2016 hatchback','vehicle','','ABC123',1200000,'sold',false,null, null, 950000, current_date - 150),
 ('30000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','Listed share portfolio','shares','Kauri Registry','HN 0045512',4310000,'notified',false,null, current_date - 210, null, null),
 ('30000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','Grandfather''s watch','chattels','','',150000,'identified',false,'20000000-0000-0000-0000-000000000002', null, null, null),
 ('30000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000002','Everyday account','bank','Harbour Bank','12-9988-0044556-00',1875000,'collected',false,null, current_date - 85, 1875000, current_date - 60),
 ('30000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000002','House at 14 Example Street','property','','RT 445512',68500000,'valued',false,null, null, null, null),
 ('30000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000002','Joint term deposit with former partner','bank','Coastal Bank','TD-2231',2500000,'identified',true,null, null, null, null),
 ('30000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000003','Term deposits','bank','Eastern Mutual','TD-55-0192',21000000,'collected',false,null, current_date - 110, 21050000, current_date - 80),
 ('30000000-0000-0000-0000-000000000010','10000000-0000-0000-0000-000000000003','Superannuation death benefit','superannuation','Gum Tree Super','M-447120',9800000,'notified',true,null, current_date - 110, null, null),
 ('30000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000003','Unit in Parramatta','property','','Lot 7 SP 1234',61000000,'valued',false,null, null, null, null),
 ('30000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000004','Savings account','bank','Harbour Bank','12-1111-0099887-00',3320000,'identified',false,null, null, null, null),
 ('30000000-0000-0000-0000-000000000013','10000000-0000-0000-0000-000000000005','Savings account','bank','Coastal Bank','CB-7712',5400000,'collected',false,null, current_date - 600, 5400000, current_date - 560)
on conflict (id) do nothing;

insert into liabilities (id, estate_id, creditor, description, kind, amount_cents, status, paid_on) values
 ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Rest Easy Funerals','Funeral account','funeral',985000,'paid', current_date - 190),
 ('40000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Inland Revenue','Final income tax return','tax',342000,'notified',null),
 ('40000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','District Council','Rates to date of sale of contents','other',118000,'agreed',null),
 ('40000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','Harbour Bank','Credit card','credit_card',412050,'agreed',null),
 ('40000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000003','Sydney Memorial Services','Funeral account','funeral',1120000,'paid', current_date - 75),
 ('40000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000005','Coastal Bank','Overdraft','debt',45000,'paid', current_date - 550)
on conflict (id) do nothing;

insert into claims (id, estate_id, claimant, kind, notice_received_on, filed_on, served_on, status, notes) values
 ('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Former partner of the deceased','relationship_property', current_date - 80, null, null, 'notice','Letter from claimant''s lawyer giving notice of intention to apply.')
on conflict (id) do nothing;

insert into notices (id, estate_id, kind, published_on, period_days, reference) values
 ('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','creditor_notice', current_date - 225, 0, 'Newspaper notice to creditors'),
 ('60000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','institution_letter', current_date - 230, 0, 'Harbour Bank and Southern Scheme notified')
on conflict (id) do nothing;

insert into ledger (id, estate_id, occurred_on, kind, description, amount_cents, asset_id, liability_id, beneficiary_id, distribution_type) values
 ('70000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001', current_date - 200,'receipt','Harbour Bank accounts closed',8421055,'30000000-0000-0000-0000-000000000001',null,null,null),
 ('70000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001', current_date - 190,'payment','Funeral account paid',985000,null,'40000000-0000-0000-0000-000000000001',null,null),
 ('70000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001', current_date - 170,'receipt','KiwiSaver withdrawal on death',6140000,'30000000-0000-0000-0000-000000000002',null,null,null),
 ('70000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001', current_date - 150,'receipt','Car sale proceeds',950000,'30000000-0000-0000-0000-000000000003',null,null,null),
 ('70000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001', current_date - 40,'distribution','Interim distribution',2000000,null,null,'20000000-0000-0000-0000-000000000001','interim'),
 ('70000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000001', current_date - 40,'distribution','Interim distribution',2000000,null,null,'20000000-0000-0000-0000-000000000002','interim'),
 ('70000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000002', current_date - 60,'receipt','Everyday account closed',1875000,'30000000-0000-0000-0000-000000000006',null,null,null),
 ('70000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000003', current_date - 80,'receipt','Term deposits broken',21050000,'30000000-0000-0000-0000-000000000009',null,null,null),
 ('70000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000003', current_date - 75,'payment','Funeral account paid',1120000,null,'40000000-0000-0000-0000-000000000005',null,null),
 ('70000000-0000-0000-0000-000000000010','10000000-0000-0000-0000-000000000005', current_date - 560,'receipt','Savings account closed',5400000,'30000000-0000-0000-0000-000000000013',null,null,null),
 ('70000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000005', current_date - 550,'payment','Overdraft repaid',45000,null,'40000000-0000-0000-0000-000000000006',null,null),
 ('70000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000005', current_date - 210,'distribution','Final distribution',5355000,null,null,'20000000-0000-0000-0000-000000000007','final')
on conflict (id) do nothing;

insert into tasks (id, estate_id, title, owner, due_on, done_on) values
 ('80000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Send share transfer forms to Kauri Registry','Priya', current_date - 12, null),
 ('80000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','File final income tax return','Priya', current_date + 5, null),
 ('80000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','Get registered valuation of the house','Priya', current_date - 20, null),
 ('80000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','Diary: check whether the claim has been filed or served','Priya', current_date + 9, null),
 ('80000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000003','Publish notice of intended distribution','Liam', current_date + 3, null),
 ('80000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000004','File probate application','Liam', current_date + 14, null),
 ('80000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000005','Send final estate accounts to beneficiary','Priya', current_date - 205, current_date - 205)
on conflict (id) do nothing;

insert into activity (estate_id, at, actor, action, detail)
select v.estate_id::uuid, now() - (v.days || ' days')::interval, v.actor, v.action, v.detail
from (values
 ('10000000-0000-0000-0000-000000000001', 8, 'Priya', 'note', 'Called Kauri Registry: transfer forms requested again.'),
 ('10000000-0000-0000-0000-000000000002', 6, 'Priya', 'note', 'Valuer booked. Claimant''s lawyer has not filed.'),
 ('10000000-0000-0000-0000-000000000003', 45, 'Liam', 'note', 'Asked Graham Pryce for the unit''s strata details.'),
 ('10000000-0000-0000-0000-000000000004', 10, 'Liam', 'note', 'Original will received.'),
 ('10000000-0000-0000-0000-000000000005', 205, 'Priya', 'note', 'Estate closed after final distribution.')
) as v(estate_id, days, actor, action, detail)
where not exists (select 1 from activity a where a.estate_id = v.estate_id::uuid and a.action = v.action and a.detail = v.detail);
