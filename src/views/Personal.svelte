<!-- Personal.svelte -->
<script lang="ts">
    import { onMount } from "svelte";
    import { getAllGames } from "../lib/games";
    import { getAllListGames } from "../lib/list";
    import type { ListGame } from "../lib/list";
    import { currentUser } from "../lib/pocketbase";
    import type { GamesResponse } from "../lib/pocketbase-types";
    import type { ListMode } from "../lib/pocketbase-types";
    import GameCard from "../components/GameCard.svelte";
    import ListItem from "../components/ListItem.svelte";
    import ModeSelector from "../components/ModeSelector.svelte";
    import ColumnGridMode from "../components/modes/ColumnGridMode.svelte";
    import RowGridMode from "../components/modes/RowGridMode.svelte";
    import ListModeComponent from "../components/modes/ListMode.svelte";
    import PositionDragMode from "../components/modes/PositionDragMode.svelte";
    import BinaryTreeMode from "../components/modes/BinaryTreeMode.svelte";
    import SpiralMode from "../components/modes/SpiralMode.svelte";
    import { pb } from "../lib/pocketbase";
    import { Collections } from "../lib/pocketbase-types";
    import { writable } from "svelte/store";
    import type { Writable } from "svelte/store";
    import { getListMode, setListMode } from "../lib/userSettings";

    let listItems: Writable<ListGame[]> = writable([]);
    let games: Writable<GamesResponse[]> = writable([]);
    let listEmpty = true;
    let mode: ListMode = "column-grid";

    // ── Undo / Redo ───────────────────────────────────────────────────────────
    type Snapshot = Array<{ gameId: string; position: number }>;
    let undoStack: Snapshot[] = [];
    let redoStack: Snapshot[] = [];

    function snapshot(): Snapshot {
        return $listItems.map(li => ({ gameId: li.game.id, position: li.position ?? 0 }));
    }

    function pushHistory() {
        undoStack = [...undoStack.slice(-49), snapshot()];
        redoStack = [];
    }

    async function applySnapshot(target: Snapshot) {
        const currentMap = new Map($listItems.map(li => [li.game.id, li]));
        const targetMap = new Map(target.map(s => [s.gameId, s.position]));

        await Promise.all(
            $listItems
                .filter(li => !targetMap.has(li.game.id))
                .map(li => pb.collection(Collections.ListItems).delete(li.id, { $autoCancel: false }))
        );

        const toAdd = target.filter(s => !currentMap.has(s.gameId));
        const newRecords = await Promise.all(
            toAdd.map(s => pb.collection(Collections.ListItems).create(
                { position: s.position, game: s.gameId, user: $currentUser.id },
                { $autoCancel: false }
            ))
        );

        await Promise.all(
            target
                .filter(s => currentMap.has(s.gameId) && currentMap.get(s.gameId).position !== s.position)
                .map(s => pb.collection(Collections.ListItems).update(
                    currentMap.get(s.gameId).id, { position: s.position }, { $autoCancel: false }
                ))
        );

        const allGames: GamesResponse[] = [
            ...$listItems.map(li => li.game),
            ...$games,
        ].filter((g, i, arr) => arr.findIndex(x => x.id === g.id) === i);

        const newRecordMap = new Map(toAdd.map((s, i) => [s.gameId, newRecords[i].id]));
        const newList: ListGame[] = target.map(s => {
            const existing = currentMap.get(s.gameId);
            const game = allGames.find(g => g.id === s.gameId)!;
            return { id: existing?.id ?? newRecordMap.get(s.gameId)!, position: s.position, game };
        }).sort((a, b) => a.position - b.position);

        listItems.set(newList);
        const listedIds = new Set(newList.map(li => li.game.id));
        games.set(allGames.filter(g => !listedIds.has(g.id)));
        listEmpty = newList.length === 0;
    }

    async function undoAction() {
        if (!undoStack.length) return;
        redoStack = [...redoStack, snapshot()];
        const target = undoStack[undoStack.length - 1];
        undoStack = undoStack.slice(0, -1);
        await applySnapshot(target);
    }

    async function redoAction() {
        if (!redoStack.length) return;
        undoStack = [...undoStack.slice(-49), snapshot()];
        const target = redoStack[redoStack.length - 1];
        redoStack = redoStack.slice(0, -1);
        await applySnapshot(target);
    }

    // ── Mobile detection ──────────────────────────────────────────────────────
    let isMobile = false;

    type MobileSelection =
        | { source: 'pool'; game: GamesResponse; poolIndex: number }
        | { source: 'list'; listIndex: number }
        | null;
    let mobileSelection: MobileSelection = null;

    // ── Drag state (desktop) ──────────────────────────────────────────────────
    type DragParams = {
        source: "games" | "list"
        sourceIndex: number | undefined
        index: number | undefined
        itemId: string | undefined
        game: GamesResponse
    }
    let dragParams: DragParams | undefined;

    async function removeFromList() {
        if (dragParams?.source !== "list") return;
        pushHistory();
        const params = dragParams;
        await pb.collection(Collections.ListItems).delete(params.itemId, { $autoCancel: false });
        games.update(it => { it.push(params.game); return it; });
        listItems.update(arr => {
            const copy = arr.filter((_, i) => i !== params.sourceIndex);
            Promise.all(copy.map((li, i) => {
                li.position = i;
                return pb.collection(Collections.ListItems).update(li.id, { position: i }, { $autoCancel: false });
            }));
            return copy;
        });
        listEmpty = $listItems.length === 0;
    }

    function displace(arr: ListGame[], old_index: number, new_index: number) {
        if (new_index >= arr.length) {
            let k = new_index - arr.length + 1;
            while (k--) arr.push(undefined);
        }
        arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
        return arr;
    }

    async function dropAt(targetIndex: number) {
        const params = dragParams;
        if (!params) return;
        pushHistory();
        if (params.source === "games") {
            games.update(it => { it.splice(params.sourceIndex, 1); return it; });
            const record = await pb.collection(Collections.ListItems).create(
                { position: 0, game: params.game.id, user: $currentUser.id },
                { $autoCancel: false }
            );
            listItems.update(arr => {
                const idx = Math.min(targetIndex, arr.length);
                arr.splice(idx, 0, { id: record.id, position: 0, game: params.game } as ListGame);
                Promise.all(arr.map((li, i) => {
                    li.position = i;
                    return pb.collection(Collections.ListItems).update(li.id, { position: i }, { $autoCancel: false });
                }));
                return arr;
            });
        } else if (params.source === "list") {
            listItems.update(arr => {
                const idx = Math.min(targetIndex, arr.length - 1);
                const displaced = displace(arr, params.sourceIndex, idx);
                Promise.all(displaced.map((li, i) => {
                    li.position = i;
                    return pb.collection(Collections.ListItems).update(li.id, { position: i }, { $autoCancel: false });
                }));
                return displaced;
            });
        }
        listEmpty = $listItems.length === 0;
    }

    async function swapPositions(indexA: number, indexB: number) {
        pushHistory();
        listItems.update(arr => {
            const copy = [...arr];
            [copy[indexA], copy[indexB]] = [copy[indexB], copy[indexA]];
            copy[indexA].position = indexA;
            copy[indexB].position = indexB;
            Promise.all([
                pb.collection(Collections.ListItems).update(copy[indexA].id, { position: indexA }, { $autoCancel: false }),
                pb.collection(Collections.ListItems).update(copy[indexB].id, { position: indexB }, { $autoCancel: false }),
            ]);
            return copy;
        });
    }

    function dragFromList(listGame: ListGame, index: number) {
        dragParams = {
            source: "list",
            sourceIndex: index,
            index,
            itemId: listGame.id,
            game: listGame.game
        } as DragParams;
    }

    function dragFromGames(game: GamesResponse, index: number) {
        dragParams = { source: "games", game, sourceIndex: index } as DragParams;
    }

    async function removeRankedGame(rankIndex: number) {
        const item = $listItems[rankIndex];
        if (!item) return;
        pushHistory();
        await pb.collection(Collections.ListItems).delete(item.id, { $autoCancel: false });
        listItems.update(arr => {
            const copy = arr.filter((_, i) => i !== rankIndex);
            const promises = copy.map((li, i) => {
                li.position = i;
                return pb.collection(Collections.ListItems).update(li.id, { position: i }, { $autoCancel: false });
            });
            Promise.all(promises);
            return copy;
        });
        games.update(it => { it.push(item.game); return it; });
        listEmpty = $listItems.length === 0;
    }

    async function changeMode(newMode: ListMode) {
        mode = newMode;
        await setListMode(newMode);
    }

    // Called from PositionDragMode when a badge is dropped onto an unranked pool game
    async function addGameWithPosition(game: GamesResponse, targetPosition: number) {
        pushHistory();
        const endPos = $listItems.length;
        const record = await pb.collection(Collections.ListItems).create(
            { position: endPos, game: game.id, user: $currentUser.id },
            { $autoCancel: false }
        );
        listItems.update(it => { it.push({ id: record.id, position: endPos, game } as ListGame); return it; });
        games.update(it => it.filter(g => g.id !== game.id));
        listEmpty = false;
        if (targetPosition < endPos) {
            listItems.update(array => {
                const arr = displace(array, endPos, targetPosition);
                const promises = arr.map((li, i) => {
                    li.position = i;
                    return pb.collection(Collections.ListItems).update(li.id, { position: i }, { $autoCancel: false });
                });
                Promise.all(promises);
                return arr;
            });
        }
    }

    // ── Mobile helpers ────────────────────────────────────────────────────────

    // Insert a pool game at a specific list position (used by mobile tap interaction)
    async function insertGameAt(game: GamesResponse, poolIndex: number, targetIndex: number) {
        pushHistory();
        games.update(it => { it.splice(poolIndex, 1); return it; });
        const record = await pb.collection(Collections.ListItems).create(
            { position: 0, game: game.id, user: $currentUser.id },
            { $autoCancel: false }
        );
        listItems.update(arr => {
            const idx = Math.min(targetIndex, arr.length);
            arr.splice(idx, 0, { id: record.id, position: 0, game } as ListGame);
            Promise.all(arr.map((li, i) => {
                li.position = i;
                return pb.collection(Collections.ListItems).update(li.id, { position: i }, { $autoCancel: false });
            }));
            return arr;
        });
        listEmpty = $listItems.length === 0;
    }

    function mobileTapPool(game: GamesResponse, poolIndex: number) {
        if (mobileSelection?.source === 'pool' && mobileSelection.game.id === game.id) {
            mobileSelection = null; // deselect
        } else {
            mobileSelection = { source: 'pool', game, poolIndex };
        }
    }

    async function mobileTapList(listIndex: number) {
        if (mobileSelection?.source === 'pool') {
            await insertGameAt(mobileSelection.game, mobileSelection.poolIndex, listIndex);
            mobileSelection = null;
        } else if (mobileSelection?.source === 'list') {
            if (mobileSelection.listIndex !== listIndex) {
                await swapPositions(mobileSelection.listIndex, listIndex);
            }
            mobileSelection = null;
        } else {
            mobileSelection = { source: 'list', listIndex };
        }
    }

    async function mobileTapAppend() {
        if (mobileSelection?.source !== 'pool') return;
        await insertGameAt(mobileSelection.game, mobileSelection.poolIndex, $listItems.length);
        mobileSelection = null;
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    onMount(async () => {
        const mq = window.matchMedia('(max-width: 768px)');
        isMobile = mq.matches;
        mq.addEventListener('change', e => { isMobile = e.matches; });

        mode = await getListMode();
        if ($listItems.length === 0) {
            const allListItems = await getAllListGames($currentUser.id);
            listItems.set(allListItems);
        }
        games.set(await getAllGames());
        games.set($games.filter(it => !$listItems.find(li => li.game.id === it.id)));
        listEmpty = $listItems.length === 0;
    });

    $: isBadgeRank = mode === "position-drag";
    $: usesCustomDrop = mode === "binary-tree" || mode === "spiral";
    $: isCanvas = mode === "binary-tree" || mode === "spiral";
</script>

<svelte:window on:keydown={(e) => {
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoAction(); }
    if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redoAction(); }
}} />

{#if isMobile}
<!-- ── Mobile layout ────────────────────────────────────────────────────────── -->
<div class="mobile-layout">
    <!-- Pool: compact tap-to-select grid -->
    <div class="mobile-pool segment">
        <p class="pool-title">
            Add Games
            {#if mobileSelection?.source === 'pool'}<span class="mobile-hint">→ tap a spot in your list</span>{/if}
        </p>
        {#if $games.length === 0}
            <p class="mobile-empty-pool">All games added!</p>
        {:else}
        <div class="mobile-pool-scroll">
            {#each $games as game, i}
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                    class="mobile-pool-item"
                    class:selected={mobileSelection?.source === 'pool' && mobileSelection.game.id === game.id}
                    on:click={() => mobileTapPool(game, i)}
                >
                    <GameCard {game} />
                    <span class="mobile-game-name">{game.name}</span>
                </div>
            {/each}
        </div>
        {/if}
    </div>

    <!-- List: tappable rows with × buttons -->
    <div class="mobile-list segment">
        <p class="pool-title">
            My List
            {#if mobileSelection?.source === 'list'}<span class="mobile-hint">→ tap another to swap</span>{/if}
        </p>
        {#if listEmpty}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <p class="mobile-empty-list" on:click={mobileTapAppend}>
                {#if mobileSelection?.source === 'pool'}Tap here to add "{mobileSelection.game.name}"{:else}Select a game above to start ranking{/if}
            </p>
        {:else}
            {#each $listItems as listGame, i}
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                    class="mobile-list-item"
                    class:selected={mobileSelection?.source === 'list' && mobileSelection.listIndex === i}
                    on:click={() => mobileTapList(i)}
                >
                    <ListItem position={i} game={listGame.game} compact={true} />
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <button class="remove-btn" on:click|stopPropagation={() => removeRankedGame(i)}>×</button>
                </div>
            {/each}
            {#if mobileSelection?.source === 'pool'}
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div class="mobile-append-zone" on:click={mobileTapAppend}>
                    + Add "{mobileSelection.game.name}" to end
                </div>
            {/if}
        {/if}
    </div>
</div>

{:else}
<!-- ── Desktop layout ──────────────────────────────────────────────────────── -->
<div class="personal-layout" class:no-pool={isBadgeRank}>
    <!-- Left: game pool (hidden in badge-rank mode) -->
    {#if !isBadgeRank}
    <div
        class="segment games-pool"
        on:drop={removeFromList}
        on:dragover={(event) => event.preventDefault()}
    >
        <p class="pool-title">Add Games</p>
        <div class="pool-scroll">
            {#each $games as game, i}
                <GameCard
                    game={game}
                    on:dragstart={async (_) => await dragFromGames(game, i)}
                    on:dragover={(event) => event.preventDefault()}
                />
            {/each}
        </div>
    </div>
    {/if}

    <!-- Right: ranked list -->
    <div class="segment column list-section" class:canvas-section={isCanvas}>
        <div class="list-header">
            <ModeSelector current={mode} onChange={changeMode} />
            <div class="undo-redo">
                <button class="icon-btn" on:click={undoAction} disabled={undoStack.length === 0} title="Undo (Ctrl+Z)">↩</button>
                <button class="icon-btn" on:click={redoAction} disabled={redoStack.length === 0} title="Redo (Ctrl+Y)">↪</button>
            </div>
        </div>

        {#if listEmpty && !isCanvas}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <p class="empty-hint" on:drop={async () => await dropAt(0)} on:dragover|preventDefault>Drop games here to begin ranking them!</p>
        {:else}
            <div
                class="list-body"
                class:canvas-body={isCanvas}
                on:drop={async (event) => { if (!usesCustomDrop) { await dropAt($listItems.length); } }}
                on:dragover|preventDefault
            >
                {#if mode === "column-grid"}
                    <ColumnGridMode
                        listItems={$listItems}
                        onDragStart={dragFromList}
                        onDropAt={dropAt}
                    />
                {:else if mode === "row-grid"}
                    <RowGridMode
                        listItems={$listItems}
                        onDragStart={dragFromList}
                        onDropAt={dropAt}
                    />
                {:else if mode === "list"}
                    <ListModeComponent
                        listItems={$listItems}
                        onDragStart={dragFromList}
                        onDropAt={dropAt}
                    />
                {:else if mode === "position-drag"}
                    <PositionDragMode
                        listItems={$listItems}
                        poolGames={$games}
                        onSwap={swapPositions}
                        onAddWithPosition={addGameWithPosition}
                        onRemove={removeRankedGame}
                    />
                {:else if mode === "binary-tree"}
                    <BinaryTreeMode
                        listItems={$listItems}
                        onSwap={swapPositions}
                        onDragStart={dragFromList}
                        onDropFromPool={async () => await dropAt($listItems.length)}
                    />
                {:else if mode === "spiral"}
                    <SpiralMode
                        listItems={$listItems}
                        onSwap={swapPositions}
                        onDragStart={dragFromList}
                        onDropFromPool={dropAt}
                    />
                {/if}
            </div>
        {/if}
    </div>
</div>
{/if}

<style>
    /* ── Desktop ─────────────────────────────────────────────────────────────── */
    .personal-layout {
        display: grid;
        grid-template-columns: 220px 1fr;
    }

    .personal-layout.no-pool {
        grid-template-columns: 1fr;
        gap: 1rem;
        height: calc(100vh - 3rem);
        padding: 1rem;
        box-sizing: border-box;
    }

    .games-pool {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        overflow: hidden;
    }

    .pool-title {
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
        flex-shrink: 0;
    }

    .pool-scroll {
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .list-section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        overflow: hidden;
    }

    .canvas-section {
        padding: 0;
        overflow: hidden;
    }

    .list-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-shrink: 0;
        padding: 0.75rem 1rem 0;
    }

    .undo-redo {
        margin-left: auto;
        display: flex;
        gap: 0.25rem;
    }

    .icon-btn {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: var(--text-color);
        font-size: 1rem;
        width: 2rem;
        height: 2rem;
        padding: 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s, border-color 0.15s, opacity 0.15s;
    }

    .icon-btn:hover:not(:disabled) {
        background: rgba(157, 111, 255, 0.15);
        border-color: var(--accent);
        filter: none;
    }

    .icon-btn:disabled {
        opacity: 0.3;
        cursor: default;
    }

    .canvas-section .list-header {
        padding: 0.75rem 1rem 0;
        position: relative;
        z-index: 1;
    }

    .list-body {
        flex: 1;
        overflow-y: auto;
        min-height: 0;
    }

    .canvas-body {
        overflow: hidden;
        position: relative;
    }

    .empty-hint {
        text-align: center;
        margin-top: 10vh;
        font-size: xx-large;
        color: var(--text-muted);
    }

    /* ── Mobile ──────────────────────────────────────────────────────────────── */
    .mobile-layout {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 0;
    }

    .mobile-pool-scroll {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        max-height: 35vh;
        overflow-y: auto;
        padding-top: 0.25rem;
    }

    .mobile-pool-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        padding: 0.4rem;
        border-radius: 8px;
        border: 2px solid transparent;
        cursor: pointer;
        width: 5.5rem;
        transition: border-color 0.15s, background 0.15s;
    }

    .mobile-pool-item.selected {
        border-color: var(--accent);
        background: rgba(157, 111, 255, 0.12);
    }

    .mobile-game-name {
        font-size: 0.65rem;
        text-align: center;
        color: var(--text-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        width: 100%;
    }

    .mobile-empty-pool {
        color: var(--text-muted);
        font-size: 0.9rem;
        padding: 0.5rem 0;
    }

    .mobile-list-item {
        display: flex;
        align-items: center;
        border-radius: 8px;
        border: 2px solid transparent;
        cursor: pointer;
        transition: border-color 0.15s, background 0.15s;
        margin-bottom: 0.35rem;
        min-width: 0;
        overflow: hidden;
    }

    .mobile-list-item :global(.list-card) {
        flex: 1;
        margin-bottom: 0;
    }

    .mobile-list-item.selected {
        border-color: var(--accent);
        background: rgba(157, 111, 255, 0.08);
    }

    .remove-btn {
        flex-shrink: 0;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: var(--text-color);
        font-size: 1.1rem;
        width: 2.25rem;
        height: 2.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        margin-right: 0.25rem;
        transition: background 0.15s, color 0.15s;
    }

    .remove-btn:hover, .remove-btn:active { background: rgba(248, 113, 113, 0.2); color: var(--error-color); }

    .mobile-append-zone {
        text-align: center;
        padding: 0.75rem;
        border: 2px dashed var(--accent);
        border-radius: 8px;
        color: var(--accent);
        cursor: pointer;
        margin-top: 0.5rem;
        font-size: 0.9rem;
        opacity: 0.85;
    }

    .mobile-hint {
        font-size: 0.75rem;
        color: var(--accent);
        font-weight: normal;
        margin-left: 0.5rem;
        text-transform: none;
        letter-spacing: 0;
    }

    .mobile-empty-list {
        color: var(--text-muted);
        text-align: center;
        padding: 2rem 1rem;
        border: 2px dashed var(--border-color);
        border-radius: 8px;
        cursor: pointer;
        transition: border-color 0.15s;
    }

    .mobile-empty-list:hover {
        border-color: var(--accent);
        color: var(--accent);
    }
</style>
