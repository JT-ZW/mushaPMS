<script lang="ts">
	import { resolve } from '$app/paths';
	import MarketingShell from '$lib/components/MarketingShell.svelte';
	import PropertyPreview from '$lib/components/PropertyPreview.svelte';
	const capabilities = [
		[
			'01',
			'A place for every property.',
			'Keep buildings, units, rooms and occupancy in a dependable portfolio register.',
			'Properties & spaces'
		],
		[
			'02',
			'Relationships, remembered.',
			'Connect tenants, owners, leases and documents to the places they belong.',
			'People & leases'
		],
		[
			'03',
			'A clearer view of your money.',
			'Bring rent charges, receipts, expenses and collection follow-ups into the same picture.',
			'Finance & collections'
		],
		[
			'04',
			'Care that keeps moving.',
			'Take maintenance from the first report to a resolved request, with clear responsibility.',
			'Maintenance operations'
		]
	];
</script>

<svelte:head
	><title>Musha PMS — Property, properly managed.</title><meta
		name="description"
		content="A considered property management platform for residential teams. Connect properties, leases, rent and maintenance in one workspace. Made in Zimbabwe."
	/><link rel="preload" as="image" href="/images/musha-architecture.jpg" /></svelte:head
>
<MarketingShell overlay>
	<main id="main-content">
		<section class="estate-hero">
			<img
				class="hero-photo"
				src="/images/musha-architecture.jpg"
				alt="A contemporary residence at dusk, with warm interior lighting and a landscaped garden"
				fetchpriority="high"
				width="2400"
				height="1600"
			/>
			<div class="hero-shade"></div>
			<div class="hero-content">
				<p class="eyebrow light">Thoughtfully built. For the way you manage.</p>
				<h1>Exceptional places.<br />Beautifully <em>managed.</em></h1>
				<div class="hero-bottom">
					<p>
						The people. The properties. The everyday details.<br class="desktop-break" /> One considered
						workspace to bring it all together.
					</p>
					<a class="button button-lime" href={resolve('/demo')}>Step inside Musha <span>↗</span></a>
				</div>
			</div>
			<div class="hero-caption">
				<span>01 / THE MUSHA PERSPECTIVE</span><a href="#introduction"
					>A better view starts here <span>↓</span></a
				><span>BUILT IN ZIMBABWE. BUILT AROUND YOU.</span>
			</div>
		</section>
		<div class="principle-strip">
			<span>Property management, with perspective.</span><span
				>Residential first <i>✳</i> People connected <i>✳</i> Details considered</span
			>
		</div>
		<section class="section introduction" id="introduction" data-reveal>
			<div>
				<p class="eyebrow">01 / A more considered way</p>
				<h2>Less keeping up.<br />More <em>looking ahead.</em></h2>
			</div>
			<div class="intro-copy">
				<p class="large-copy">
					Great property management happens in the details. Musha gives them a place to belong.
				</p>
				<p>
					From the first lease to the next repair, see what needs your attention without piecing it
					together from spreadsheets and messages. A connected daily view for owners, managers and
					the teams behind every address.
				</p>
				<a class="text-link" href={resolve('/why-musha')}>Get to know Musha <span>↗</span></a>
			</div>
		</section>
		<section class="feature-editorial">
			<div class="feature-photo" data-reveal>
				<img
					src="/images/musha-residence.jpg"
					alt="A bright contemporary home with natural wood finishes and large windows"
					loading="lazy"
					width="1400"
					height="1000"
				/><span class="photo-label">GOOD FOUNDATIONS. BETTER EVERYDAYS.</span>
			</div>
			<div class="capability-list" data-reveal>
				<p class="eyebrow">02 / Every detail, connected</p>
				{#each capabilities as item (item[0])}<a class="capability" href={resolve('/solutions')}
						><span class="item-number">{item[0]}</span>
						<div>
							<small>{item[3]}</small>
							<h3>{item[1]}</h3>
							<p>{item[2]}</p>
						</div>
						<span class="item-arrow">↗</span></a
					>{/each}
			</div>
		</section>
		<section class="workspace-section section">
			<div class="workspace-copy" data-reveal>
				<p class="eyebrow">03 / Your daily perspective</p>
				<h2>The whole picture.<br /><em>Finally in view.</em></h2>
				<p>
					Start the day with your portfolio in focus. Move from a property to a tenancy, from an
					outstanding charge to its next action. The context stays with you.
				</p>
				<a class="button button-green" href={resolve('/demo')}
					>Explore the product tour <span>↗</span></a
				><small class="quiet-note">Explore with sample data. No account needed.</small>
			</div>
			<div data-reveal><PropertyPreview /></div>
		</section>
		<section class="portfolio-section section" data-reveal>
			<div class="section-heading">
				<div>
					<p class="eyebrow">04 / Room to grow</p>
					<h2>For the places<br /><em>you call your portfolio.</em></h2>
				</div>
				<p>
					Begin with residential. Build on a foundation designed to support the shape of your
					business as it grows.
				</p>
			</div>
			<div class="property-types">
				<a class="property-type residential" href={resolve('/platform')}
					><img
						src="/images/musha-interior.jpg"
						alt="An inviting residential living room with natural textures"
						loading="lazy"
						width="1400"
						height="1000"
					/><span class="type-status">AVAILABLE TODAY</span>
					<div>
						<small>01 / RESIDENTIAL</small>
						<h3>A better home<br />for home management.</h3>
						<span>Explore residential <b>↗</b></span>
					</div></a
				>
				<div class="future-types">
					<a href={resolve('/platform')}
						><span>02</span>
						<div>
							<h3>Commercial</h3>
							<small>ON THE ROADMAP</small>
						</div>
						<b>↗</b></a
					><a href={resolve('/platform')}
						><span>03</span>
						<div>
							<h3>Student living</h3>
							<small>ON THE ROADMAP</small>
						</div>
						<b>↗</b></a
					><a href={resolve('/platform')}
						><span>04</span>
						<div>
							<h3>Short stay</h3>
							<small>FUTURE CONNECTION</small>
						</div>
						<b>↗</b></a
					>
					<p>Different places. The same care for the details.</p>
				</div>
			</div>
		</section>
		<section class="brand-story">
			<div data-reveal>
				<p class="eyebrow light">More than a name</p>
				<h2>A place.<br />Its people.<br /><em>The care between.</em></h2>
			</div>
			<div class="story-copy" data-reveal>
				<span class="story-word">musha <small>/ moo-shah /</small></span>
				<p>
					In Shona, <em>musha</em> means home or homestead. A place shaped by the people who belong there.
				</p>
				<p>
					We bring that same idea to property management: thoughtful systems that help you look
					after the places, and the people, in your care.
				</p>
				<a class="text-link" href={resolve('/why-musha')}
					>The thinking behind Musha <span>↗</span></a
				>
			</div>
		</section>
		<section class="closing-cta section" data-reveal>
			<p class="eyebrow">Your next chapter starts here</p>
			<h2>Make room for<br /><em>better management.</em></h2>
			<div>
				<p>Join the Musha beta. Let’s give your<br />portfolio the foundation it deserves.</p>
				<a class="button button-green" href={resolve('/contact')}
					>Let’s talk about your portfolio <span>↗</span></a
				>
			</div>
		</section>
	</main>
</MarketingShell>
