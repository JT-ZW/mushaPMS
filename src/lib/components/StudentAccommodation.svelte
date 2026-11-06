<script lang="ts">
	import { rentableSpaces } from '$lib/dashboard/portfolio';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { workspaceSubmit } from '$lib/forms/workspace-submit';
	type Property = { id: string; name: string; module_key?: string; status: string };
	type Space = {
		id: string;
		property_id: string;
		name: string;
		kind: string;
		parent_space_id?: string | null;
		status: string;
	};
	type Lease = {
		id: string;
		space_id: string;
		status: string;
		billing_frequency: string;
		rent_amount: string | number;
	};
	let { data } = $props<{
		data: {
			organization: { id: string; currency_code: string };
			membership: { role: string };
			properties: Property[];
			spaces: Space[];
			tenancies: Lease[];
			parties: { tenancy_id: string; person_id: string; role: string }[];
			people: { id: string; first_name: string; last_name: string }[];
			academicTerms: {
				id: string;
				name: string;
				start_on: string;
				end_on: string;
				due_on: string;
			}[];
		};
	}>();
	const houses = $derived(
		data.properties.filter((p: Property) => p.module_key === 'student' && p.status === 'active')
	);
	const canConfigureTerms = $derived(['owner', 'admin', 'manager'].includes(data.membership.role));
	const rentableBeds = $derived(
		rentableSpaces<Space>(data.properties, data.spaces).filter((s: Space) => s.kind === 'bed')
	);
	const bedsFor = (room: string) =>
		rentableBeds.filter(
			(s: Space) => s.parent_space_id === room && s.kind === 'bed' && s.status !== 'inactive'
		);
	const student = (bed: string) => {
		const lease = data.tenancies.find(
			(t: Lease) => t.space_id === bed && ['active', 'ending_soon', 'draft'].includes(t.status)
		);
		const party = data.parties.find(
			(p: { tenancy_id: string; person_id: string; role: string }) =>
				p.tenancy_id === lease?.id && p.role === 'primary'
		);
		const person = data.people.find(
			(p: { id: string; first_name: string; last_name: string }) => p.id === party?.person_id
		);
		return person ? person.first_name + ' ' + person.last_name : '';
	};
	const termly = $derived(
		data.tenancies.filter(
			(t: Lease) => t.billing_frequency === 'termly' && ['active', 'ending_soon'].includes(t.status)
		)
	);
</script>

<div class="students aligned-workspace">
	<header>
		<div>
			<p class="eyebrow">STUDENT ACCOMMODATION</p>
			<h1>Every student. A place of their own.</h1>
			<p>
				Manage capacity by bed, occupancy by room, and each student's lease and account separately.
			</p>
		</div>
		<a class="primary" href={resolve(`/workspace/${data.organization.id}/new-tenant`)}
			>Allocate a student</a
		>
	</header>
	{#each houses as house (house.id)}
		<section class="panel">
			<h2>{house.name}</h2>
			<p>
				{rentableBeds.filter(
					(s: Space) => s.property_id === house.id && s.kind === 'bed' && s.status === 'occupied'
				).length} occupied beds / {rentableBeds.filter(
					(s: Space) => s.property_id === house.id && s.kind === 'bed' && s.status !== 'inactive'
				).length} places
			</p>
			<div class="rooms">
				{#each data.spaces.filter((s: Space) => s.property_id === house.id && s.kind === 'room' && s.status !== 'inactive') as room (room.id)}{@const beds =
						bedsFor(room.id)}
					<article>
						<div class="room-title">
							<h3>{room.name}</h3>
							<strong
								>{beds.filter((b: Space) => b.status === 'occupied').length}/{beds.length} occupied</strong
							>
						</div>
						<progress
							value={beds.filter((b: Space) => b.status === 'occupied').length}
							max={Math.max(1, beds.length)}
							aria-label={`${room.name} occupied places`}
						></progress>
						<ul>
							{#each beds as bed (bed.id)}<li>
									<span>{bed.name}<small>{student(bed.id) || 'No student allocated'}</small></span
									><span class="badge">{bed.status}</span>
								</li>{/each}
						</ul>
					</article>{:else}<p>No rooms configured. Add a room and its bed capacity below.</p>{/each}
			</div>
		</section>
	{:else}<section class="panel">
			<h2>Add a student property first</h2>
			<p>Open Properties → Add property and choose Student accommodation.</p>
			<a href={resolve(`/workspace/${data.organization.id}/properties`)}>Open properties</a>
		</section>{/each}
	<section class="panel">
		<h2>Configure a room</h2>
		<p>
			Capacity creates one individually rentable bed space per student. Rent and deposit below are
			per student.
		</p>
		<form
			method="POST"
			action="?/createStudentRoom"
			use:enhance={workspaceSubmit}
			data-managed-feedback="true"
			data-reset-on-success="true"
			class="form-grid"
		>
			<label
				>Student property<select name="property_id" required
					><option value="">Choose property</option>{#each houses as house (house.id)}<option
							value={house.id}>{house.name}</option
						>{/each}</select
				></label
			>
			<label>Room name<input name="room_name" required placeholder="Room 1" /></label><label
				>Student capacity<input name="bed_count" type="number" min="1" max="100" required /></label
			><label
				>Default monthly rent per student<input
					name="rent"
					type="number"
					min="0"
					step="0.01"
					required
				/></label
			><label
				>Deposit per student<input
					name="deposit"
					type="number"
					min="0"
					step="0.01"
					value="0"
					required
				/></label
			><button type="submit" class="primary" disabled={!houses.length}
				>Create room &amp; beds</button
			>
		</form>
	</section>
	<section class="panel">
		<h2>Academic terms</h2>
		<p>
			Term rent uses these dates, rather than a fixed three-month interval. Set the per-term amount
			on each student's lease.
		</p>
		<ul>
			{#each data.academicTerms as term (term.id)}<li>
					<strong>{term.name}</strong><span
						>{term.start_on} – {term.end_on} · due {term.due_on}</span
					>
				</li>{:else}<li>No academic terms yet. Monthly billing is available.</li>{/each}
		</ul>
		{#if canConfigureTerms}<form
				method="POST"
				action="?/createAcademicTerm"
				use:enhance={workspaceSubmit}
				data-managed-feedback="true"
				data-reset-on-success="true"
				class="form-grid"
			>
				<label>Term name<input name="name" required /></label><label
					>Start<input name="start_on" type="date" required /></label
				><label>End<input name="end_on" type="date" required /></label><label
					>Rent due date<input name="due_on" type="date" required /></label
				><button type="submit" class="primary">Add academic term</button>
			</form>{/if}
	</section>
	<section class="panel">
		<h2>Bill a term</h2>
		<p>
			The initial term is charged at check-in. Generate the next term once its dates overlap the
			student's lease; repeated submissions reuse the charge.
		</p>
		<form
			method="POST"
			action="?/billAcademicTerm"
			use:enhance={workspaceSubmit}
			data-managed-feedback="true"
			class="form-grid"
		>
			<label
				>Student lease<select name="tenancy_id" required
					><option value="">Choose a termly lease</option>{#each termly as lease (lease.id)}<option
							value={lease.id}
							>{student(lease.space_id)} · {data.spaces.find((s: Space) => s.id === lease.space_id)
								?.name}</option
						>{/each}</select
				></label
			><label
				>Academic term<select name="academic_term_id" required
					><option value="">Choose term</option>{#each data.academicTerms as term (term.id)}<option
							value={term.id}>{term.name}</option
						>{/each}</select
				></label
			><button type="submit" class="primary" disabled={!termly.length}>Generate term charge</button>
		</form>
	</section>
</div>

<style>
	.students {
		display: grid;
		gap: 1.2rem;
	}
	.students header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
	}
	.students header h1 {
		font-size: clamp(1.7rem, 3vw, 2.6rem);
		letter-spacing: -0.05em;
	}
	.students p {
		color: #73816c;
		font-size: 0.9rem;
		line-height: 1.7;
	}
	.students .panel {
		padding: 1.5rem;
		background: #fffefb;
		border: 1px solid #dce3d6;
		border-radius: 14px;
	}
	.students h2 {
		font-size: 1.4rem;
		font-weight: 550;
	}
	.rooms {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
		gap: 1rem;
	}
	.rooms article {
		padding: 1rem;
		background: #f4f6ed;
		border-radius: 10px;
	}
	.room-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	.room-title h3 {
		font-size: 1rem;
	}
	.room-title strong {
		font-size: 0.8rem;
	}
	.students progress {
		width: 100%;
		height: 7px;
		accent-color: #315942;
	}
	.students ul {
		list-style: none;
		padding: 0;
		margin: 1rem 0;
	}
	.students li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.7rem 0;
		border-bottom: 1px solid #dfe5d8;
		font-size: 0.85rem;
	}
	.students small {
		display: block;
		color: #72816e;
		margin-top: 0.3rem;
	}
	.students .form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 1rem;
		align-items: end;
	}
	.students label {
		display: grid;
		gap: 0.5rem;
		font-size: 0.85rem;
	}
	.students input,
	.students select {
		min-width: 0;
		width: 100%;
		box-sizing: border-box;
		padding: 0.75rem;
		border: 1px solid #d4decd;
		border-radius: 7px;
		color: #294333;
		background: white;
	}
	.students .primary {
		padding: 0.8rem 1rem;
		background: #294c3b;
		color: white;
		border: 0;
		border-radius: 7px;
		text-decoration: none;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.students button:disabled {
		opacity: 0.5;
	}
	.students .badge {
		font-size: 0.7rem;
		border-radius: 20px;
		background: #e5edda;
		padding: 0.3rem 0.6rem;
	}
	@media (max-width: 650px) {
		.students header {
			display: block;
		}
		.students header > a {
			display: inline-block;
			margin-top: 0.5rem;
		}
		.students li {
			flex-wrap: wrap;
		}
		.rooms {
			grid-template-columns: 1fr;
		}
	}
</style>
