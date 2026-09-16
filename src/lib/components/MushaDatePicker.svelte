<script lang="ts">
	let { name, value = $bindable(''), required = false } = $props<{
		name: string;
		value?: string;
		required?: boolean;
	}>();
	let open = $state(false);
	let month = $state(new Date());
	const today = new Date().toISOString().slice(0, 10);
	const format = (date: Date) => date.toISOString().slice(0, 10);
	const display = (date: string) => date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Choose a date';
	const days = $derived.by(() => {
		const start = new Date(month.getFullYear(), month.getMonth(), 1);
		const first = new Date(start); first.setDate(start.getDate() - start.getDay());
		return Array.from({ length: 42 }, (_, index) => { const day = new Date(first); day.setDate(first.getDate() + index); return day; });
	});
	const changeMonth = (step: number) => month = new Date(month.getFullYear(), month.getMonth() + step, 1);
	const pick = (date: Date) => { value = format(date); open = false; };
</script>

<div class="date-picker">
	<input type="hidden" {name} {value} {required} />
	<button class="date-trigger" type="button" onclick={() => (open = !open)} aria-haspopup="dialog" aria-expanded={open}><span>{display(value)}</span><b>▣</b></button>
	{#if open}<div class="calendar" role="dialog" aria-label="Choose date"><header><button type="button" onclick={() => changeMonth(-1)} aria-label="Previous month">‹</button><strong>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong><button type="button" onclick={() => changeMonth(1)} aria-label="Next month">›</button></header><div class="weekdays">{#each ['Su','Mo','Tu','We','Th','Fr','Sa'] as day}<span>{day}</span>{/each}</div><div class="days">{#each days as day (day.toISOString())}<button type="button" class:outside={day.getMonth() !== month.getMonth()} class:today={format(day) === today} class:selected={format(day) === value} onclick={() => pick(day)}>{day.getDate()}</button>{/each}</div><footer><button type="button" onclick={() => pick(new Date())}>Today</button><button type="button" onclick={() => (open = false)}>Done</button></footer></div>{/if}
</div>

<style>.date-picker{position:relative}.date-trigger{align-items:center;background:#fbfcfa;border:1px solid #d7e5dc;border-radius:8px;color:#244f40;display:flex;font:inherit;justify-content:space-between;padding:12px 13px;width:100%}.date-trigger b{color:#5d8b6a;font-size:14px}.calendar{background:#fff;border:1px solid #d9e7dc;border-radius:12px;box-shadow:0 18px 38px #143c2b20;left:0;margin-top:7px;padding:13px;position:absolute;top:100%;width:290px;z-index:20}.calendar header{align-items:center;display:flex;justify-content:space-between;margin-bottom:12px}.calendar header button,.calendar footer button{background:#edf5d9;border:0;border-radius:6px;color:#47795a;cursor:pointer;font:inherit;font-weight:800;padding:6px 9px}.calendar header strong{color:#234d3e;font-size:13px}.weekdays,.days{display:grid;grid-template-columns:repeat(7,1fr);text-align:center}.weekdays{color:#809a8d;font-size:10px;font-weight:800;margin-bottom:5px}.days button{background:transparent;border:0;border-radius:7px;color:#335b4b;cursor:pointer;font:inherit;font-size:11px;height:31px;margin:1px}.days button:hover{background:#edf5d9}.days button.outside{color:#b4c2ba}.days button.today{box-shadow:inset 0 0 0 1px #93bd78}.days button.selected{background:#0b5148;color:#fff}.calendar footer{display:flex;justify-content:space-between;margin-top:11px}</style>
