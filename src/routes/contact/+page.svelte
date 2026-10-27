<script lang="ts">
	import MarketingShell from '$lib/components/MarketingShell.svelte';
	import { contactEmail, contactPhone, whatsappHref } from '$lib/marketing';
</script>

<!-- Dynamic application and contact links may point outside the local router. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<svelte:head
	><title>Let’s talk — Musha PMS</title><meta
		name="description"
		content="Tell us about your portfolio. Request personally onboarded beta access to Musha property management."
	/></svelte:head
>
<MarketingShell
	><main id="main-content">
		<section class="contact-layout">
			<div>
				<p class="eyebrow">A conversation is a good beginning</p>
				<h1>Your portfolio.<br />Your people.<br /><em>Let’s talk.</em></h1>
				<p class="description">
					We’re welcoming property teams into the Musha beta. Tell Jeffrey a little about the places
					you manage and the way you work today.
				</p>
				<div class="contact-options">
					<a
						class="contact-option"
						href={`mailto:${contactEmail}?subject=Musha%20PMS%20beta%20access`}
						><span>01</span>
						<div><small>WRITE TO JEFFREY</small><strong>{contactEmail}</strong></div>
						<b>↗</b></a
					><a class="contact-option" href={whatsappHref} target="_blank" rel="noreferrer"
						><span>02</span>
						<div><small>START A WHATSAPP CONVERSATION</small><strong>{contactPhone}</strong></div>
						<b>↗</b></a
					>
				</div>
				<p class="contact-note">Already have a workspace? Use Sign in in the navigation.</p>
			</div>
			<aside class="contact-aside">
				<img
					src="/images/musha-interior.jpg"
					alt="Warm, light-filled living room with natural furniture"
					width="1400"
					height="1000"
				/>
				<div>
					<p class="eyebrow">A thoughtful start</p>
					<h3>What happens next?</h3>
					<ol>
						<li>Tell us about your properties and team.</li>
						<li>Walk through Musha together.</li>
						<li>Plan your personally guided beta onboarding.</li>
					</ol>
				</div>
			</aside>
		</section>
	</main></MarketingShell
>
