<script lang="ts">
    export let label: string;
    export let name: string;
    export let input: string;
    export let disabled: boolean = false;
    export let classes: string = "";
</script>

<div class="field {classes} {disabled ? ' disabled'  : ''}">
    <label for={name}>{label || name}</label>
    <input id="{name}" {...$$props} bind:value={input} />
</div>
