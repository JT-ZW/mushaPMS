import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { workflowDatabase } from './helpers/workflow-db.mjs';

test('estate boundaries and student accommodation', async (t) => {
	const db = await workflowDatabase();
	try {
		const owner = randomUUID(),
			estate = randomUUID(),
			org = randomUUID(),
			house = randomUUID(),
			other = randomUUID();
		await db.query('insert into auth.users(id) values($1),($2)', [owner, estate]);
		await db.query(
			"insert into organizations(id,name,slug,created_by,status) values($1,'Campus','campus',$2,'active')",
			[org, owner]
		);
		await db.query(
			"insert into organization_members(organization_id,user_id,role) values($1,$2,'owner'),($1,$3,'viewer')",
			[org, owner, estate]
		);
		await db.query(
			"insert into organization_modules(organization_id,module_key) values($1,'student')",
			[org]
		);
		await db.query(
			"insert into properties(id,organization_id,name,module_key) values($1,$3,'Student House','student'),($2,$3,'Unassigned house','residential')",
			[house, other, org]
		);
		await db.query('insert into organization_workspace_settings(organization_id) values($1)', [
			org
		]);
		const asUser = async (id) => {
			await db.exec('reset role');
			await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
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
		const today = await scalar('select current_date::text');
		await asUser(owner);
		await t.test(
			'assignment requires at least one property and only existing non-owner members',
			async () => {
				await assert.rejects(rpc('assign_estate_manager', [org, estate, []]), /at least one/);
				await assert.rejects(rpc('assign_estate_manager', [org, owner, [house]]), /non-owner/);
				await rpc('assign_estate_manager', [org, estate, [house]]);
			}
		);
		await t.test(
			'estate manager only sees assigned properties, cannot assign themselves, and cannot edit organization settings',
			async () => {
				await asUser(estate);
				assert.deepEqual(
					(await db.query('select id from properties')).rows.map((r) => r.id),
					[house]
				);
				assert.equal(
					Number(await scalar('select count(*) from properties where id=$1', [other])),
					0
				);
				await assert.rejects(
					rpc('assign_estate_manager', [org, estate, [other]]),
					/Portfolio manager/
				);
				assert.equal(
					(
						await db.query(
							"update organization_workspace_settings set legal_name='Hacked' where organization_id=$1 returning organization_id",
							[org]
						)
					).rows.length,
					0
				);
			}
		);
		let room, beds, term, lease;
		await t.test(
			'room capacity creates individual student places within an assigned student house',
			async () => {
				room = await rpc('create_student_room', [house, 'Room 1', 3, 100, 50]);
				beds = (
					await db.query('select id from spaces where parent_space_id=$1 order by name', [room])
				).rows.map((r) => r.id);
				assert.equal(beds.length, 3);
				assert.equal(Number(await scalar('select capacity from spaces where id=$1', [room])), 3);
				await assert.rejects(
					rpc('create_student_room', [other, 'Other', 2, 100, 0]),
					/Property access/
				);
			}
		);
		await asUser(owner);
		term = (
			await db.query(
				"insert into academic_terms(organization_id,name,start_on,end_on,due_on) values($1,'Term 1',current_date,current_date+90,current_date) returning id",
				[org]
			)
		).rows[0].id;
		const payload = {
			submission_key: randomUUID(),
			space_id: beds[0],
			first_name: 'Student',
			last_name: 'One',
			start_date: today,
			end_date: '2035-12-31',
			rent_amount: 300,
			deposit_amount: 50,
			deposit_received: 0,
			checked_in: true,
			billing_frequency: 'termly',
			academic_term_id: term,
			notice_period_days: 30,
			first_due_on: today
		};
		await asUser(estate);
		await t.test(
			'student is leased individually with one term charge, not monthly rent',
			async () => {
				lease = await rpc('onboard_tenant', [org, payload]);
				assert.equal(
					await scalar('select academic_term_id from tenancies where id=$1', [lease]),
					term
				);
				const charges = (
					await db.query(
						"select automation_key,amount from charges where tenancy_id=$1 and charge_type='rent'",
						[lease]
					)
				).rows;
				assert.equal(charges.length, 1);
				assert.equal(charges[0].automation_key, `term:${lease}:${term}`);
			}
		);
		await t.test(
			'multiple students share a room without sharing leases or filling other beds',
			async () => {
				await rpc('onboard_tenant', [
					org,
					{
						...payload,
						submission_key: randomUUID(),
						space_id: beds[1],
						first_name: 'Student Two',
						billing_frequency: 'monthly',
						academic_term_id: null,
						rent_amount: 100
					}
				]);
				assert.equal(
					Number(
						await scalar(
							"select count(*) from spaces where parent_space_id=$1 and status='occupied'",
							[room]
						)
					),
					2
				);
				assert.equal(await scalar('select status from spaces where id=$1', [beds[2]]), 'vacant');
				await assert.rejects(
					rpc('onboard_tenant', [
						org,
						{ ...payload, submission_key: randomUUID(), space_id: room }
					]),
					/no longer available|individual bed/
				);
			}
		);
		await t.test(
			'term charge retries are idempotent and cross-property student onboarding is denied',
			async () => {
				await rpc('bill_academic_term', [lease, term]);
				await rpc('bill_academic_term', [lease, term]);
				assert.equal(
					Number(
						await scalar('select count(*) from charges where automation_key=$1', [
							`term:${lease}:${term}`
						])
					),
					1
				);
				await db.exec('reset role');
				const foreign = (
					await db.query(
						"insert into spaces(organization_id,property_id,name) values($1,$2,'Other room') returning id",
						[org, other]
					)
				).rows[0].id;
				await asUser(estate);
				await assert.rejects(
					rpc('onboard_tenant', [
						org,
						{
							...payload,
							space_id: foreign,
							submission_key: randomUUID(),
							billing_frequency: 'monthly'
						}
					]),
					/assigned active/
				);
			}
		);
		await t.test('hidden-property records and definer RPCs remain inaccessible', async () => {
			await asUser(owner);
			const foreign = (
				await db.query(
					"insert into spaces(organization_id,property_id,name) values($1,$2,'Private unit') returning id",
					[org, other]
				)
			).rows[0].id;
			const hiddenKey = randomUUID();
			const hiddenLease = await rpc('onboard_tenant', [
				org,
				{
					...payload,
					space_id: foreign,
					submission_key: hiddenKey,
					first_name: 'Private Tenant',
					billing_frequency: 'monthly',
					academic_term_id: null
				}
			]);
			const hiddenPayment = await rpc('record_workspace_payment', [
				org,
				{
					submission_key: randomUUID(),
					tenancy_id: hiddenLease,
					amount: 10,
					payment_date: today,
					method: 'cash',
					auto_allocate: false,
					generate_receipt: true
				}
			]);
			const hiddenPerson = await scalar(
				'select person_id from tenancy_parties where tenancy_id=$1',
				[hiddenLease]
			);
			await asUser(estate);
			await assert.rejects(
				rpc('onboard_tenant', [org, { ...payload, space_id: beds[2], submission_key: hiddenKey }]),
				/Submission access/
			);
			for (const [table, field, id] of [
				['tenancies', 'id', hiddenLease],
				['charges', 'tenancy_id', hiddenLease],
				['people', 'id', hiddenPerson],
				['payments', 'id', hiddenPayment],
				['billing_documents', 'payment_id', hiddenPayment]
			]) {
				assert.equal(
					Number(await scalar(`select count(*) from ${table} where ${field}=$1`, [id])),
					0
				);
			}
			await assert.rejects(
				rpc('allocate_payment_to_oldest_charges', [hiddenPayment]),
				/Payment access/
			);
			await assert.rejects(
				rpc('issue_workspace_receipt', [org, hiddenPayment]),
				/Payment not found/
			);
			await assert.rejects(
				db.query(
					"insert into tenancy_parties(tenancy_id,person_id,role) values($1,$2,'guardian')",
					[lease, hiddenPerson]
				),
				/Person access/
			);
			assert.equal(
				await scalar("select private.estate_storage_access('tenant-documents',$1)", [
					`${org}/${hiddenPerson}/private.pdf`
				]),
				false
			);
		});
		await t.test(
			'a second student cannot be added as an occupant of an already allocated bed',
			async () => {
				const secondLease = await scalar('select id from tenancies where space_id=$1', [beds[1]]);
				const secondPerson = await scalar(
					'select person_id from tenancy_parties where tenancy_id=$1',
					[secondLease]
				);
				await assert.rejects(
					db.query(
						"insert into tenancy_parties(tenancy_id,person_id,role) values($1,$2,'occupant')",
						[lease, secondPerson]
					),
					/one individual student/
				);
			}
		);
		await t.test(
			'capacity cannot be exceeded and one student can leave without releasing another bed',
			async () => {
				await assert.rejects(
					db.query(
						"insert into spaces(organization_id,property_id,parent_space_id,name,kind,capacity) values($1,$2,$3,'Extra bed','bed',1)",
						[org, house, room]
					),
					/capacity reached/
				);
				await rpc('transition_lease', [
					org,
					lease,
					'move_out',
					{
						move_out_date: today,
						inspection_notes: 'Keys returned',
						deposit_refund_amount: 0,
						deposit_deduction_amount: 0,
						settlement_notes:
							'Outstanding rent and deposit retained for collection; no deposit received'
					}
				]);
				assert.equal(await scalar('select status from spaces where id=$1', [beds[0]]), 'vacant');
				assert.equal(await scalar('select status from spaces where id=$1', [beds[1]]), 'occupied');
			}
		);
		await t.test(
			'owner can assign multiple properties and removing the last assignment fails at commit',
			async () => {
				await asUser(owner);
				await rpc('assign_estate_manager', [org, estate, [house, other]]);
				await asUser(estate);
				assert.equal(Number(await scalar('select count(*) from properties')), 2);
				await db.exec('reset role');
				await assert.rejects(
					db.query('delete from property_manager_assignments where user_id=$1', [estate]),
					/at least one/
				);
				assert.equal(
					Number(
						await scalar('select count(*) from property_manager_assignments where user_id=$1', [
							estate
						])
					),
					2
				);
			}
		);
	} finally {
		await db.close();
	}
});
