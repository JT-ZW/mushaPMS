<script lang="ts">
	import { resolve } from '$app/paths';
	import { applicationHref } from '$lib/marketing';
	import MarketingFooter from '$lib/components/MarketingFooter.svelte';
	const pillars = [
		['01', 'Properties', 'Every address, unit and portfolio signal in one clear view.', '⌂'],
		['02', 'People', 'Bring tenants, owners, vendors and teams into the same rhythm.', '◌'],
		[
			'03',
			'Possibilities',
			'Collections, maintenance and growth—always ready for the next move.',
			'✦'
		]
	];
</script>

<svelte:head>
	<title>Musha PMS · Property management, beautifully connected</title>
	<meta
		name="description"
		content="Musha is the calm, connected operating system for modern property teams."
	/>
</svelte:head>

<div class="canvas">
	<div class="frame">
		<header>
			<a class="brand" href={resolve('/')} aria-label="Musha home"
				><img src="/logo.png" alt="" /><span
					><strong>Musha</strong><small>Property Management System</small></span
				></a
			>
			<nav aria-label="Main navigation">
				<a href={resolve('/platform')}>Platform</a><a href={resolve('/solutions')}>Solutions</a><a
					href={resolve('/demo')}>Live demo</a
				><a href={resolve('/why-musha')}>Why Musha</a>
			</nav>
			<div class="head-actions">
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={applicationHref()}>Sign in</a><a class="outline" href={resolve('/contact')}
					>Contact us <b>↗</b></a
				>
			</div>
		</header>
		<main>
			<section class="hero" aria-labelledby="hero-title">
				<div class="dots"></div>
				<div class="pin one"><i></i> Rent received</div>
				<div class="pin two"><b>3</b> Tasks today</div>
				<div class="copy">
					<p class="kicker"><i></i> Property operations, reimagined</p>
					<h1 id="hero-title">Keep every<br />property <em>in its place.</em></h1>
					<p class="lede">
						A calm, connected home for the people, payments and possibilities behind your portfolio.
					</p>
					<div class="actions">
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
						<a class="primary" href={applicationHref()}>Sign in to Musha <b>→</b></a><a
							class="text-link"
							href={resolve('/platform')}>Explore Musha <b>→</b></a
						>
					</div>
					<div class="trusted">
						<span><i>TK</i><i>AN</i><i>MM</i></span>Made for owners, managers<br />and growing
						teams.
					</div>
				</div>
				<div class="stage" aria-label="Preview of the Musha platform">
					<div class="sun"></div>
					<div class="hill back"></div>
					<div class="hill front"></div>
					<div class="house"><i></i><b><u></u><u></u><em></em></b></div>
					<div class="overview">
						<div class="overview-top"><span>Musha overview</span><b><i></i> Live portfolio</b></div>
						<div class="overview-title">
							<div><small>Portfolio health</small><strong>Everything, in view.</strong></div>
							<b>↗ 8.4%</b>
						</div>
						<div class="chart">
							<div><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
							<svg viewBox="0 0 300 86" preserveAspectRatio="none"
								><path
									d="M0 65 C30 55,35 61,63 46 S103 56,132 38 S175 45,203 25 S246 39,300 6"
									fill="none"
									stroke="#78b466"
									stroke-width="3"
								/></svg
							>
						</div>
						<div class="stats">
							<span><b>24</b> spaces</span><span><b>91%</b> occupied</span><span
								><b>2</b> need action</span
							>
						</div>
					</div>
					<div class="mini collect">
						<i>✓</i><span><small>Collections</small><b>On track</b></span>
					</div>
					<div class="mini fix">
						<i>⌁</i><span><small>Maintenance</small><b>2 open requests</b></span>
					</div>
				</div>
			</section>
			<section class="proof">
				<span>One source of truth</span><i></i><span>Designed for real teams</span><i></i><span
					>Built to grow</span
				><i></i><span>Made in Africa</span>
			</section>
			<section class="platform" id="platform">
				<div class="intro">
					<p class="kicker"><i></i> Your operating layer</p>
					<h2>More room to<br /><em>run the day.</em></h2>
					<p>
						Musha turns the moving parts of property management into a composed daily picture—so you
						can act with confidence, not chase context.
					</p>
					<a class="text-link" href={resolve('/login')}>See the workspace <b>↗</b></a>
				</div>
				<div class="workspace">
					<div class="tabs">
						<b>Overview</b><span>Properties</span><span>People</span><span>Finance</span>
					</div>
					<div class="workbody">
						<div class="welcome">
							<span><small>Good morning, Musha</small><b>Your portfolio is moving well.</b></span><i
								>•••</i
							>
						</div>
						<div class="metrics">
							<article>
								<small>Collected this month</small><b>$18,420</b><span>↑ 12.5% from last month</span
								>
							</article>
							<article><small>Occupancy</small><b>91<sup>%</sup></b><i><u></u></i></article>
						</div>
						<div class="workbottom">
							<article>
								<div><b>Today’s work</b><span>View all</span></div>
								<p><i>1</i> Lease renewal · Mabel Court</p>
								<p><i>2</i> Plumbing request · Unit 04</p>
							</article>
							<article class="health"><span>Portfolio<br />health</span><i>84</i></article>
						</div>
					</div>
				</div>
			</section>
			<section class="solutions" id="solutions">
				<div class="section-top">
					<div>
						<p class="kicker"><i></i> The Musha way</p>
						<h2>Every part of the<br /><em>place, connected.</em></h2>
					</div>
					<p>
						From the first property to the next horizon, Musha gives your team a simple rhythm for
						the work that matters.
					</p>
				</div>
				<div class="cards">
					{#each pillars as pillar (pillar[0])}<article>
							<small>{pillar[0]}</small><i>{pillar[3]}</i>
							<h3>{pillar[1]}</h3>
							<p>{pillar[2]}</p>
							<a href={resolve('/login')}>Explore <b>↗</b></a>
						</article>{/each}
				</div>
			</section>
			<section class="statement" id="why">
				<div class="art"><i></i><i></i><i></i><b>M</b><span></span></div>
				<div>
					<p class="kicker light"><i></i> A digital homestead</p>
					<h2>Run a better<br /><em>Musha.</em></h2>
					<p>
						In Shona, musha is more than a house. It is the people, the place, and the care that
						holds it all together. That is the idea behind every screen we make.
					</p>
					<a class="secondary" href={resolve('/login')}>Start with Musha <b>→</b></a>
				</div>
			</section>
		</main>
		<MarketingFooter />
	</div>
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
		background: #fbfaf7;
		color: #0b342f;
		font-family: var(--font-body);
	}
	:global(a) {
		font: inherit;
	}
	.canvas {
		min-height: 100vh;
		padding: 0;
	}
	.frame {
		width: 100%;
		max-width: none;
		margin: 0;
		overflow: hidden;
		border-radius: 0;
		background: #fbfaf7;
		box-shadow: none;
	}
	header {
		height: 90px;
		padding: 0 clamp(22px, 4vw, 58px);
		display: flex;
		align-items: center;
		border-bottom: 1px solid #e8e7df;
		background: #fffefc;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		color: #082f2c;
		text-decoration: none;
	}
	.brand img {
		width: 38px;
		height: 38px;
		object-fit: contain;
		border-radius: 10px;
		box-shadow: 0 5px 12px #0b342f13;
	}
	.brand span {
		display: grid;
		gap: 2px;
	}
	.brand strong {
		font-size: 21px;
		font-weight: 800;
		line-height: 0.95;
		letter-spacing: -0.07em;
	}
	.brand small {
		color: #6e847b;
		font-size: 7px;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	nav {
		display: flex;
		gap: clamp(20px, 3vw, 50px);
		margin-left: auto;
		margin-right: clamp(24px, 5vw, 80px);
	}
	nav a,
	.head-actions > a:first-child {
		color: #65766f;
		font-size: 13px;
		text-decoration: none;
	}
	.head-actions {
		display: flex;
		align-items: center;
		gap: 23px;
	}
	.outline {
		padding: 11px 15px;
		border: 1px solid #b9d9c5;
		border-radius: 9px;
		color: #155a4e;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
	}
	.outline b {
		margin-left: 7px;
	}
	.hero {
		position: relative;
		min-height: 700px;
		display: grid;
		grid-template-columns: 0.95fr 1.05fr;
		align-items: center;
		gap: 30px;
		padding: clamp(55px, 7vw, 110px) clamp(24px, 7vw, 106px) 80px;
		overflow: hidden;
		background:
			radial-gradient(circle at 80% 28%, #f9dfbd 0, #f6eee2 21%, transparent 42%),
			linear-gradient(118deg, #f7f5ef 5%, #eef1e9 64%, #e5eddf);
	}
	.dots {
		position: absolute;
		inset: 0;
		opacity: 0.32;
		background-image: radial-gradient(#8da88e 1px, transparent 1px);
		background-size: 12px 12px;
		mask-image: linear-gradient(to right, #000 0 47%, transparent 78%);
	}
	.copy {
		z-index: 2;
		max-width: 560px;
	}
	.kicker {
		display: flex;
		align-items: center;
		gap: 9px;
		margin: 0 0 19px;
		color: #5b8371;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}
	.kicker > i {
		display: block;
		width: 22px;
		height: 1px;
		background: #75a874;
	}
	h1,
	h2,
	h3 {
		font-family: var(--font-display);
	}
	h1 {
		margin: 0;
		color: #113b34;
		font-size: clamp(56px, 6.15vw, 94px);
		font-weight: 700;
		line-height: 0.88;
		letter-spacing: -0.095em;
	}
	em {
		color: #29876b;
		font-style: normal;
	}
	.lede {
		max-width: 415px;
		margin: 29px 0 0;
		color: #657d73;
		font-size: 16px;
		line-height: 1.7;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 23px;
		margin-top: 31px;
	}
	.primary,
	.secondary {
		display: inline-flex;
		align-items: center;
		gap: 15px;
		padding: 15px 17px;
		border-radius: 8px;
		background: #0d5548;
		color: #fff;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
		box-shadow: 0 11px 20px #164b3b2b;
	}
	.primary b,
	.secondary b {
		color: #a7df7e;
		font-size: 17px;
	}
	.text-link {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		padding-bottom: 4px;
		border-bottom: 1px solid #98b99e;
		color: #356c5a;
		font-size: 13px;
		text-decoration: none;
	}
	.text-link b {
		color: #6fa66d;
		font-size: 16px;
	}
	.trusted {
		display: flex;
		align-items: center;
		gap: 11px;
		margin-top: 58px;
		color: #798c82;
		font-size: 11px;
		line-height: 1.45;
	}
	.trusted > span {
		display: flex;
	}
	.trusted i {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		margin-left: -6px;
		border: 2px solid #f7f5ef;
		border-radius: 50%;
		background: #d3a683;
		color: #fff;
		font-size: 7px;
		font-style: normal;
		font-weight: 800;
	}
	.trusted i:first-child {
		margin-left: 0;
		background: #4e826e;
	}
	.trusted i:last-child {
		background: #7896a8;
	}
	.stage {
		position: relative;
		min-height: 490px;
		align-self: end;
		overflow: hidden;
		border: 1px solid #ffffff94;
		border-radius: 25px 25px 7px 25px;
		background: linear-gradient(160deg, #c1d1ce, #d8e2d5 47%, #78977b 48%, #426d58 100%);
		box-shadow: 18px 21px 0 #c7db9f;
	}
	.sun {
		position: absolute;
		top: -90px;
		right: 13%;
		width: 250px;
		height: 250px;
		border-radius: 50%;
		background: #ffd09d;
		opacity: 0.87;
	}
	.hill {
		position: absolute;
		width: 100%;
		border-radius: 50% 50% 0 0;
	}
	.back {
		height: 150px;
		bottom: 0;
		right: -32%;
		background: #5d856a;
	}
	.front {
		height: 118px;
		bottom: -35px;
		left: -16%;
		background: #315c4a;
	}
	.house {
		position: absolute;
		z-index: 1;
		right: 8%;
		bottom: 39px;
		width: 263px;
		height: 228px;
		filter: drop-shadow(0 14px 15px #23453535);
	}
	.house > i {
		position: absolute;
		top: 0;
		right: 0;
		width: 100%;
		height: 93px;
		border-radius: 9px 9px 0 0;
		background: linear-gradient(140deg, #305e58 0 52%, #19423b 53%);
		clip-path: polygon(32% 0, 100% 36%, 100% 100%, 0 100%, 0 38%);
	}
	.house > b {
		position: absolute;
		right: 0;
		bottom: 0;
		width: 93%;
		height: 145px;
		background: #e3c6a4;
	}
	.house > b:before {
		content: '';
		position: absolute;
		left: -17px;
		width: 18px;
		height: 145px;
		background: #bb936e;
		transform: skewY(-32deg);
		transform-origin: top;
	}
	.house u {
		position: absolute;
		top: 35px;
		width: 52px;
		height: 74px;
		background: #355951;
		box-shadow: inset 0 0 0 6px #9eb3a4;
	}
	.house u:first-child {
		left: 22px;
	}
	.house u:nth-child(2) {
		right: 22px;
	}
	.house em {
		position: absolute;
		bottom: 0;
		left: 41%;
		width: 41px;
		height: 87px;
		background: #76513f;
	}
	.overview {
		position: absolute;
		z-index: 4;
		top: 53px;
		left: 27px;
		width: min(350px, 67%);
		padding: 18px;
		border: 1px solid #ffffffba;
		border-radius: 14px;
		background: #fffefcef;
		box-shadow: 0 23px 42px #1f453027;
		backdrop-filter: blur(9px);
		animation: hover 6s ease-in-out infinite;
	}
	.overview-top,
	.overview-title,
	.stats {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.overview-top {
		color: #6d837a;
		font-size: 10px;
	}
	.overview-top > b {
		color: #558468;
		font-size: 9px;
	}
	.overview-top b i {
		display: inline-block;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #5fb477;
	}
	.overview-title {
		margin-top: 16px;
	}
	.overview-title small {
		display: block;
		color: #87988f;
		font-size: 10px;
	}
	.overview-title strong {
		display: block;
		margin-top: 4px;
		color: #214e41;
		font-size: 18px;
		letter-spacing: -0.06em;
	}
	.overview-title > b {
		padding: 5px 7px;
		border-radius: 99px;
		background: #e6f2d7;
		color: #4e8967;
		font-size: 10px;
	}
	.chart {
		position: relative;
		height: 84px;
		margin-top: 13px;
		overflow: hidden;
		border-bottom: 1px solid #dce8dd;
	}
	.chart svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.chart > div {
		position: absolute;
		inset: 0 0 0 5px;
		display: flex;
		align-items: end;
		gap: 7px;
	}
	.chart i {
		flex: 1;
		background: #dcebd5;
		border-radius: 3px 3px 0 0;
	}
	.chart i:nth-child(1) {
		height: 37%;
	}
	.chart i:nth-child(2) {
		height: 55%;
	}
	.chart i:nth-child(3) {
		height: 42%;
	}
	.chart i:nth-child(4) {
		height: 61%;
	}
	.chart i:nth-child(5) {
		height: 48%;
	}
	.chart i:nth-child(6) {
		height: 72%;
	}
	.chart i:nth-child(7) {
		height: 86%;
	}
	.stats {
		padding-top: 10px;
		color: #81958a;
		font-size: 9px;
	}
	.stats b {
		color: #3b725a;
		font-size: 11px;
	}
	.mini {
		position: absolute;
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 9px 13px 9px 9px;
		border: 1px solid #ffffff9b;
		border-radius: 10px;
		background: #fffefce8;
		box-shadow: 0 12px 24px #20453124;
	}
	.mini > i {
		display: grid;
		place-items: center;
		width: 29px;
		height: 29px;
		border-radius: 8px;
		background: #dff0ce;
		color: #41755b;
		font-size: 15px;
		font-style: normal;
		font-weight: 800;
	}
	.mini small,
	.mini b {
		display: block;
	}
	.mini small {
		color: #87978e;
		font-size: 9px;
	}
	.mini b {
		margin-top: 2px;
		color: #3b6654;
		font-size: 10px;
	}
	.collect {
		top: 25px;
		right: 24px;
	}
	.fix {
		bottom: 24px;
		left: 33px;
	}
	.fix > i {
		background: #f2d5b5;
		color: #95664d;
	}
	.pin {
		position: absolute;
		z-index: 3;
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 8px 10px;
		border-radius: 9px;
		background: #fff;
		box-shadow: 0 10px 22px #1c3f2e19;
		color: #5f756c;
		font-size: 10px;
	}
	.pin i {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #67ae76;
	}
	.pin b {
		display: grid;
		place-items: center;
		width: 16px;
		height: 16px;
		border-radius: 5px;
		background: #d7edcf;
		color: #4c8463;
		font-size: 9px;
	}
	.one {
		right: 7%;
		top: 100px;
		transform: rotate(8deg);
	}
	.two {
		left: 7%;
		bottom: 46px;
		transform: rotate(-8deg);
	}
	.proof {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 20px;
		padding: 20px;
		border-top: 1px solid #e5e7de;
		border-bottom: 1px solid #e5e7de;
		color: #71847b;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	.proof > i {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: #88b37b;
	}
	.platform {
		display: grid;
		grid-template-columns: 0.8fr 1.2fr;
		align-items: center;
		gap: clamp(45px, 9vw, 150px);
		padding: 140px clamp(24px, 7vw, 106px);
	}
	.intro > p:not(.kicker),
	.section-top > p {
		max-width: 390px;
		margin: 0;
		color: #71857b;
		font-size: 15px;
		line-height: 1.75;
	}
	.intro .text-link {
		margin-top: 25px;
	}
	h2 {
		margin: 0 0 23px;
		color: #133d35;
		font-size: clamp(42px, 4.6vw, 70px);
		font-weight: 700;
		line-height: 0.9;
		letter-spacing: -0.09em;
	}
	.workspace {
		overflow: hidden;
		border: 1px solid #e0e7df;
		border-radius: 17px;
		background: #fff;
		box-shadow: 0 20px 42px #21423712;
	}
	.tabs {
		display: flex;
		gap: 18px;
		padding: 15px 21px;
		border-bottom: 1px solid #e9eee9;
		color: #8b9b92;
		font-size: 10px;
	}
	.tabs b {
		color: #2e6d58;
	}
	.workbody {
		padding: 23px;
	}
	.welcome {
		display: flex;
		justify-content: space-between;
	}
	.welcome small,
	.welcome b {
		display: block;
	}
	.welcome small {
		color: #87988f;
		font-size: 10px;
	}
	.welcome b {
		margin-top: 5px;
		color: #234d41;
		font-size: 20px;
		letter-spacing: -0.06em;
	}
	.welcome > i {
		display: grid;
		place-items: center;
		width: 29px;
		height: 29px;
		border-radius: 8px;
		background: #eff5ea;
		color: #71906e;
		font-style: normal;
	}
	.metrics {
		display: grid;
		grid-template-columns: 1.1fr 0.9fr;
		gap: 9px;
		margin-top: 21px;
	}
	.metrics article,
	.workbottom article {
		padding: 16px;
		border-radius: 10px;
		background: #f4f8f1;
	}
	.metrics article:nth-child(2) {
		background: #e7f0dc;
	}
	.metrics small {
		color: #84968c;
		font-size: 10px;
	}
	.metrics b {
		display: block;
		margin-top: 8px;
		color: #315f50;
		font-size: 25px;
		letter-spacing: -0.06em;
	}
	.metrics article:first-child span {
		display: block;
		margin-top: 9px;
		color: #55906a;
		font-size: 9px;
	}
	.metrics sup {
		font-size: 13px;
	}
	.metrics article > i {
		display: block;
		height: 5px;
		margin-top: 12px;
		overflow: hidden;
		border-radius: 5px;
		background: #c8ddbd;
	}
	.metrics u {
		display: block;
		width: 91%;
		height: 100%;
		border-radius: inherit;
		background: #4f966d;
	}
	.workbottom {
		display: grid;
		grid-template-columns: 1.2fr 0.8fr;
		gap: 9px;
		margin-top: 9px;
	}
	.workbottom article {
		background: #f9faf7;
	}
	.workbottom article > div {
		display: flex;
		justify-content: space-between;
		font-size: 10px;
	}
	.workbottom article > div b {
		color: #3b6958;
	}
	.workbottom article > div span {
		color: #7e9e81;
	}
	.workbottom p {
		margin: 11px 0 0;
		color: #789087;
		font-size: 9px;
	}
	.workbottom p i {
		display: inline-grid;
		place-items: center;
		width: 15px;
		height: 15px;
		margin-right: 5px;
		border-radius: 4px;
		background: #f0d3b6;
		color: #9b674d;
		font-size: 8px;
		font-style: normal;
	}
	.health {
		display: flex;
		align-items: center;
		justify-content: space-between;
		color: #7f9388;
		font-size: 10px;
	}
	.health > i {
		display: grid;
		place-items: center;
		width: 55px;
		height: 55px;
		border: 7px solid #8fc174;
		border-left-color: #dcebd4;
		border-radius: 50%;
		color: #427557;
		font-size: 12px;
		font-style: normal;
	}
	.solutions {
		padding: 0 clamp(24px, 7vw, 106px) 140px;
	}
	.section-top {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 40px;
		margin-bottom: 45px;
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}
	.cards article {
		min-height: 284px;
		padding: 20px;
		border-radius: 12px;
		background: #e8f0e1;
	}
	.cards article:nth-child(2) {
		background: #f2d8bd;
	}
	.cards article:nth-child(3) {
		background: #dbe9e0;
	}
	.cards small {
		color: #76958a;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.1em;
	}
	.cards article > i {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		margin-top: 29px;
		border-radius: 10px;
		background: #f9fdf5;
		color: #4c8464;
		font-size: 22px;
		font-style: normal;
	}
	.cards article:nth-child(2) > i {
		color: #a76c4e;
		background: #f9ebd7;
	}
	.cards h3 {
		margin: 32px 0 10px;
		color: #355d4e;
		font-size: 24px;
		letter-spacing: -0.07em;
	}
	.cards p {
		max-width: 270px;
		margin: 0;
		color: #71897d;
		font-size: 13px;
		line-height: 1.65;
	}
	.cards a {
		display: inline-flex;
		gap: 8px;
		margin-top: 23px;
		color: #3d765c;
		font-size: 11px;
		font-weight: 700;
		text-decoration: none;
	}
	.cards a b {
		font-size: 15px;
	}
	.statement {
		display: grid;
		grid-template-columns: 0.8fr 1.2fr;
		gap: clamp(42px, 10vw, 150px);
		align-items: center;
		padding: 95px clamp(24px, 7vw, 106px);
		background: #0d4d43;
		color: #edf4e9;
	}
	.statement h2 {
		color: #f4f6ed;
	}
	.statement h2 em {
		color: #a9dc72;
	}
	.statement > div:last-child > p:not(.kicker) {
		max-width: 430px;
		color: #b4c9bd;
		font-size: 15px;
		line-height: 1.75;
	}
	.light {
		color: #9ac18d;
	}
	.light > i {
		background: #a9dc72;
	}
	.secondary {
		margin-top: 26px;
		background: #a9dc72;
		color: #164b41;
		box-shadow: none;
	}
	.secondary b {
		color: #367355;
	}
	.art {
		position: relative;
		width: min(100%, 340px);
		height: 265px;
		overflow: hidden;
		border: 1px solid #4a786c;
		border-radius: 150px 150px 16px 16px;
		background: #174f46;
	}
	.art > i {
		position: absolute;
		bottom: -1px;
		border: 20px solid #75a872;
		border-bottom: 0;
		border-radius: 100px 100px 0 0;
	}
	.art > i:first-child {
		left: 27px;
		width: 175px;
		height: 180px;
		opacity: 0.55;
	}
	.art > i:nth-child(2) {
		right: -26px;
		width: 180px;
		height: 211px;
		border-color: #a8d874;
		opacity: 0.72;
	}
	.art > i:nth-child(3) {
		left: -61px;
		width: 125px;
		height: 124px;
		border-color: #477f69;
	}
	.art > b {
		position: absolute;
		z-index: 3;
		left: 38%;
		top: 55px;
		color: #dcecc9;
		font-size: 93px;
		font-weight: 800;
		letter-spacing: -0.14em;
	}
	.art > span {
		position: absolute;
		z-index: 2;
		right: 34px;
		top: 40px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #f0c789;
	}
	@keyframes hover {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-7px);
		}
	}
	@media (max-width: 900px) {
		header {
			height: 75px;
		}
		nav {
			display: none;
		}
		.head-actions {
			margin-left: auto;
		}
		.hero {
			grid-template-columns: 1fr;
			padding-top: 70px;
		}
		.stage {
			width: min(670px, 100%);
			min-height: 450px;
		}
		.platform,
		.statement {
			grid-template-columns: 1fr;
		}
		.platform {
			padding-top: 100px;
			padding-bottom: 100px;
		}
		.statement .art {
			order: 2;
		}
		.pin {
			display: none;
		}
		.solutions {
			padding-bottom: 100px;
		}
	}
	@media (max-width: 600px) {
		header {
			padding: 0 18px;
		}
		.brand img {
			width: 34px;
			height: 34px;
		}
		.brand strong {
			font-size: 19px;
		}
		.head-actions {
			gap: 12px;
		}
		.head-actions > a:first-child {
			font-size: 12px;
		}
		.outline {
			padding: 9px 11px;
			font-size: 11px;
		}
		.hero {
			min-height: 0;
			padding: 61px 20px 60px;
		}
		h1 {
			font-size: clamp(49px, 14vw, 69px);
		}
		.lede {
			font-size: 15px;
		}
		.actions {
			align-items: flex-start;
			flex-direction: column;
			gap: 18px;
		}
		.trusted {
			margin-top: 38px;
		}
		.stage {
			min-height: 370px;
			border-radius: 18px 18px 5px 18px;
		}
		.overview {
			top: 56px;
			left: 16px;
			width: calc(100% - 32px);
		}
		.collect {
			top: 15px;
			right: 15px;
		}
		.fix {
			bottom: 15px;
			left: 15px;
		}
		.house {
			right: -6%;
			bottom: 28px;
			transform: scale(0.73);
			transform-origin: bottom right;
		}
		.proof {
			justify-content: flex-start;
			gap: 12px;
			overflow: hidden;
			white-space: nowrap;
			font-size: 9px;
		}
		.proof > i {
			flex: 0 0 4px;
		}
		.platform {
			gap: 51px;
			padding: 83px 20px;
		}
		.workbody {
			padding: 15px;
		}
		.metrics,
		.workbottom {
			grid-template-columns: 1fr;
		}
		.section-top {
			display: block;
			margin-bottom: 29px;
		}
		.section-top > p {
			margin-top: 20px;
		}
		.solutions {
			padding: 0 20px 83px;
		}
		.cards {
			grid-template-columns: 1fr;
		}
		.cards article {
			min-height: 237px;
		}
		.cards h3 {
			margin-top: 22px;
		}
		.statement {
			gap: 52px;
			padding: 75px 20px;
		}
		.art {
			width: 285px;
			height: 230px;
		}
		.art > b {
			font-size: 80px;
		}
		.art > i:first-child {
			width: 150px;
			height: 152px;
		}
		.art > i:nth-child(2) {
			width: 153px;
			height: 184px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		:global(html) {
			scroll-behavior: auto;
		}
		.overview {
			animation: none;
		}
	}
</style>
