<script lang="ts">
    export let label: string;
    export let name: string;
    export let input: string;
    export let disabled: boolean = false;
</script>

<div class={ "field " + (disabled ? ' disabled'  : '')}>
    <label for={name}>{label || name}</label>
    <input id="{name}" {...$$props} bind:value={input} />
</div>
