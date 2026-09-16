<script lang="ts">
	import MarketingHeader from '$lib/components/MarketingHeader.svelte';
	import MarketingFooter from '$lib/components/MarketingFooter.svelte';
	import { applicationHref } from '$lib/marketing';
</script>

<svelte:head
	><title>Why Musha · Musha PMS</title><meta
		name="description"
		content="Why property teams choose Musha PMS to keep their portfolio clear, connected and moving."
	/></svelte:head
><MarketingHeader />
<main>
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<section class="hero">
		<div>
			<p>WHY MUSHA</p>
			<h1>Property work is<br />too important to<br /><em>live everywhere.</em></h1>
			<span
				>When the portfolio lives across spreadsheets, messages, notebooks and memory, every
				decision takes longer. Musha brings the work back into one calm, accountable place.</span
			><!-- eslint-disable-next-line svelte/no-navigation-without-resolve --><a
				href={applicationHref()}>Sign in to Musha →</a
			>
		</div>
		<div class="art"><i></i><i></i><i></i><b>M</b><span></span></div>
	</section>
	<section class="value">
		<div>
			<p>THE VALUE OF A BETTER VIEW</p>
			<h2>Less chasing.<br /><em>More control.</em></h2>
			<span
				>Musha gives property owners and managers the context to move work forward—without needing
				to hunt through disconnected systems.</span
			>
		</div>
		<div class="value-list">
			<article>
				<i>01</i><span
					><b>Know what is happening</b><small
						>See properties, occupancy, collection activity and maintenance work in a single
						operating picture.</small
					></span
				>
			</article>
			<article>
				<i>02</i><span
					><b>Act before value slips</b><small
						>Make arrears, renewals, requests and follow-ups visible early enough to do something
						useful.</small
					></span
				>
			</article>
			<article>
				<i>03</i><span
					><b>Give people clear ownership</b><small
						>Connect each task, payment and tenancy to the right property, person and next action.</small
					></span
				>
			</article>
		</div>
	</section>
	<section class="proof">
		<p>BUILT FOR THE WORK BEHIND THE PORTFOLIO</p>
		<h2>One place for the<br /><em>details that matter.</em></h2>
		<div>
			{#each [['Properties', 'A reliable record of every location, space and occupancy signal.'], ['People', 'Tenants, owners, teams and vendors connected to the right work.'], ['Money', 'Charges, payments, invoices, expenses and collection follow-ups with context.'], ['Maintenance', 'Clear requests, ownership, vendors and progress from report to resolution.']] as item (item[0])}<article
				>
					<i>✦</i><b>{item[0]}</b><span>{item[1]}</span>
				</article>{/each}
		</div>
	</section>
	<section class="promise">
		<div class="quote">
			“A good property system should make the day feel more manageable—not more complicated.”
		</div>
		<div>
			<p>THE MUSHA PROMISE</p>
			<h2>Built with the<br /><em>next decision</em> in mind.</h2>
			<span
				>Start with a better residential operating rhythm today. Keep the same foundation as your
				team, portfolio and ambition grow.</span
			><!-- eslint-disable-next-line svelte/no-navigation-without-resolve --><a
				href={applicationHref()}>Step into your workspace →</a
			>
		</div>
	</section>
	<section class="cta">
		<div>
			<p>READY FOR A CLEARER DAY?</p>
			<h2>Bring the work<br /><em>home.</em></h2>
		</div>
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a href={applicationHref()}>Sign in to Musha →</a>
	</section>
</main>
<MarketingFooter />

<style>
	:global(body) {
		margin: 0;
		background: #fbfaf7;
		color: #133d35;
		font-family: var(--font-body);
	}
	.hero {
		display: grid;
		grid-template-columns: 1.15fr 0.85fr;
		gap: 70px;
		align-items: center;
		padding: 105px clamp(24px, 11vw, 210px);
		background:
			radial-gradient(circle at 84% 28%, #f5ce98, transparent 23%),
			linear-gradient(130deg, #eef4e9, #faf7ef);
	}
	.hero p,
	.value p,
	.proof > p,
	.promise p,
	.cta p {
		color: #59806b;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.17em;
	}
	.hero h1,
	.value h2,
	.proof h2,
	.promise h2,
	.cta h2 {
		margin: 18px 0 23px;
		font-size: clamp(49px, 6.5vw, 87px);
		line-height: 0.87;
		letter-spacing: -0.1em;
	}
	em {
		color: #28836a;
		font-style: normal;
	}
	.hero > div > span,
	.value > div > span,
	.promise > div > span {
		display: block;
		max-width: 500px;
		color: #617b6f;
		font-size: 16px;
		line-height: 1.75;
	}
	.hero a,
	.promise a,
	.cta a {
		display: inline-block;
		margin-top: 28px;
		padding: 14px 17px;
		border-radius: 8px;
		background: #0d5548;
		color: #fff;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
	}
	.art {
		position: relative;
		width: min(100%, 320px);
		height: 290px;
		margin-left: auto;
		overflow: hidden;
		border-radius: 160px 160px 15px 15px;
		background: #174f46;
	}
	.art i {
		position: absolute;
		bottom: 0;
		border: 19px solid #9ace70;
		border-bottom: 0;
		border-radius: 100px 100px 0 0;
	}
	.art i:first-child {
		width: 170px;
		height: 180px;
		left: 25px;
		opacity: 0.5;
	}
	.art i:nth-child(2) {
		width: 165px;
		height: 215px;
		right: -30px;
	}
	.art i:nth-child(3) {
		width: 130px;
		height: 120px;
		left: -55px;
		border-color: #477e68;
	}
	.art b {
		position: absolute;
		left: 39%;
		top: 62px;
		color: #e5f1d8;
		font-size: 100px;
		letter-spacing: -0.15em;
	}
	.art span {
		position: absolute;
		right: 35px;
		top: 40px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #f0c789;
	}
	.value {
		display: grid;
		grid-template-columns: 0.8fr 1.2fr;
		gap: clamp(45px, 10vw, 160px);
		padding: 115px clamp(24px, 11vw, 210px);
	}
	.value h2,
	.proof h2,
	.promise h2 {
		font-size: clamp(41px, 5vw, 66px);
	}
	.value-list {
		display: grid;
		gap: 7px;
	}
	.value-list article {
		display: flex;
		gap: 14px;
		padding: 16px 0;
		border-bottom: 1px solid #dce8da;
	}
	.value-list i {
		color: #74a06d;
		font-size: 11px;
		font-style: normal;
		font-weight: 800;
	}
	.value-list b,
	.value-list small {
		display: block;
	}
	.value-list b {
		font-size: 15px;
	}
	.value-list small {
		max-width: 370px;
		margin-top: 6px;
		color: #71877d;
		font-size: 12px;
		line-height: 1.55;
	}
	.proof {
		padding: 100px clamp(24px, 11vw, 210px);
		background: #e5efdc;
	}
	.proof > div {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
		margin-top: 44px;
	}
	.proof article {
		min-height: 190px;
		padding: 18px;
		border: 1px solid #cbdcc5;
		border-radius: 10px;
		background: #f6faf2;
	}
	.proof i {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: #dcefd3;
		color: #4d825f;
		font-size: 13px;
		font-style: normal;
	}
	.proof b,
	.proof span {
		display: block;
	}
	.proof b {
		margin-top: 34px;
		font-size: 15px;
	}
	.proof span {
		margin-top: 7px;
		color: #71877d;
		font-size: 11px;
		line-height: 1.6;
	}
	.promise {
		display: grid;
		grid-template-columns: 0.8fr 1.2fr;
		gap: clamp(50px, 10vw, 160px);
		align-items: center;
		padding: 110px clamp(24px, 11vw, 210px);
	}
	.quote {
		padding: 38px 30px;
		border-radius: 14px;
		background: #f1d8bc;
		color: #805a48;
		font-size: clamp(24px, 3vw, 37px);
		line-height: 1.18;
		letter-spacing: -0.05em;
	}
	.promise a {
		background: #a9dc72;
		color: #174b40;
	}
	.cta {
		display: flex;
		align-items: end;
		justify-content: space-between;
		padding: 92px clamp(24px, 11vw, 210px);
		background: #104e44;
	}
	.cta h2 {
		color: #fff;
		font-size: clamp(43px, 5vw, 70px);
	}
	.cta a {
		margin: 0;
		background: #a9dc72;
		color: #174b40;
	}
	@media (max-width: 700px) {
		.hero,
		.value,
		.promise {
			grid-template-columns: 1fr;
			gap: 50px;
			padding: 75px 24px;
		}
		.art {
			margin: 0;
		}
		.proof {
			padding: 75px 24px;
		}
		.proof > div {
			grid-template-columns: 1fr 1fr;
		}
		.cta {
			display: block;
			padding: 70px 24px;
		}
		.cta a {
			margin-top: 23px;
		}
	}
	@media (max-width: 450px) {
		.proof > div {
			grid-template-columns: 1fr;
		}
	}
</style>
