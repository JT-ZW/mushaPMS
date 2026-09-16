<script lang="ts">
	import MarketingHeader from '$lib/components/MarketingHeader.svelte';
	import { contactEmail, contactPhone, whatsappHref } from '$lib/marketing';
	import MarketingFooter from '$lib/components/MarketingFooter.svelte';
</script>

<svelte:head
	><title>Contact Musha · Beta access</title><meta
		name="description"
		content="Request access to the Musha PMS beta."
	/></svelte:head
>
<MarketingHeader />
<main>
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<section class="hero">
		<p class="eyebrow">Musha Beta</p>
		<h1>Ready to run a<br /><em>better Musha?</em></h1>
		<p>
			We are inviting a small group of property teams into our beta. Tell Jeffrey a little about
			your portfolio and he will help you get started.
		</p>
		<div class="contact-grid">
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<a href={`mailto:${contactEmail}?subject=Musha%20PMS%20beta%20access`}
				><span>✉</span><small>Email Jeffrey</small><strong>{contactEmail}</strong><b>↗</b></a
			><!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<a href={whatsappHref} target="_blank" rel="noreferrer"
				><span>◌</span><small>Call or WhatsApp</small><strong>{contactPhone}</strong><b>↗</b></a
			>
		</div>
		<p class="note">Beta access is personally onboarded so every team gets the right foundation.</p>
	</section>
</main>
<MarketingFooter />

<style>
	:global(body) {
		margin: 0;
		background: #fbfaf7;
		color: #113b34;
		font-family: var(--font-body);
	}
	main {
		min-height: calc(100vh - 90px);
		display: grid;
		place-items: center;
		padding: 60px 24px;
		background:
			radial-gradient(circle at 85% 20%, #f7d8a6, transparent 25%),
			linear-gradient(130deg, #eef4e9, #f9f6ef);
	}
	.hero {
		max-width: 790px;
		text-align: center;
	}
	.eyebrow {
		color: #55836d;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}
	h1 {
		margin: 18px 0 23px;
		font-size: clamp(50px, 7vw, 90px);
		line-height: 0.9;
		letter-spacing: -0.09em;
	}
	em {
		color: #27846a;
		font-style: normal;
	}
	.hero > p:not(.eyebrow):not(.note) {
		max-width: 580px;
		margin: 0 auto;
		color: #6e8178;
		font-size: 17px;
		line-height: 1.7;
	}
	.contact-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-top: 43px;
		text-align: left;
	}
	.contact-grid a {
		position: relative;
		display: grid;
		gap: 5px;
		padding: 22px;
		border: 1px solid #dce7d9;
		border-radius: 14px;
		background: #fff;
		color: #315f50;
		text-decoration: none;
		box-shadow: 0 15px 30px #28513b12;
	}
	.contact-grid span {
		display: grid;
		place-items: center;
		width: 37px;
		height: 37px;
		margin-bottom: 9px;
		border-radius: 10px;
		background: #e4f2d4;
		color: #3d795e;
	}
	.contact-grid small {
		color: #82958b;
		font-size: 11px;
	}
	.contact-grid strong {
		font-size: 14px;
	}
	.contact-grid b {
		position: absolute;
		right: 20px;
		bottom: 20px;
	}
	.note {
		margin: 25px 0 0;
		color: #71877d;
		font-size: 12px;
	}
	@media (max-width: 600px) {
		.contact-grid {
			grid-template-columns: 1fr;
		}
		main {
			min-height: calc(100vh - 75px);
		}
	}
</style>
