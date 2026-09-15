<script lang="ts">
	import { resolve } from '$app/paths';

	const capabilities = [
		{
			tag: 'See clearly',
			title: 'One view of the homestead',
			copy: 'Properties, units, people and occupancy brought together so the next decision is always close at hand.',
			mark: '⌂',
			tone: 'leaf'
		},
		{
			tag: 'Collect calmly',
			title: 'Money with a paper trail',
			copy: 'Know what is due, what is late and what has landed—without stitching together messages and spreadsheets.',
			mark: '◒',
			tone: 'clay'
		},
		{
			tag: 'Act early',
			title: 'The small things, moving',
			copy: 'Maintenance, handoffs and daily requests become visible work, with clear ownership from report to resolution.',
			mark: '⌁',
			tone: 'indigo'
		}
	];

	const operatingModels = [
		{ number: '01', title: 'Residential', detail: 'Start here', active: true },
		{ number: '02', title: 'Commercial', detail: 'Next horizon' },
		{ number: '03', title: 'Student living', detail: 'Next horizon' },
		{ number: '04', title: 'Short stay', detail: 'Next horizon' }
	];
</script>

<svelte:head>
	<title>Musha PMS · A better-kept homestead</title>
	<meta
		name="description"
		content="Musha is the property operations platform for owners and managers who want a clearer, calmer way to run their portfolio."
	/>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="site-shell">
	<header class="site-header">
		<nav class="nav" aria-label="Main navigation">
			<a class="brand" href={resolve('/')} aria-label="Musha home"
				><img class="musha-logo" src="/logo.png" alt="" /><span class="brand-copy"
					><strong>Musha</strong><small>home · homestead</small></span
				></a
			>
			<div class="nav-links">
				<a href="#why-musha">Why Musha</a><a href="#the-musha-way">The Musha way</a><a
					href="#built-to-grow">Built to grow</a
				>
			</div>
			<a class="sign-in" href={resolve('/login')}>Sign in <span>↗</span></a>
		</nav>
	</header>

	<main>
		<section class="hero" aria-labelledby="hero-title">
			<div class="hero-copy">
				<p class="eyebrow"><span class="eyebrow-line"></span> Musha / homestead</p>
				<h1 id="hero-title">A better-kept<br /><em>homestead.</em></h1>
				<p class="hero-lede">
					Property management for the way real portfolios grow—grounded in the day-to-day, ready for
					what comes next.
				</p>
				<div class="hero-actions">
					<a class="button button-dark" href={resolve('/login')}
						>Enter your workspace <span>→</span></a
					><a class="underline-link" href="#why-musha">Discover Musha <span>↓</span></a>
				</div>
				<div class="hero-signature">
					<span class="signature-stroke"></span><span
						>Made for owners, managers and the people who keep places running.</span
					>
				</div>
			</div>

			<div class="hero-art" aria-label="Illustrated Musha property operations overview">
				<div class="art-pattern" aria-hidden="true">
					<svg viewBox="0 0 220 220" role="presentation"
						><defs
							><pattern id="weave" width="44" height="44" patternUnits="userSpaceOnUse"
								><path
									d="M22 3L41 22 22 41 3 22Z"
									fill="none"
									stroke="var(--musha-lime)"
									stroke-opacity=".24"
									stroke-width="1.2"
								/><circle
									cx="22"
									cy="22"
									r="3"
									fill="var(--musha-lime)"
									fill-opacity=".28"
								/></pattern
							></defs
						><rect width="220" height="220" fill="url(#weave)" /></svg
					>
				</div>
				<div class="art-sun"></div>
				<div class="art-land"></div>
				<div class="rondavel rondavel-back"><span></span><i></i><i></i></div>
				<div class="rondavel rondavel-front"><span></span><i></i><i></i><i></i></div>
				<div class="tree tree-one"><span></span><i></i></div>
				<div class="tree tree-two"><span></span><i></i></div>
				<div class="product-card">
					<div class="product-card-top"><span>Today in your musha</span><b><i></i> live</b></div>
					<div class="product-card-title">
						<strong>Everything in place.</strong><span>↗ 8.4%</span>
					</div>
					<div class="mini-bars">
						<i style="height: 37%"></i><i style="height: 48%"></i><i style="height: 43%"></i><i
							style="height: 61%"
						></i><i style="height: 58%"></i><i style="height: 78%"></i><i style="height: 91%"></i>
					</div>
					<div class="product-stats">
						<span><b>24</b> spaces</span><span><b>91%</b> occupied</span><span
							><b>2</b> to action</span
						>
					</div>
				</div>
				<div class="float-note note-collection">
					<span>✓</span><small>Collections</small><strong>On track</strong>
				</div>
				<div class="float-note note-maintenance">
					<span>⌁</span><small>Maintenance</small><strong>2 open requests</strong>
				</div>
			</div>
		</section>

		<section class="principles" aria-label="Musha principles">
			<span>Residential first</span><i></i><span>One source of truth</span><i></i><span
				>Ready to grow</span
			><i></i><span>Grounded in support</span>
		</section>

		<section class="manifesto" id="why-musha" aria-labelledby="manifesto-title">
			<div class="manifesto-mark" aria-hidden="true"><span>M</span><i></i><i></i><i></i></div>
			<div class="manifesto-copy">
				<p class="eyebrow">Why Musha</p>
				<h2 id="manifesto-title">A digital musha<br /><em>for every address.</em></h2>
				<p>
					In Shona, <strong>musha</strong> is more than a house. It is the place, the people and the work
					of keeping it well. We built Musha around that idea: one calm operating layer for the properties
					and relationships that make a portfolio.
				</p>
				<a class="underline-link" href="#the-musha-way">See the operating layer <span>↓</span></a>
			</div>
		</section>

		<section class="capability-section" id="the-musha-way" aria-labelledby="capability-title">
			<div class="section-heading">
				<div>
					<p class="eyebrow">The operating layer</p>
					<h2 id="capability-title">Clarity for the<br /><em>work behind rent.</em></h2>
				</div>
				<p>Musha connects the quiet, important work that keeps a property portfolio healthy.</p>
			</div>
			<div class="capability-grid">
				{#each capabilities as capability (capability.tag)}<article
						class="capability-card {capability.tone}"
					>
						<div class="capability-top"><span>{capability.tag}</span><b>{capability.mark}</b></div>
						<h3>{capability.title}</h3>
						<p>{capability.copy}</p>
						<a href={resolve('/login')}>Step inside <span>↗</span></a>
					</article>{/each}
			</div>
		</section>

		<section class="way-section" aria-labelledby="way-title">
			<div class="way-intro">
				<p class="eyebrow">The Musha way</p>
				<h2 id="way-title">Set up once.<br /><em>Run with rhythm.</em></h2>
				<p>
					Start with the essentials and create a dependable rhythm around your properties—without
					making your team learn a maze of software.
				</p>
			</div>
			<div class="way-map">
				<div class="way-line"></div>
				<div class="way-step">
					<span>01</span>
					<div class="way-icon">⌂</div>
					<h3>Set the ground</h3>
					<p>Properties, spaces, people and tenancies in one clear foundation.</p>
				</div>
				<div class="way-step active">
					<span>02</span>
					<div class="way-icon">◒</div>
					<h3>Run the day</h3>
					<p>Collections, maintenance and decisions with the right context around them.</p>
				</div>
				<div class="way-step">
					<span>03</span>
					<div class="way-icon">✦</div>
					<h3>Open the gate</h3>
					<p>Grow into new properties and operating models when you are ready.</p>
				</div>
			</div>
		</section>

		<section class="growth-section" id="built-to-grow" aria-labelledby="growth-title">
			<div class="growth-copy">
				<p class="eyebrow">Built to grow</p>
				<h2 id="growth-title">One foundation.<br /><em>More possibilities.</em></h2>
				<p>
					Musha begins with traditional residential accommodation, then grows with the shape of your
					business—from commercial space to student living and short stays.
				</p>
				<a class="underline-link dark" href={resolve('/login')}
					>Enter your workspace <span>↗</span></a
				>
			</div>
			<div class="model-list">
				{#each operatingModels as model (model.number)}<div
						class:active={model.active}
						class="model-row"
					>
						<span>{model.number}</span>
						<div><strong>{model.title}</strong><small>{model.detail}</small></div>
						<b>↗</b>
					</div>{/each}
			</div>
		</section>

		<section class="final-cta">
			<div>
				<p class="eyebrow">Your next good decision</p>
				<h2>Bring the work<br /><em>home.</em></h2>
			</div>
			<div class="final-copy">
				<p>
					Start with a clearer view of the portfolio you already have. Musha is here to help you
					keep it well.
				</p>
				<a class="button button-lime" href={resolve('/login')}>Sign in to Musha <span>→</span></a>
			</div>
		</section>
	</main>

	<footer class="footer">
		<a class="brand" href={resolve('/')}
			><img class="musha-logo" src="/logo.png" alt="" /><span class="brand-copy"
				><strong>Musha</strong><small>home · homestead</small></span
			></a
		><span>© 2026 Musha PMS</span><a href={resolve('/login')}>Client and platform sign in ↗</a>
	</footer>
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}
	:global(html) {
		scroll-behavior: smooth;
	}
	:global(body) {
		margin: 0;
		background: #f7f7f0;
		color: var(--musha-ink);
		font-family: var(--font-body);
	}
	:global(button),
	:global(a) {
		font: inherit;
	}
	:global(::selection) {
		background: var(--musha-lime);
		color: var(--musha-ink);
	}
	.site-shell {
		overflow: hidden;
	}
	.site-header {
		position: relative;
		z-index: 4;
		border-bottom: 1px solid #e3e7d9;
		padding: 0 clamp(20px, 6vw, 90px);
		background: #f7f7f0e8;
		backdrop-filter: blur(10px);
	}
	.nav {
		max-width: 1320px;
		height: 92px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 0 auto;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--musha-ink);
		text-decoration: none;
	}
	.brand-copy strong,
	.brand-copy small {
		display: block;
		line-height: 1.05;
	}
	.brand-copy strong {
		font-family: var(--font-display);
		font-size: 21px;
		letter-spacing: -0.07em;
	}
	.brand-copy small {
		color: #83958a;
		font-size: 10px;
		letter-spacing: 0.12em;
		margin-top: 5px;
		text-transform: uppercase;
	}
	.nav-links {
		display: flex;
		gap: 29px;
		margin-left: auto;
		margin-right: 42px;
	}
	.nav-links a,
	.sign-in {
		color: #74877c;
		font-size: 13px;
		text-decoration: none;
	}
	.nav-links a:hover,
	.sign-in:hover {
		color: var(--musha-deep);
	}
	.sign-in {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		color: var(--musha-deep);
		font-weight: 700;
	}
	.sign-in span {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		border: 1px solid #cbd8c7;
		border-radius: 50%;
		font-size: 14px;
	}
	main {
		max-width: 1320px;
		margin: 0 auto;
		padding: 0 clamp(20px, 6vw, 90px);
	}
	.eyebrow {
		display: flex;
		align-items: center;
		gap: 9px;
		color: #789087;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.18em;
		margin: 0 0 19px;
		text-transform: uppercase;
	}
	.eyebrow-line {
		width: 22px;
		height: 1px;
		background: #8eae7c;
	}
	.hero {
		min-height: 735px;
		display: grid;
		grid-template-columns: 0.86fr 1.14fr;
		align-items: center;
		gap: clamp(32px, 5vw, 84px);
		padding: 58px 0 95px;
	}
	.hero h1,
	h2 {
		font-family: var(--font-display);
		font-weight: 600;
	}
	.hero h1 {
		max-width: 580px;
		font-size: clamp(54px, 7.1vw, 94px);
		line-height: 0.87;
		letter-spacing: -0.1em;
		margin: 0 0 30px;
	}
	.hero h1 em,
	h2 em {
		color: #6c956c;
		font-style: normal;
	}
	.hero-lede {
		max-width: 410px;
		color: #6e8278;
		font-size: 16px;
		line-height: 1.75;
		margin: 0;
	}
	.hero-actions {
		display: flex;
		align-items: center;
		gap: 24px;
		margin-top: 32px;
	}
	.button {
		display: inline-flex;
		align-items: center;
		gap: 18px;
		border-radius: 6px;
		padding: 13px 15px;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
	}
	.button span {
		font-size: 17px;
	}
	.button-dark {
		background: var(--musha-deep);
		color: #fff;
	}
	.button-dark span {
		color: var(--musha-lime);
	}
	.underline-link {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		border-bottom: 1px solid #bdd0be;
		padding-bottom: 5px;
		color: #4e7961;
		font-size: 13px;
		text-decoration: none;
	}
	.underline-link span {
		color: #7fa083;
		font-size: 16px;
	}
	.hero-signature {
		display: flex;
		align-items: center;
		gap: 10px;
		color: #9aa89f;
		font-size: 12px;
		line-height: 1.4;
		margin-top: 53px;
		max-width: 330px;
	}
	.signature-stroke {
		width: 29px;
		height: 7px;
		display: block;
		border-top: 1px solid #91ae82;
		border-radius: 50%;
		transform: rotate(-11deg);
	}
	.hero-art {
		min-height: 548px;
		position: relative;
		border-radius: 20px 20px 20px 4px;
		overflow: hidden;
		background: var(--musha-deep);
		box-shadow: 16px 22px 0 var(--musha-lime);
		isolation: isolate;
	}
	.art-pattern {
		position: absolute;
		z-index: -1;
		width: 270px;
		height: 270px;
		top: 0;
		right: 0;
		opacity: 0.9;
	}
	.art-sun {
		position: absolute;
		width: 270px;
		height: 270px;
		top: -95px;
		right: 58px;
		border-radius: 50%;
		background: #efb879;
		opacity: 0.95;
	}
	.art-land {
		position: absolute;
		inset: auto 0 0;
		height: 36%;
		background: #2c6750;
		clip-path: ellipse(80% 70% at 55% 100%);
	}
	.rondavel {
		position: absolute;
		bottom: 0;
		border-radius: 50% 50% 5px 5px;
		background: #c77a57;
	}
	.rondavel span {
		position: absolute;
		left: -10%;
		top: -25%;
		width: 120%;
		height: 45%;
		border-radius: 50%;
		background: #a9584a;
		transform: rotate(-2deg);
	}
	.rondavel span:after {
		content: '';
		position: absolute;
		left: 32%;
		top: -26%;
		width: 36%;
		height: 43%;
		border-radius: 50% 50% 8% 8%;
		background: #d59a62;
	}
	.rondavel i {
		position: absolute;
		display: block;
		width: 17px;
		height: 23px;
		border: 5px solid #f0c27e;
		border-bottom: 0;
		border-radius: 9px 9px 0 0;
		bottom: 25px;
	}
	.rondavel i:nth-of-type(1) {
		left: 22%;
	}
	.rondavel i:nth-of-type(2) {
		right: 22%;
	}
	.rondavel i:nth-of-type(3) {
		left: 45%;
		bottom: 0;
		height: 37px;
		border-color: #673f35;
	}
	.rondavel-back {
		z-index: 1;
		right: 12%;
		width: 170px;
		height: 180px;
		background: #a55f52;
		opacity: 0.85;
	}
	.rondavel-front {
		z-index: 2;
		right: 35%;
		width: 225px;
		height: 237px;
	}
	.tree {
		position: absolute;
		z-index: 2;
		bottom: 17%;
	}
	.tree span {
		display: block;
		width: 8px;
		height: 93px;
		background: #6c4d3c;
		border-radius: 10px;
		margin-left: 48%;
		transform: rotate(7deg);
	}
	.tree i {
		position: absolute;
		display: block;
		width: 77px;
		height: 60px;
		border-radius: 50% 45% 45% 35%;
		background: #407b5c;
		top: -43px;
		left: 0;
	}
	.tree i:after {
		content: '';
		position: absolute;
		width: 51px;
		height: 44px;
		border-radius: 50%;
		background: #559568;
		top: -20px;
		left: 25px;
	}
	.tree-one {
		left: 7%;
		transform: scale(0.83);
	}
	.tree-two {
		right: 5%;
		bottom: 26%;
		transform: scale(0.55);
		opacity: 0.85;
	}
	.product-card {
		position: absolute;
		z-index: 5;
		left: 27px;
		top: 91px;
		width: min(355px, 68%);
		padding: 18px 18px 15px;
		border: 1px solid #ffffff4f;
		border-radius: 10px;
		background: #f7f7f0ef;
		box-shadow: 0 20px 42px #102f241f;
		backdrop-filter: blur(10px);
		animation: float-card 6s ease-in-out infinite;
	}
	.product-card-top,
	.product-card-title,
	.product-stats {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.product-card-top {
		color: #71877c;
		font-size: 10px;
	}
	.product-card-top b {
		color: #5e9069;
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
	}
	.product-card-top b i {
		display: inline-block;
		width: 5px;
		height: 5px;
		margin-right: 4px;
		border-radius: 50%;
		background: #65a576;
	}
	.product-card-title {
		margin-top: 17px;
	}
	.product-card-title strong {
		color: #23483a;
		font-family: var(--font-display);
		font-size: 16px;
		letter-spacing: -0.05em;
	}
	.product-card-title span {
		color: #5f8e68;
		background: #e3edce;
		border-radius: 99px;
		padding: 4px 6px;
		font-size: 10px;
		font-weight: 700;
	}
	.mini-bars {
		height: 89px;
		display: flex;
		align-items: end;
		gap: 7px;
		border-bottom: 1px solid #dbe7d7;
		margin-top: 15px;
		padding: 0 3px;
	}
	.mini-bars i {
		display: block;
		flex: 1;
		border-radius: 3px 3px 0 0;
		background: #88ae86;
		opacity: 0.67;
	}
	.mini-bars i:nth-last-child(-n + 2) {
		background: #4e8967;
		opacity: 1;
	}
	.product-stats {
		color: #80958a;
		font-size: 10px;
		margin-top: 11px;
	}
	.product-stats b {
		color: #3e6a51;
		font-size: 11px;
		margin-right: 2px;
	}
	.float-note {
		position: absolute;
		z-index: 6;
		display: grid;
		grid-template-columns: 29px 1fr;
		column-gap: 8px;
		align-items: center;
		padding: 9px 12px 9px 9px;
		border: 1px solid #ffffff55;
		border-radius: 8px;
		background: #f7f7f0f2;
		box-shadow: 0 14px 28px #112d241d;
	}
	.float-note > span {
		grid-row: span 2;
		display: grid;
		place-items: center;
		width: 29px;
		height: 29px;
		border-radius: 7px;
		background: var(--musha-lime);
		color: #264f3d;
		font-size: 15px;
	}
	.float-note small,
	.float-note strong {
		display: block;
	}
	.float-note small {
		color: #87988f;
		font-size: 9px;
	}
	.float-note strong {
		color: #365f4c;
		font-size: 11px;
		margin-top: 2px;
	}
	.note-collection {
		right: 27px;
		top: 52px;
	}
	.note-maintenance {
		left: 44px;
		bottom: 30px;
	}
	.note-maintenance > span {
		background: #f1cf9d;
	}
	.principles {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 19px;
		border-top: 1px solid #e0e8d9;
		border-bottom: 1px solid #e0e8d9;
		color: #87978d;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.13em;
		padding: 19px 0;
		text-transform: uppercase;
	}
	.principles i {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: #a7ba83;
	}
	.manifesto {
		display: grid;
		grid-template-columns: 0.85fr 1.15fr;
		align-items: center;
		gap: clamp(35px, 10vw, 160px);
		padding: 157px 0 133px;
	}
	.manifesto-mark {
		position: relative;
		width: 270px;
		height: 270px;
		display: grid;
		place-items: center;
		border-radius: 50% 50% 45% 45%;
		background: #dcebbd;
		color: #5a8464;
		font-family: var(--font-display);
		font-size: 130px;
		letter-spacing: -0.15em;
	}
	.manifesto-mark:before,
	.manifesto-mark:after {
		content: '';
		position: absolute;
		width: 36px;
		height: 49px;
		border: 6px solid #a7bf8c;
		border-bottom: 0;
		border-radius: 20px 20px 0 0;
		bottom: 44px;
	}
	.manifesto-mark:before {
		left: 47px;
	}
	.manifesto-mark:after {
		right: 47px;
	}
	.manifesto-mark i {
		position: absolute;
		width: 8px;
		height: 53px;
		border-radius: 4px;
		background: #a7bf8c;
		bottom: 0;
	}
	.manifesto-mark i:nth-of-type(1) {
		left: 32%;
		transform: rotate(3deg);
	}
	.manifesto-mark i:nth-of-type(2) {
		left: 50%;
		height: 82px;
		background: #6c956c;
	}
	.manifesto-mark i:nth-of-type(3) {
		right: 32%;
		transform: rotate(-3deg);
	}
	.manifesto-copy h2,
	.section-heading h2,
	.way-intro h2,
	.growth-copy h2,
	.final-cta h2 {
		font-size: clamp(38px, 5.2vw, 67px);
		line-height: 0.92;
		letter-spacing: -0.09em;
		margin: 0 0 23px;
	}
	.manifesto-copy > p:not(.eyebrow),
	.growth-copy > p:not(.eyebrow),
	.way-intro > p:not(.eyebrow) {
		max-width: 465px;
		color: #71877b;
		font-size: 16px;
		line-height: 1.75;
		margin: 0 0 25px;
	}
	.manifesto-copy strong {
		color: #426951;
	}
	.capability-section {
		padding: 94px 0 147px;
		border-top: 1px solid #e0e8d9;
	}
	.section-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 30px;
		margin-bottom: 46px;
	}
	.section-heading > p {
		max-width: 280px;
		color: #7d9185;
		font-size: 14px;
		line-height: 1.7;
		margin: 0;
	}
	.capability-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}
	.capability-card {
		min-height: 290px;
		display: flex;
		flex-direction: column;
		padding: 20px;
		border-radius: 9px;
		border: 1px solid #e0e7da;
		background: #fff;
	}
	.capability-card.clay {
		background: #f0d3b0;
		border-color: #f0d3b0;
	}
	.capability-card.indigo {
		background: #d9e1de;
		border-color: #d9e1de;
	}
	.capability-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		color: #7f9888;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.capability-top b {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 9px;
		background: #edf4dc;
		color: #5f8a69;
		font-size: 20px;
	}
	.clay .capability-top b {
		background: #f7e6c9;
		color: #9b694d;
	}
	.indigo .capability-top b {
		background: #eff4e9;
		color: #557765;
	}
	.capability-card h3 {
		font-family: var(--font-display);
		max-width: 220px;
		color: #345b4b;
		font-size: 23px;
		line-height: 1;
		letter-spacing: -0.07em;
		margin: 52px 0 14px;
	}
	.capability-card p {
		max-width: 270px;
		color: #779086;
		font-size: 14px;
		line-height: 1.65;
		margin: 0;
	}
	.capability-card a {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		margin-top: auto;
		padding-top: 22px;
		color: #4f7a60;
		font-size: 12px;
		text-decoration: none;
	}
	.capability-card a span {
		font-size: 15px;
	}
	.way-section {
		display: grid;
		grid-template-columns: 0.8fr 1.2fr;
		gap: clamp(40px, 9vw, 150px);
		padding: 120px 0 145px;
		border-top: 1px solid #e0e8d9;
	}
	.way-map {
		position: relative;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 22px;
		align-items: start;
		padding-top: 20px;
	}
	.way-line {
		position: absolute;
		top: 55px;
		left: 13%;
		right: 13%;
		height: 1px;
		background: #c5d5bf;
	}
	.way-step {
		position: relative;
		z-index: 1;
		text-align: center;
	}
	.way-step > span {
		color: #9aaa9e;
		font-size: 11px;
	}
	.way-icon {
		display: grid;
		place-items: center;
		width: 66px;
		height: 66px;
		margin: 13px auto 20px;
		border: 1px solid #c9dac1;
		border-radius: 50%;
		background: #f7f7f0;
		color: #5f8a69;
		font-size: 23px;
	}
	.way-step.active .way-icon {
		background: var(--musha-lime);
		border-color: var(--musha-lime);
		color: #264e3c;
		transform: scale(1.09);
		box-shadow: 0 0 0 9px #edf4dc;
	}
	.way-step h3 {
		color: #345b4b;
		font-family: var(--font-display);
		font-size: 17px;
		letter-spacing: -0.05em;
		margin: 0 0 9px;
	}
	.way-step p {
		max-width: 160px;
		margin: 0 auto;
		color: #85988e;
		font-size: 12px;
		line-height: 1.6;
	}
	.growth-section {
		display: grid;
		grid-template-columns: 1fr 0.9fr;
		gap: clamp(40px, 10vw, 155px);
		align-items: center;
		padding: 111px clamp(25px, 6vw, 90px);
		margin: 0 calc(clamp(20px, 6vw, 90px) * -1);
		background: #dcebbd;
	}
	.growth-copy > p:not(.eyebrow) {
		max-width: 390px;
	}
	.underline-link.dark {
		color: #315f4c;
		border-color: #a4bf99;
	}
	.model-list {
		display: grid;
		gap: 6px;
	}
	.model-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 15px;
		border: 1px solid #bcd4b7;
		border-radius: 8px;
		color: #809a83;
	}
	.model-row.active {
		border-color: #fff;
		background: #fff;
		box-shadow: 0 13px 28px #3a6a4614;
	}
	.model-row > span {
		color: #91aa8f;
		font-size: 11px;
	}
	.model-row > div {
		flex: 1;
	}
	.model-row strong,
	.model-row small {
		display: block;
	}
	.model-row strong {
		color: #426951;
		font-family: var(--font-display);
		font-size: 14px;
		letter-spacing: -0.04em;
	}
	.model-row small {
		color: #879d89;
		font-size: 11px;
		margin-top: 3px;
	}
	.model-row b {
		color: #88a486;
		font-size: 16px;
		font-weight: 400;
	}
	.final-cta {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 50px;
		padding: 153px 0 129px;
	}
	.final-cta h2 {
		margin-bottom: 0;
	}
	.final-copy {
		max-width: 340px;
	}
	.final-copy p {
		color: #71877b;
		font-size: 15px;
		line-height: 1.7;
		margin: 0 0 25px;
	}
	.button-lime {
		background: var(--musha-lime);
		color: var(--musha-deep);
	}
	.button-lime span {
		color: #4d7654;
	}
	.footer {
		max-width: 1320px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 21px clamp(20px, 6vw, 90px) 29px;
		border-top: 1px solid #e0e8d9;
		color: #9aa89f;
		font-size: 11px;
	}
	.footer .brand-copy strong {
		font-size: 17px;
	}
	.footer .brand-copy small {
		font-size: 9px;
	}
	.footer > a:last-child {
		color: #5e846a;
		text-decoration: none;
	}
	@keyframes float-card {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-7px);
		}
	}
	@media (max-width: 1000px) {
		.nav-links {
			display: none;
		}
		.hero {
			grid-template-columns: 1fr;
			padding-top: 72px;
		}
		.hero-copy {
			max-width: 620px;
		}
		.hero-art {
			min-height: 515px;
			width: 100%;
		}
		.manifesto {
			gap: 50px;
		}
		.way-section {
			gap: 50px;
		}
		.growth-section {
			gap: 50px;
		}
	}
	@media (max-width: 700px) {
		.site-header {
			padding: 0 18px;
		}
		.nav {
			height: 82px;
		}
		.site-header .musha-logo {
			width: 50px;
			height: 50px;
			flex-basis: 50px;
			border-radius: 14px;
		}
		.brand-copy strong {
			font-size: 19px;
		}
		.brand-copy small {
			font-size: 9px;
		}
		.sign-in {
			font-size: 12px;
		}
		.sign-in span {
			width: 30px;
			height: 30px;
		}
		.hero {
			padding: 54px 0 78px;
		}
		.hero h1 {
			font-size: clamp(48px, 15vw, 78px);
		}
		.hero-lede {
			font-size: 15px;
		}
		.hero-actions {
			align-items: flex-start;
			flex-direction: column;
			gap: 17px;
		}
		.hero-signature {
			margin-top: 39px;
		}
		.hero-art {
			min-height: 392px;
			border-radius: 15px 15px 15px 3px;
			box-shadow: 9px 13px 0 var(--musha-lime);
		}
		.art-pattern {
			width: 190px;
			height: 190px;
		}
		.art-sun {
			width: 190px;
			height: 190px;
			right: 23px;
			top: -68px;
		}
		.product-card {
			top: 73px;
			left: 18px;
			width: calc(100% - 36px);
		}
		.note-collection {
			top: 24px;
			right: 17px;
		}
		.note-maintenance {
			left: 17px;
			bottom: 17px;
		}
		.rondavel-front {
			right: 26%;
			transform: scale(0.75);
			transform-origin: bottom right;
		}
		.rondavel-back {
			right: -1%;
			transform: scale(0.7);
			transform-origin: bottom right;
		}
		.tree-one {
			transform: scale(0.65);
			left: -3%;
		}
		.tree-two {
			transform: scale(0.4);
			right: -5%;
		}
		.principles {
			justify-content: flex-start;
			overflow: hidden;
			gap: 12px;
			white-space: nowrap;
			padding: 17px 0;
			font-size: 10px;
		}
		.principles i {
			flex: 0 0 3px;
		}
		.manifesto {
			grid-template-columns: 1fr;
			gap: 50px;
			padding: 101px 0 97px;
		}
		.manifesto-mark {
			width: 200px;
			height: 200px;
			font-size: 96px;
		}
		.manifesto-mark:before,
		.manifesto-mark:after {
			bottom: 31px;
			width: 27px;
			height: 38px;
			border-width: 5px;
		}
		.manifesto-mark:before {
			left: 35px;
		}
		.manifesto-mark:after {
			right: 35px;
		}
		.manifesto-mark i {
			height: 39px;
		}
		.manifesto-mark i:nth-of-type(2) {
			height: 59px;
		}
		.capability-section {
			padding: 76px 0 94px;
		}
		.section-heading {
			display: block;
			margin-bottom: 33px;
		}
		.section-heading > p {
			margin-top: 20px;
		}
		.capability-grid {
			grid-template-columns: 1fr;
		}
		.capability-card {
			min-height: 245px;
		}
		.capability-card h3 {
			margin-top: 37px;
			font-size: 26px;
		}
		.capability-card p {
			font-size: 14px;
		}
		.way-section {
			grid-template-columns: 1fr;
			gap: 53px;
			padding: 91px 0 104px;
		}
		.way-map {
			grid-template-columns: 1fr;
			gap: 29px;
			padding: 0;
		}
		.way-line {
			top: 20px;
			bottom: 20px;
			left: 31px;
			width: 1px;
			height: auto;
			right: auto;
		}
		.way-step {
			display: grid;
			grid-template-columns: 53px 1fr;
			grid-template-rows: auto auto;
			column-gap: 15px;
			text-align: left;
		}
		.way-step > span {
			grid-column: 1;
			grid-row: 1;
			text-align: center;
			padding-top: 13px;
		}
		.way-icon {
			grid-column: 1;
			grid-row: 1 / span 2;
			width: 62px;
			height: 62px;
			margin: 0;
		}
		.way-step > span {
			display: none;
		}
		.way-step h3 {
			grid-column: 2;
			grid-row: 1;
			margin: 8px 0 7px;
		}
		.way-step p {
			grid-column: 2;
			grid-row: 2;
			margin: 0;
			max-width: 240px;
		}
		.way-step.active .way-icon {
			transform: none;
		}
		.growth-section {
			grid-template-columns: 1fr;
			gap: 46px;
			padding: 83px 22px;
			margin: 0 -20px;
			overflow: hidden;
		}
		.final-cta {
			display: block;
			padding: 104px 0 91px;
		}
		.final-copy {
			margin-top: 28px;
		}
		.footer {
			align-items: flex-start;
			flex-direction: column;
			gap: 17px;
			padding-left: 18px;
			padding-right: 18px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		:global(html) {
			scroll-behavior: auto;
		}
		.product-card {
			animation: none;
		}
	}
</style>
