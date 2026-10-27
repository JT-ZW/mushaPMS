import test from 'node:test';
import assert from 'node:assert/strict';
import { workflowDatabase } from './helpers/workflow-db.mjs';
import { randomUUID } from 'node:crypto';

test('connected workflows against the real migration chain', async (t) => {
	const db = await workflowDatabase();
	try {
		const manager = randomUUID(),
			viewer = randomUUID(),
			finance = randomUUID(),
			maintenance = randomUUID();
		const org = randomUUID(),
			other = randomUUID(),
			property = randomUUID(),
			space = randomUUID();
		await db.query(`insert into auth.users(id) values($1),($2),($3),($4)`, [
			manager,
			viewer,
			finance,
			maintenance
		]);
		await db.query(
			`insert into organizations(id,name,slug,created_by,status) values($1,'Test','test',$3,'active'),($2,'Other','other',$3,'active')`,
			[org, other, manager]
		);
		await db.query(
			`insert into organization_members(organization_id,user_id,role) values($1,$2,'owner'),($1,$3,'viewer'),($1,$4,'finance'),($1,$5,'maintenance')`,
			[org, manager, viewer, finance, maintenance]
		);
		await db.query(`insert into properties(id,organization_id,name) values($1,$2,'House')`, [
			property,
			org
		]);
		await db.query(
			`insert into spaces(id,organization_id,property_id,name) values($1,$2,$3,'Room A')`,
			[space, org, property]
		);
		await db.query(`insert into organization_workspace_settings(organization_id) values($1)`, [
			org
		]);
		const today = (await db.query(`select current_date::text as date`)).rows[0].date;
		const asUser = async (id) => {
			await db.exec('reset role');
			await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [id]);
			await db.exec('set role authenticated');
		};
		const rpc = async (name, args) =>
			(
				await db.query(
					`select public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as result`,
					args
				)
			).rows[0].result;
		const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
		await asUser(manager);
		const onboarding = {
			submission_key: randomUUID(),
			space_id: space,
			first_name: 'Amina',
			email: 'amina@example.test',
			last_name: 'Test',
			start_date: today,
			rent_amount: 100,
			deposit_amount: 150,
			deposit_received: 150,
			deposit_method: 'cash',
			checked_in: true,
			billing_frequency: 'monthly',
			rent_due_day: 31,
			notice_period_days: 30,
			first_due_on: today
		};
		let lease;
		await t.test(
			'atomic onboarding creates person, lease, deposit payment and first rent charge',
			async () => {
				lease = await rpc('onboard_tenant', [org, onboarding]);
				assert.equal(await scalar('select status from spaces where id=$1', [space]), 'occupied');
				assert.equal(
					Number(await scalar('select count(*) from charges where tenancy_id=$1', [lease])),
					2
				);
				assert.equal(
					Number(
						await scalar(
							'select sum(a.amount) from payment_allocations a join payments p on p.id=a.payment_id where p.tenancy_id=$1',
							[lease]
						)
					),
					150
				);
			}
		);
		await t.test(
			'onboarding retry is idempotent and a competing tenant cannot take the space',
			async () => {
				assert.equal(await rpc('onboard_tenant', [org, onboarding]), lease);
				await assert.rejects(
					rpc('onboard_tenant', [org, { ...onboarding, submission_key: randomUUID() }]),
					/no longer available/
				);
				assert.equal(Number(await scalar('select count(*) from people')), 1);
			}
		);
		await t.test('invalid onboarding rolls back the whole transaction', async () => {
			const spare = randomUUID();
			await db.query(
				`insert into spaces(id,organization_id,property_id,name) values($1,$2,$3,'Room B')`,
				[spare, org, property]
			);
			await assert.rejects(
				rpc('onboard_tenant', [
					org,
					{
						...onboarding,
						space_id: spare,
						submission_key: randomUUID(),
						billing_frequency: 'invalid'
					}
				])
			);
			assert.equal(Number(await scalar('select count(*) from people')), 1);
			assert.equal(await scalar('select status from spaces where id=$1', [spare]), 'vacant');
		});
		const payment = {
			submission_key: randomUUID(),
			tenancy_id: lease,
			amount: 40,
			payment_date: today,
			method: 'cash',
			auto_allocate: true,
			generate_receipt: true
		};
		let paymentId;
		await t.test(
			'partial payment allocates, issues one receipt and survives an identical retry',
			async () => {
				paymentId = await rpc('record_workspace_payment', [org, payment]);
				assert.equal(await rpc('record_workspace_payment', [org, payment]), paymentId);
				assert.equal(
					Number(
						await scalar('select sum(amount) from payment_allocations where payment_id=$1', [
							paymentId
						])
					),
					40
				);
				assert.equal(
					Number(
						await scalar('select count(*) from billing_documents where payment_id=$1', [paymentId])
					),
					1
				);
				assert.equal(
					await scalar(`select status from charges where tenancy_id=$1 and charge_type='rent'`, [
						lease
					]),
					'partially_paid'
				);
			}
		);
		await t.test('overpayment settles rent and retains excess as unallocated credit', async () => {
			const id = await rpc('record_workspace_payment', [
				org,
				{ ...payment, submission_key: randomUUID(), amount: 100 }
			]);
			assert.equal(
				Number(
					await scalar('select sum(amount) from payment_allocations where payment_id=$1', [id])
				),
				60
			);
		});
		await t.test('receipt failure rolls back payment and allocations', async () => {
			await db.exec('reset role');
			await db.exec(`create function reject_test_receipt() returns trigger language plpgsql as $$ begin raise exception 'test receipt failure'; end $$;
     create trigger reject_test_receipt before insert on billing_documents for each row execute function reject_test_receipt();`);
			await asUser(manager);
			const before = Number(await scalar('select count(*) from payments'));
			await assert.rejects(
				rpc('record_workspace_payment', [org, { ...payment, submission_key: randomUUID() }]),
				/test receipt failure/
			);
			assert.equal(Number(await scalar('select count(*) from payments')), before);
			await db.exec('reset role');
			await db.exec('drop trigger reject_test_receipt on billing_documents');
			await asUser(manager);
		});
		await t.test(
			'viewer and maintenance roles cannot record payments or onboard tenants',
			async () => {
				for (const actor of [viewer, maintenance]) {
					await asUser(actor);
					await assert.rejects(rpc('record_workspace_payment', [org, payment]), /Finance access/);
					await assert.rejects(rpc('onboard_tenant', [org, onboarding]), /Manager access/);
				}
				await asUser(finance);
				await assert.rejects(rpc('onboard_tenant', [org, onboarding]), /Manager access/);
				await asUser(manager);
				await assert.rejects(rpc('record_workspace_payment', [other, payment]), /Finance access/);
			}
		);
		await t.test(
			'rent recurrence keeps month-end anchors and does not double the first rent',
			async () => {
				assert.equal(
					await scalar(`select advance_rent_due('2026-01-31',1,31)::text`),
					'2026-02-28'
				);
				assert.equal(
					await scalar(`select advance_rent_due('2026-02-28',1,31)::text`),
					'2026-03-31'
				);
				await db.exec('reset role');
				await rpc('generate_recurring_rent_invoices', [today]);
				await asUser(manager);
				assert.equal(
					Number(
						await scalar(
							`select count(*) from charges where tenancy_id=$1 and charge_type='rent' and due_on=$2`,
							[lease, today]
						)
					),
					1
				);
			}
		);
		await t.test(
			'notice continues occupancy and rent; renewal clears notice and preserves history',
			async () => {
				await rpc('transition_lease', [org, lease, 'notice', { expected_move_out_on: today }]);
				assert.equal(await scalar('select status from spaces where id=$1', [space]), 'occupied');
				assert.equal(
					await scalar('select active from charge_schedules where tenancy_id=$1', [lease]),
					true
				);
				await rpc('transition_lease', [org, lease, 'renew', { end_date: '2035-12-31' }]);
				assert.equal(
					await scalar('select notice_given_on from tenancies where id=$1', [lease]),
					null
				);
			}
		);
		await t.test(
			'move-out requires inspection and exact deposit settlement before releasing space',
			async () => {
				const payload = {
					move_out_date: today,
					deposit_refund_amount: 150,
					deposit_deduction_amount: 0,
					settlement_notes: 'Refund reference R1'
				};
				await assert.rejects(
					rpc('transition_lease', [org, lease, 'move_out', payload]),
					/inspection/
				);
				await assert.rejects(
					rpc('transition_lease', [
						org,
						lease,
						'move_out',
						{
							...payload,
							inspection_notes: 'Keys and condition checked',
							deposit_refund_amount: 149
						}
					]),
					/must equal/
				);
				await rpc('transition_lease', [
					org,
					lease,
					'move_out',
					{ ...payload, inspection_notes: 'Keys and condition checked' }
				]);
				assert.equal(await scalar('select status from spaces where id=$1', [space]), 'vacant');
				assert.equal(
					await scalar('select active from charge_schedules where tenancy_id=$1', [lease]),
					false
				);
				assert.ok(
					Number(await scalar(`select count(*) from audit_logs where entity_id=$1`, [lease])) >= 4
				);
			}
		);
		let task, vendor;
		await t.test('maintenance cannot skip assignment or start without a planned date', async () => {
			vendor = randomUUID();
			task = randomUUID();
			await db.query(
				`insert into maintenance_vendors(id,organization_id,business_name) values($1,$2,'Repairs Team')`,
				[vendor, org]
			);
			await db.query(
				`insert into maintenance_requests(id,organization_id,property_id,title) values($1,$2,$3,'Leaking tap')`,
				[task, org, property]
			);
			await assert.rejects(
				db.query(`update maintenance_requests set status='completed' where id=$1`, [task]),
				/Invalid maintenance transition/
			);
			await assert.rejects(
				db.query(`update maintenance_requests set status='assigned' where id=$1`, [task]),
				/Assign a resource/
			);
			await db.query(
				`update maintenance_requests set status='assigned',vendor_id=$2,scheduled_for=$3 where id=$1`,
				[task, vendor, today]
			);
			await db.query(`update maintenance_requests set status='in_progress' where id=$1`, [task]);
		});
		await t.test(
			'completion needs evidence and finance approval; maintenance role cannot self-approve',
			async () => {
				await asUser(maintenance);
				await assert.rejects(
					db.query(
						`update maintenance_requests set status='awaiting_approval',actual_cost=25,resolution_notes='Tap replaced' where id=$1`,
						[task]
					),
					/Upload completion evidence/
				);
				await db.query(
					`insert into maintenance_attachments(organization_id,request_id,file_name,storage_path) values($1,$2,'after.jpg','test/after.jpg')`,
					[org, task]
				);
				await db.query(
					`update maintenance_requests set status='awaiting_approval',actual_cost=25,resolution_notes='Tap replaced' where id=$1`,
					[task]
				);
				await assert.rejects(rpc('approve_maintenance_cost', [org, task]), /Finance approval/);
				await assert.rejects(
					db.query(`update maintenance_requests set status='completed' where id=$1`, [task]),
					/Approve the actual cost/
				);
				await asUser(finance);
				await rpc('approve_maintenance_cost', [org, task]);
				await asUser(maintenance);
				await db.query(`update maintenance_requests set status='completed' where id=$1`, [task]);
				assert.ok(
					await scalar('select completed_at from maintenance_requests where id=$1', [task])
				);
			}
		);
		await asUser(manager);
		await t.test(
			'daily actions include overdue balances and follow-ups, and exclude resolved work',
			async () => {
				await db.query(
					`insert into charges(organization_id,tenancy_id,description,amount,due_on) values($1,$2,'Remaining utility',20,current_date-1)`,
					[org, lease]
				);
				await db.query(
					`insert into collection_followups(organization_id,tenancy_id,notes,next_action_on) values($1,$2,'Call tenant',current_date)`,
					[org, lease]
				);
				const items = await rpc('workflow_attention', [org]);
				assert.ok(
					items.some((i) => i.id.startsWith('arrears:') && i.title === 'Remaining utility')
				);
				assert.ok(items.some((i) => i.id.startsWith('followup:')));
				assert.ok(!items.some((i) => i.id === 'urgent:' + task));
			}
		);
		await t.test(
			'draft check-in reserves the space and creates first charges exactly once',
			async () => {
				const spare = randomUUID();
				await db.query(
					`insert into spaces(id,organization_id,property_id,name) values($1,$2,$3,'Draft room')`,
					[spare, org, property]
				);
				const draft = await rpc('onboard_tenant', [
					org,
					{
						...onboarding,
						space_id: spare,
						submission_key: randomUUID(),
						checked_in: false,
						deposit_received: 0
					}
				]);
				assert.equal(await scalar('select status from spaces where id=$1', [spare]), 'reserved');
				assert.equal(
					Number(await scalar('select count(*) from charges where tenancy_id=$1', [draft])),
					0
				);
				const terms = {
					status: 'active',
					start_date: today,
					rent_amount: 100,
					deposit_amount: 150,
					billing_frequency: 'monthly',
					rent_due_day: 31,
					notice_period_days: 30
				};
				await rpc('save_lease_terms', [org, draft, terms]);
				await rpc('save_lease_terms', [org, draft, terms]);
				assert.equal(await scalar('select status from spaces where id=$1', [spare]), 'occupied');
				assert.equal(
					Number(await scalar('select count(*) from charges where tenancy_id=$1', [draft])),
					2
				);
			}
		);
		await t.test(
			'future payments, draft allocations and posted payment edits are rejected',
			async () => {
				await assert.rejects(
					rpc('record_workspace_payment', [
						org,
						{ ...payment, submission_key: randomUUID(), payment_date: '2099-01-01' }
					]),
					/no later than today/
				);
				await assert.rejects(
					db.query('update payments set amount=1 where id=$1', [paymentId]),
					/cannot be edited/
				);
				const draft = (
					await db.query(
						`insert into charges(organization_id,tenancy_id,description,amount,due_on,status) values($1,$2,'Draft fee',10,current_date,'draft') returning id`,
						[org, lease]
					)
				).rows[0].id;
				await assert.rejects(
					db.query(`insert into payment_allocations(payment_id,charge_id,amount) values($1,$2,1)`, [
						paymentId,
						draft
					]),
					/Only issued charges/
				);
			}
		);
		await t.test(
			'receipt generation reuses the existing document and approval cannot survive changed cost',
			async () => {
				const receipt = await rpc('issue_workspace_receipt', [org, paymentId]);
				assert.equal(await rpc('issue_workspace_receipt', [org, paymentId]), receipt);
				await assert.rejects(
					db.query('update maintenance_requests set actual_cost=30 where id=$1', [task]),
					/immutable/
				);
			}
		);
		await t.test(
			'retry keys cannot silently change a recorded payment and evidence cannot be deleted',
			async () => {
				await assert.rejects(
					rpc('record_workspace_payment', [org, { ...payment, amount: 41 }]),
					/different payment/
				);
				await assert.rejects(
					db.query('delete from maintenance_attachments where request_id=$1', [task]),
					/cannot be removed/
				);
			}
		);
		await t.test('workspace rent generation is idempotent and denied to viewers', async () => {
			await asUser(viewer);
			await assert.rejects(rpc('generate_workspace_rent', [org]), /Finance access/);
			await asUser(manager);
			await assert.rejects(rpc('generate_workspace_rent', [other]), /Finance access/);
			await rpc('generate_workspace_rent', [org]);
			const before = Number(await scalar('select count(*) from charges'));
			await rpc('generate_workspace_rent', [org]);
			assert.equal(Number(await scalar('select count(*) from charges')), before);
		});
		await t.test(
			'finance staff can receipt a payment with email delivery queued once',
			async () => {
				await asUser(finance);
				const id = await rpc('record_workspace_payment', [
					org,
					{ ...payment, submission_key: randomUUID(), amount: 1 }
				]);
				await rpc('issue_workspace_receipt', [org, id]);
				assert.equal(
					Number(
						await scalar('select count(*) from notification_outbox where idempotency_key=$1', [
							'receipt:' + id
						])
					),
					1
				);
				await asUser(manager);
			}
		);
	} finally {
		await db.close();
	}
});
