<script lang="ts">
	let selected = $state(0);
	const tabs = ['Portfolio', 'Collections', 'Maintenance'];
	const content = [
		{
			label: 'Your portfolio, at a glance',
			title: 'Every address. One clear view.',
			rows: [
				['Mabel Court', 'Borrowdale · 12 spaces', '11 occupied'],
				['Acacia Place', 'Avondale · 8 spaces', '7 occupied'],
				['The Grove', 'Mount Pleasant · 4 spaces', '4 occupied']
			]
		},
		{
			label: 'Keep the numbers connected',
			title: 'Know what’s due. See what’s paid.',
			rows: [
				['Rent charges', 'September · Mabel Court', 'Invoiced'],
				['Payment received', 'Acacia Place · Unit 02', 'Allocated'],
				['Collection follow-up', 'Mabel Court · Unit 08', 'Needs attention']
			]
		},
		{
			label: 'From report to resolution',
			title: 'Good care starts with clear ownership.',
			rows: [
				['Kitchen tap repair', 'Mabel Court · Unit 04', 'In progress'],
				['Garden maintenance', 'The Grove · Shared spaces', 'Scheduled'],
				['Electrical inspection', 'Acacia Place · Unit 06', 'Completed']
			]
		}
	];
</script>

<div class="portfolio-preview">
	<div class="preview-bar">
		<span class="preview-brand">m<span>.</span></span><span>Musha workspace</span><small
			>ILLUSTRATIVE DEMO</small
		>
	</div>
	<div class="preview-tabs" aria-label="Workspace preview">
		{#each tabs as tab, i (tab)}<button
				type="button"
				aria-pressed={selected === i}
				onclick={() => (selected = i)}>{tab}</button
			>{/each}
	</div>
	<div class="preview-body" aria-live="polite">
		<p class="preview-label">{content[selected].label}</p>
		<h3>{content[selected].title}</h3>
		<div class="preview-rows">
			{#each content[selected].rows as row, i (row[0])}<div class="preview-row">
					<span class="property-number">0{i + 1}</span><span
						><strong>{row[0]}</strong><small>{row[1]}</small></span
					><span class="row-status">{row[2]}</span>
				</div>{/each}
		</div>
	</div>
	<div class="preview-foot">
		<span><i></i> A connected working day</span><span>Properties → People → Operations</span>
	</div>
</div>

<style>
	.portfolio-preview {
		background: #fffef9;
		border: 1px solid #d9ded3;
		border-radius: 5px;
		color: #233e33;
		box-shadow: 0 30px 70px #152d2520;
		overflow: hidden;
	}
	.preview-bar {
		display: flex;
		gap: 12px;
		align-items: center;
		padding: 16px 22px;
		border-bottom: 1px solid #e4e6dd;
		font-size: 12px;
	}
	.preview-brand {
		font-size: 31px;
		font-weight: 700;
		letter-spacing: -3px;
	}
	.preview-brand span {
		color: #78915c;
	}
	.preview-bar > small {
		margin-left: auto;
		font-size: 8px;
		letter-spacing: 1.3px;
		color: #717f70;
	}
	.preview-tabs {
		display: flex;
		gap: 24px;
		padding: 0 24px;
		background: #f5f5ee;
		border-bottom: 1px solid #e4e6dd;
	}
	.preview-tabs button {
		background: none;
		border: 0;
		border-bottom: 2px solid transparent;
		font: inherit;
		font-size: 11px;
		color: #71806e;
		padding: 16px 0;
		cursor: pointer;
	}
	.preview-tabs button[aria-pressed='true'] {
		color: #203d32;
		border-color: #203d32;
	}
	.preview-tabs button:focus-visible {
		outline: 2px solid #708a4e;
		outline-offset: 2px;
	}
	.preview-body {
		padding: 30px 25px;
	}
	.preview-label {
		font-size: 11px;
		color: #778371;
		margin: 0 0 9px;
	}
	.preview-body h3 {
		font-weight: 500;
		font-size: 23px;
		letter-spacing: -0.8px;
		line-height: 1.2;
		margin: 0 0 25px;
		min-height: 55px;
	}
	.preview-row {
		display: flex;
		align-items: center;
		gap: 13px;
		border-top: 1px solid #e5e7df;
		padding: 18px 0;
	}
	.property-number {
		font-size: 10px;
		background: #ecefe3;
		padding: 11px;
		color: #748365;
	}
	.preview-row strong {
		display: block;
		font-size: 12px;
		font-weight: 600;
	}
	.preview-row small {
		display: block;
		font-size: 10px;
		color: #7b8578;
		margin-top: 5px;
	}
	.row-status {
		margin-left: auto;
		font-size: 9px;
		background: #ecf1e4;
		padding: 6px 8px;
		color: #47603c;
		white-space: nowrap;
	}
	.preview-foot {
		display: flex;
		justify-content: space-between;
		gap: 15px;
		border-top: 1px solid #e4e6dd;
		padding: 17px 24px;
		font-size: 8px;
		color: #70816b;
	}
	.preview-foot i {
		display: inline-block;
		width: 5px;
		height: 5px;
		background: #729357;
		border-radius: 50%;
		margin-right: 5px;
	}
	@media (max-width: 480px) {
		.preview-body {
			padding: 24px 16px;
		}
		.preview-row {
			gap: 9px;
		}
		.row-status {
			font-size: 8px;
			padding: 5px;
		}
		.preview-foot > span:last-child {
			display: none;
		}
		.preview-tabs {
			gap: 20px;
			padding: 0 16px;
		}
		.preview-bar {
			padding: 13px 16px;
		}
		.preview-bar > small {
			font-size: 7px;
		}
	}
</style>
