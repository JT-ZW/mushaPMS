<script lang="ts">
	import BrandLogo from './BrandLogo.svelte';
	import { resolve } from '$app/paths';
	import { applicationHref, contactEmail } from '$lib/marketing';
</script>

<!-- Dynamic application and contact links may point outside the local router. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<footer class="site-footer">
	<div class="footer-top">
		<BrandLogo variant="footer" />
		<p>A better home for<br />the work behind your properties.</p>
		<a class="footer-contact" href={`mailto:${contactEmail}`}>Let’s build something lasting. ↗</a>
	</div>
	<div class="footer-bottom">
		<span>© {new Date().getFullYear()} Musha PMS · Made in Zimbabwe</span>
		<nav aria-label="Footer navigation">
			<a href={resolve('/platform')}>Platform</a><a href={resolve('/contact')}>Contact</a><a
				href={applicationHref()}>Sign in ↗</a
			>
		</nav>
		<span>Properties. People. Possibilities.</span>
	</div>
</footer>

<style>
	.site-footer {
		background: #112e26;
		color: #ebece2;
		padding: 62px 6% 25px;
		font-family: var(--font-body);
	}
	.footer-top {
		display: flex;
		align-items: center;
		gap: 55px;
		padding-bottom: 48px;
	}
	.footer-top p {
		font-size: 13px;
		line-height: 1.8;
		color: #c0cbc0;
	}
	.footer-contact {
		margin-left: auto;
		color: #d5e7b1;
		text-decoration: none;
		border-bottom: 1px solid #657b65;
		padding-bottom: 8px;
		font-size: 14px;
	}
	.footer-bottom {
		border-top: 1px solid #ffffff25;
		padding-top: 25px;
		display: flex;
		justify-content: space-between;
		gap: 24px;
		color: #abb9ad;
		font-size: 10px;
	}
	.footer-bottom nav {
		display: flex;
		gap: 25px;
	}
	.footer-bottom a {
		color: inherit;
		text-decoration: none;
	}
	.site-footer a:hover {
		color: white;
	}
	.site-footer a:focus-visible {
		outline: 2px solid #d5e7b1;
		outline-offset: 6px;
	}
	@media (max-width: 700px) {
		.site-footer {
			padding: 45px 6% 25px;
		}
		.footer-top {
			flex-wrap: wrap;
			gap: 25px;
		}
		.footer-contact {
			margin: 0;
		}
		.footer-bottom {
			flex-direction: column;
			gap: 20px;
		}
		.footer-top p {
			margin: 0;
		}
	}
</style>
