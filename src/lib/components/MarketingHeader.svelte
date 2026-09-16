<script lang="ts">
	import { applicationHref } from '$lib/marketing';
	import { resolve } from '$app/paths';
</script>

<header class="marketing-header">
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
	<div class="actions">
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a class="sign-in" href={applicationHref()}>Sign in</a><a
			class="contact"
			href={resolve('/contact')}>Contact us <b>↗</b></a
		>
	</div>
</header>

<style>
	.marketing-header {
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
	.sign-in {
		color: #65766f;
		font-size: 13px;
		text-decoration: none;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 23px;
	}
	.contact {
		padding: 11px 15px;
		border: 1px solid #b9d9c5;
		border-radius: 9px;
		color: #155a4e;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
	}
	.contact b {
		margin-left: 7px;
	}
	@media (max-width: 700px) {
		.marketing-header {
			height: 75px;
			padding: 0 18px;
		}
		nav {
			display: none;
		}
		.actions {
			margin-left: auto;
			gap: 12px;
		}
		.sign-in {
			font-size: 12px;
		}
		.contact {
			padding: 9px 11px;
			font-size: 11px;
		}
		.brand img {
			width: 34px;
			height: 34px;
		}
		.brand strong {
			font-size: 19px;
		}
	}
	@media (max-width: 700px) {
		.marketing-header {
			height: auto;
			min-height: 75px;
			flex-wrap: wrap;
			padding: 10px 18px 0;
		}
		.marketing-header nav {
			display: flex;
			order: 3;
			width: 100%;
			margin: 9px 0 0;
			overflow-x: auto;
			gap: 5px;
			padding-bottom: 10px;
			scrollbar-width: none;
		}
		.marketing-header nav::-webkit-scrollbar {
			display: none;
		}
		.marketing-header nav a {
			white-space: nowrap;
			padding: 7px 9px;
			border-radius: 6px;
			background: #f4f7f1;
			font-size: 11px;
		}
	}
</style>
