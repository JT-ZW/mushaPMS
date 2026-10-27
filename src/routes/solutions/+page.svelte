<script lang="ts">
	import { resolve } from '$app/paths';
	import MarketingShell from '$lib/components/MarketingShell.svelte';
	const modules = [
		[
			'Properties & spaces',
			'Know every corner of your portfolio.',
			[
				'Register properties, addresses and rental models',
				'Organize buildings, units, rooms and spaces',
				'See occupancy and availability in context'
			]
		],
		[
			'People & leases',
			'Keep the relationship with the record.',
			[
				'Connect tenants, owners, vendors and your team',
				'Manage leases, moves, renewals and documents',
				'See who lives where and what needs attention'
			]
		],
		[
			'Finance & collections',
			'Follow the money, with the context.',
			[
				'Create recurring rent charges and invoices',
				'Record and allocate payments',
				'Follow arrears, expenses and collection actions'
			]
		],
		[
			'Maintenance',
			'Give every request a clear next step.',
			[
				'Log issues against the right property and space',
				'Assign vendors and track progress',
				'Keep attachments, due dates and preventive plans'
			]
		],
		[
			'Reports & tenant portal',
			'A better view for everyone involved.',
			[
				'Review occupancy, collections and operations',
				'Share relevant documents with tenants',
				'Give tenants a place to follow their tenancy'
			]
		],
		[
			'Operating controls',
			'Make space for the way your team works.',
			[
				'Configure organization details and modules',
				'Set invoice, notice and notification defaults',
				'Invite your team with role-aware access'
			]
		]
	];
</script>

<svelte:head
	><title>Solutions — Musha PMS</title><meta
		name="description"
		content="Property records, leases, rent collection, maintenance and reporting. Explore the connected workspaces in Musha PMS."
	/></svelte:head
>
<MarketingShell
	><main id="main-content">
		<section class="editorial-hero">
			<div>
				<p class="eyebrow">Connected property operations</p>
				<h1>The details matter.<br /><em>Keep them together.</em></h1>
				<p class="description">
					Six essential workspaces. Each built around a real part of your property day. All
					connected, so one team can see the whole picture.
				</p>
				<a class="button button-green" href={resolve('/demo')}
					>Take the product tour <span>↗</span></a
				>
			</div>
			<figure>
				<img
					src="/images/musha-interior.jpg"
					alt="A thoughtfully furnished residential living space"
					width="1400"
					height="1000"
				/>
				<figcaption>LESS CHASING THE DETAILS. MORE CARING FOR THE PLACE.</figcaption>
			</figure>
		</section>
		<section class="section" data-reveal>
			<p class="eyebrow">The Musha workspaces</p>
			<h2>Every part of the day.<br /><em>In its place.</em></h2>
			<div class="solution-grid">
				{#each modules as module, i (module[0])}<article class="solution-card">
						<small>0{i + 1} / MUSHA WORKSPACE</small>
						<h3>{module[0]}</h3>
						<p>{module[1]}</p>
						<ul>
							{#each module[2] as detail (detail)}<li>{detail}</li>{/each}
						</ul>
					</article>{/each}
			</div>
		</section>
		<section class="dark-section">
			<div class="section two-column" data-reveal>
				<div>
					<p class="eyebrow">A connected working rhythm</p>
					<h2>From the first record<br /><em>to the next decision.</em></h2>
				</div>
				<div class="numbered-list">
					<article>
						<span>01</span>
						<div>
							<h3>Set the foundation</h3>
							<p>Register your properties, spaces, people and tenancies.</p>
						</div>
					</article>
					<article>
						<span>02</span>
						<div>
							<h3>Run the everyday</h3>
							<p>Collect rent, respond to requests and keep each action in context.</p>
						</div>
					</article>
					<article>
						<span>03</span>
						<div>
							<h3>Look ahead</h3>
							<p>Use the operating picture to plan your team’s next move.</p>
						</div>
					</article>
				</div>
			</div>
		</section>
		<section class="section closing-cta" data-reveal>
			<p class="eyebrow">Find your starting point</p>
			<h2>Your properties.<br /><em>A more connected day.</em></h2>
			<div>
				<p>Let’s talk about the work<br />you want to bring together.</p>
				<a class="button button-green" href={resolve('/contact')}
					>Start the conversation <span>↗</span></a
				>
			</div>
		</section>
	</main></MarketingShell
>
