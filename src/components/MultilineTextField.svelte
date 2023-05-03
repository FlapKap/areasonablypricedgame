<script lang="ts">
    export let label: string;
    export let name: string;
    export let input: string;
    export let disabled: boolean = false;
</script>

<div class={ "ui field" + (disabled ? ' disabled'  : '')}>
    <label for={name}>{label || name}</label>
    <!--suppress CheckEmptyScriptTag -->
    <textarea id="{name}" {...$$props} bind:value={input} rows="{input ? input.split(/\n/g).length + 3 : 3}"/>
</div>
