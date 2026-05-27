<script lang="ts">
  import { libraryStore, type LibraryTab } from '../../stores/library.svelte';
  import RulesSection from './RulesSection.svelte';
  import TurnsSection from './TurnsSection.svelte';
  import MechanicsSection from './MechanicsSection.svelte';
  import TablesSection from './TablesSection.svelte';
  import { filterRules, filterMechanics } from './search';
  import './library-content.css';

  // `searchable` tabs respond to the shared filter and show a result count;
  // Turns and Tables always show their full content.
  const tabs: { id: LibraryTab; label: string; searchable: boolean }[] = [
    { id: 'rules', label: 'Special Rules', searchable: true },
    { id: 'mechanics', label: 'Mechanics', searchable: true },
    { id: 'turns', label: 'Turns', searchable: false },
    { id: 'tables', label: 'Tables', searchable: false },
  ];

  // Result counts per searchable tab, reflecting the current filter.
  const counts = $derived<Record<LibraryTab, number | null>>({
    rules: filterRules(libraryStore.query).length,
    mechanics: filterMechanics(libraryStore.query).length,
    turns: null,
    tables: null,
  });

  function tabLabel(t: (typeof tabs)[number]): string {
    const c = counts[t.id];
    return c === null ? t.label : `${t.label} (${c})`;
  }

  // ── Resize via the left-edge drag handle ──────────────────────────────────
  let resizing = $state(false);

  function onHandleDown(e: PointerEvent) {
    e.preventDefault();
    resizing = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onHandleMove(e: PointerEvent) {
    if (!resizing) return;
    libraryStore.setWidth(window.innerWidth - e.clientX);
  }

  function onHandleUp(e: PointerEvent) {
    if (!resizing) return;
    resizing = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && libraryStore.open && !libraryStore.pinned)
      libraryStore.close();
  }}
  onpointerdown={(e) => {
    // When open but not pinned, a click outside the panel closes it. Using
    // pointerdown (not click) means the click that opens the panel via a rule
    // link elsewhere doesn't immediately re-close it.
    if (
      libraryStore.open &&
      !libraryStore.pinned &&
      !(e.target as HTMLElement).closest('.library')
    )
      libraryStore.close();
  }}
/>

<aside
  class="library"
  class:open={libraryStore.open}
  class:resizing
  style="--lib-width: {libraryStore.width}px"
>
  <!-- Flyout tab handle (pokes out the panel's left edge). Hidden when pinned,
       since the panel is then permanently docked. -->
  {#if !libraryStore.pinned}
    <button
      class="library-tab"
      onclick={() => libraryStore.toggle()}
      aria-expanded={libraryStore.open}
      aria-label={libraryStore.open ? 'Close Library' : 'Open Library'}
    >
      Library
    </button>
  {/if}

  <!-- Resize handle on the panel's left edge -->
  <div
    class="resize-handle"
    role="separator"
    aria-label="Resize Library"
    aria-orientation="vertical"
    onpointerdown={onHandleDown}
    onpointermove={onHandleMove}
    onpointerup={onHandleUp}
    onpointercancel={onHandleUp}
  ></div>

  <div class="panel">
    <header class="panel-header">
      <span class="panel-title">Library</span>
      <div class="panel-actions">
        <button
          class="icon-btn"
          class:active={libraryStore.pinned}
          onclick={() => libraryStore.setPinned(!libraryStore.pinned)}
          title={libraryStore.pinned ? 'Unpin' : 'Pin open'}
          aria-pressed={libraryStore.pinned}
        >
          📌 Pin
        </button>
        <button
          class="icon-btn"
          onclick={() => libraryStore.close()}
          aria-label="Close Library">✕</button
        >
      </div>
    </header>

    <div class="search-wrap">
      <span class="search-icon">◈</span>
      <input
        class="search-input"
        type="search"
        placeholder="Filter the library…"
        bind:value={libraryStore.query}
        autocomplete="off"
        spellcheck="false"
      />
      {#if libraryStore.query}
        <button
          class="clear-btn"
          onclick={() => (libraryStore.query = '')}
          aria-label="Clear search">✕</button
        >
      {/if}
    </div>

    <div class="tab-bar" role="tablist">
      {#each tabs as t}
        <button
          class="tab-btn"
          class:active={libraryStore.tab === t.id}
          role="tab"
          aria-selected={libraryStore.tab === t.id}
          onclick={() => libraryStore.setTab(t.id)}>{tabLabel(t)}</button
        >
      {/each}
    </div>

    <div class="panel-body">
      {#if libraryStore.tab === 'rules'}
        <RulesSection />
      {:else if libraryStore.tab === 'turns'}
        <TurnsSection />
      {:else if libraryStore.tab === 'mechanics'}
        <MechanicsSection />
      {:else}
        <TablesSection />
      {/if}
    </div>
  </div>
</aside>

<style>
  .library {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    width: var(--lib-width);
    transform: translateX(100%);
    transition: transform 0.25s ease;
    z-index: 400;
    display: flex;
  }

  .library.open {
    transform: translateX(0);
  }

  /* Disable the slide transition while actively dragging the resize handle. */
  .library.resizing {
    transition: none;
  }

  /* ── Tab handle ─────────────────────────────── */
  .library-tab {
    position: absolute;
    left: 0;
    top: 6rem;
    transform: translateX(-100%);
    background: var(--color-bg-raised);
    border: 1px solid var(--color-border);
    border-right: none;
    color: var(--color-accent);
    font-family: 'Orbitron', monospace;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    writing-mode: vertical-rl;
    padding: 0.85rem 0.5rem;
    cursor: pointer;
    box-shadow: -2px 0 12px rgba(0, 0, 0, 0.4);
    transition:
      color 0.15s,
      background 0.15s;
  }

  .library-tab:hover {
    background: var(--color-bg-surface);
    color: #fff;
  }

  /* ── Resize handle ──────────────────────────── */
  .resize-handle {
    position: absolute;
    left: -3px;
    top: 0;
    bottom: 0;
    width: 7px;
    cursor: col-resize;
    z-index: 1;
  }

  .resize-handle::after {
    content: '';
    position: absolute;
    left: 2px;
    top: 50%;
    transform: translateY(-50%);
    width: 2px;
    height: 2.5rem;
    background: var(--color-border);
    border-radius: 2px;
    transition: background 0.15s;
  }

  .resize-handle:hover::after {
    background: var(--color-accent);
  }

  /* ── Panel ──────────────────────────────────── */
  .panel {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-surface);
    border-left: 1px solid var(--color-border);
    box-shadow: -6px 0 24px rgba(0, 0, 0, 0.45);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    background: linear-gradient(180deg, #050709 0%, var(--color-bg-surface) 100%);
    flex-shrink: 0;
  }

  .panel-title {
    font-family: 'Orbitron', monospace;
    font-size: 0.8rem;
    font-weight: 900;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--color-accent);
    text-shadow: 0 0 12px rgba(0, 200, 255, 0.4);
  }

  .panel-actions {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .icon-btn {
    background: none;
    border: 1px solid transparent;
    color: var(--color-text-muted);
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    padding: 0.25rem 0.45rem;
    transition:
      color 0.15s,
      border-color 0.15s;
  }

  .icon-btn:hover {
    color: var(--color-text);
  }

  .icon-btn.active {
    color: var(--color-accent);
    border-color: var(--color-accent-dim);
  }

  /* ── Sub-tab bar ────────────────────────────── */
  .tab-bar {
    display: flex;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-surface);
    flex-shrink: 0;
  }

  .tab-btn {
    flex: 1;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--color-text-muted);
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.6rem 0.35rem;
    cursor: pointer;
    transition:
      color 0.15s,
      border-color 0.15s;
    margin-bottom: -1px;
  }

  .tab-btn.active {
    color: var(--color-accent);
    border-bottom-color: var(--color-accent);
  }

  .tab-btn:hover:not(.active) {
    color: var(--color-text);
  }

  /* ── Search ─────────────────────────────────── */
  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    flex-shrink: 0;
  }

  .search-icon {
    position: absolute;
    left: 1.65rem;
    color: var(--color-accent-dim);
    font-size: 0.8rem;
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    background: var(--color-bg-raised);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.88rem;
    letter-spacing: 0.03em;
    padding: 0.5rem 2.1rem;
    outline: none;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }

  .search-input::placeholder {
    color: var(--color-text-muted);
    opacity: 0.6;
  }

  .search-input:focus {
    border-color: var(--color-accent-dim);
    box-shadow: 0 0 0 2px rgba(0, 200, 255, 0.1);
  }

  .search-input::-webkit-search-cancel-button {
    display: none;
  }

  .clear-btn {
    position: absolute;
    right: 1.5rem;
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 0.7rem;
    padding: 0.2rem 0.3rem;
    transition: color 0.15s;
  }

  .clear-btn:hover {
    color: var(--color-text);
  }

  /* ── Body ───────────────────────────────────── */
  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }
</style>
