<script lang="ts">
	import { resolve } from '$app/paths';
	import MarketingShell from '$lib/components/MarketingShell.svelte';
	import PropertyPreview from '$lib/components/PropertyPreview.svelte';
	const models = [
		[
			'01',
			'Residential',
			'Homes, apartments, rooms and the tenancies, collections and care behind them.',
			'Available today'
		],
		[
			'02',
			'Commercial',
			'A planned extension for offices, shops, mixed-use buildings and commercial leases.',
			'On the roadmap'
		],
		[
			'03',
			'Student living',
			'A planned operating model for campuses, beds and shared student accommodation.',
			'On the roadmap'
		],
		[
			'04',
			'Short stay',
			'A future connection for guest stays, lodges and tourism property operations.',
			'Future connection'
		]
	];
</script>

<svelte:head
	><title>The platform — Musha PMS</title><meta
		name="description"
		content="Explore Musha’s connected residential property management platform, from your portfolio register to collections and maintenance."
	/></svelte:head
>
<MarketingShell
	><main id="main-content">
		<section class="editorial-hero">
			<div>
				<p class="eyebrow">The Musha platform</p>
				<h1>Good foundations.<br /><em>For every address.</em></h1>
				<p class="description">
					Your portfolio is more than a list of properties. Musha connects the people, agreements
					and daily work that make each one run well.
				</p>
				<a class="button button-green" href={resolve('/demo')}
					>Explore the workspace <span>↗</span></a
				>
			</div>
			<figure>
				<img
					src="/images/musha-architecture.jpg"
					alt="Contemporary residential architecture surrounded by greenery"
					width="1400"
					height="1000"
				/>
				<figcaption>BUILT AROUND THE WORK BEHIND THE PROPERTY.</figcaption>
			</figure>
		</section>
		<div class="editorial-band">
			<span>ONE CONNECTED WORKSPACE</span><span>RESIDENTIAL OPERATIONS, AVAILABLE TODAY</span><span
				>DESIGNED FOR GROWING TEAMS</span
			>
		</div>
		<section class="section two-column" data-reveal>
			<div>
				<p class="eyebrow">The daily essentials</p>
				<h2>A place for the work.<br /><em>Space for perspective.</em></h2>
				<p>
					Keep your portfolio register, people, leases, rent and maintenance together. Give your
					team a reliable starting point for each working day.
				</p>
				<a class="text-link" href={resolve('/solutions')}>See the workspaces <span>↗</span></a>
			</div>
			<PropertyPreview />
		</section>
		<section class="section" data-reveal>
			<p class="eyebrow">Your portfolio, your pace</p>
			<h2>Start with residential.<br /><em>Leave room for what’s next.</em></h2>
			<div class="model-table">
				{#each models as model (model[0])}<article class="model-row">
						<span>{model[0]}</span>
						<h3>{model[1]}</h3>
						<p>{model[2]}</p>
						<span class="status" class:available={model[0] === '01'}>{model[3]}</span>
					</article>{/each}
			</div>
		</section>
		<section class="dark-section">
			<div class="section two-column" data-reveal>
				<div>
					<p class="eyebrow">Considered from the start</p>
					<h2>Your team.<br /><em>The right context.</em></h2>
					<p>
						A connected system works best when everyone knows where they belong. Musha organizes
						access and work around your organization.
					</p>
				</div>
				<div class="numbered-list">
					<article>
						<span>01</span>
						<div>
							<h3>Work with clear roles</h3>
							<p>Bring people into your team with role-aware access to the operations they need.</p>
						</div>
					</article>
					<article>
						<span>02</span>
						<div>
							<h3>Keep the record together</h3>
							<p>
								Connect documents, payments and maintenance requests to the right people and spaces.
							</p>
						</div>
					</article>
					<article>
						<span>03</span>
						<div>
							<h3>Make the next decision easier</h3>
							<p>
								Use occupancy, collections and operating reports to understand where attention is
								needed.
							</p>
						</div>
					</article>
				</div>
			</div>
		</section>
		<section class="section closing-cta" data-reveal>
			<p class="eyebrow">See how it fits</p>
			<h2>A better foundation<br /><em>for your portfolio.</em></h2>
			<div>
				<p>Tell us how you manage today.<br />We’ll help you find your starting point.</p>
				<a class="button button-green" href={resolve('/contact')}
					>Talk to the Musha team <span>↗</span></a
				>
			</div>
		</section>
	</main></MarketingShell
>
