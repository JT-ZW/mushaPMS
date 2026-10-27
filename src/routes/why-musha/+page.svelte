<script lang="ts">
	import { resolve } from '$app/paths';
	import MarketingShell from '$lib/components/MarketingShell.svelte';
</script>

<svelte:head
	><title>Our approach — Musha PMS</title><meta
		name="description"
		content="Built in Zimbabwe, around the people and care behind every property. Discover the thinking behind Musha PMS."
	/></svelte:head
>
<MarketingShell
	><main id="main-content">
		<section class="editorial-hero">
			<div>
				<p class="eyebrow">The thinking behind Musha</p>
				<h1>Property is personal.<br /><em>So is the way<br />you manage it.</em></h1>
				<p class="description">
					An owner’s investment. A tenant’s home. A team’s daily work. Behind every property are
					people who depend on the details being handled well.
				</p>
				<a class="text-link" href={resolve('/contact')}
					>Meet your next working partner <span>↗</span></a
				>
			</div>
			<figure>
				<img
					src="/images/musha-residence.jpg"
					alt="Natural light filling an inviting contemporary home"
					width="2400"
					height="1600"
				/>
				<figcaption>PLACES ARE BETTER WHEN PEOPLE ARE LOOKED AFTER.</figcaption>
			</figure>
		</section>
		<section class="section two-column" data-reveal>
			<div>
				<p class="eyebrow">A digital homestead</p>
				<h2>Home is more<br /><em>than an address.</em></h2>
				<p>
					In Shona, musha means home or homestead. It speaks to a place, its people and a sense of
					belonging. That idea is at the heart of what we are building.
				</p>
				<p>
					Made in Zimbabwe, Musha begins with residential property management and the everyday work
					of the teams who keep it running.
				</p>
			</div>
			<blockquote class="editorial-quote">
				“A good property system should make the day feel more manageable.”
			</blockquote>
		</section>
		<section class="dark-section">
			<div class="section two-column" data-reveal>
				<div>
					<p class="eyebrow">Our design principles</p>
					<h2>Considered tools.<br /><em>For real work.</em></h2>
					<p>
						Clarity is useful. Context matters. Good systems should help your team follow through.
					</p>
				</div>
				<div class="numbered-list">
					<article>
						<span>01</span>
						<div>
							<h3>Keep the whole picture close</h3>
							<p>Connect properties, people and operations so decisions begin with context.</p>
						</div>
					</article>
					<article>
						<span>02</span>
						<div>
							<h3>Make responsibility visible</h3>
							<p>Bring requests, follow-ups and renewals into a shared working view.</p>
						</div>
					</article>
					<article>
						<span>03</span>
						<div>
							<h3>Build with room to grow</h3>
							<p>
								Start with a dependable residential foundation and develop the platform with real
								teams.
							</p>
						</div>
					</article>
				</div>
			</div>
		</section>
		<section class="section" data-reveal>
			<p class="eyebrow">A few things to know</p>
			<h2>Before you <em>step inside.</em></h2>
			<div class="faq-list">
				<details>
					<summary>Who is Musha for?</summary>
					<p>
						Musha is built for residential property owners, managers and operating teams who want to
						connect properties, people, leases, rent and maintenance in one workspace.
					</p>
				</details>
				<details>
					<summary>Can I try it before requesting access?</summary>
					<p>
						Yes. The product tour is an interactive, frontend-only workspace with fictional data.
						You can explore it without an account. <a class="text-link" href={resolve('/demo')}
							>Open the product tour ↗</a
						>
					</p>
				</details>
				<details>
					<summary>Is the platform available now?</summary>
					<p>
						Residential operations are available through our personally onboarded beta. Commercial
						and student accommodation are on the roadmap; short-stay support is a future connection.
					</p>
				</details>
				<details>
					<summary>How do we get started?</summary>
					<p>
						Contact Jeffrey with a little about your portfolio and your current process. We’ll
						discuss your requirements and help establish the right foundation for your team.
					</p>
				</details>
			</div>
		</section>
		<section class="section closing-cta" data-reveal>
			<p class="eyebrow">Let’s build a better everyday</p>
			<h2>Good management.<br /><em>Begins with care.</em></h2>
			<div>
				<p>Bring your portfolio’s next chapter<br />into the conversation.</p>
				<a class="button button-green" href={resolve('/contact')}
					>Get to know Musha <span>↗</span></a
				>
			</div>
		</section>
	</main></MarketingShell
>
