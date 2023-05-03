import { derived } from 'svelte/store';

export function transformed(store, options) {
    const identity = x => x;
    const transformIn = options.in ?? identity;
    const transformOut = options.out ?? identity;

    const { subscribe } = derived(store, $store => transformIn($store));
    const set = value => store.set(transformOut(value));

    return { subscribe, set };
}