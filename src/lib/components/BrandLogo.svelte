<script lang="ts">
	import { resolve } from '$app/paths';
	let { variant = 'header' } = $props<{ variant?: 'header' | 'footer' | 'auth' }>();
</script>

<a
	class="brand-logo {variant}"
	href={resolve('/')}
	aria-label="Musha Property Management System — home"
	><img src="/logo.png" alt="Musha Property Management System" width="1254" height="1254" /></a
>

<style>
	.brand-logo {
		display: inline-flex;
		flex: none;
		background: #fff;
		border: 1px solid #e5e8df;
		border-radius: 4px;
		padding: 4px;
		line-height: 0;
		width: 108px;
		box-sizing: border-box;
	}
	.brand-logo img {
		display: block;
		width: 100%;
		height: auto;
		object-fit: contain;
	}
	.brand-logo.footer {
		width: 150px;
		padding: 7px;
	}
	.brand-logo.auth {
		width: 112px;
	}
	.brand-logo:focus-visible {
		outline: 2px solid #a7bc80;
		outline-offset: 6px;
	}
	@media (max-width: 780px) {
		.brand-logo {
			width: 88px;
		}
		.brand-logo.footer {
			width: 132px;
		}
		.brand-logo.auth {
			width: 100px;
		}
	}
</style>
