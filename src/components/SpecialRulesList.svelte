<script lang="ts">
  import { specialRules } from '../data/specialRules';

  let query = $state('');

  const sorted = specialRules.slice().sort((a, b) => a.name.localeCompare(b.name));

  const filtered = $derived(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.summary ?? '').toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
    );
  });

  let expanded = $state<Set<string>>(new Set());

  function toggle(name: string) {
    const next = new Set(expanded);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    expanded = next;
  }

  function expandAll() {
    expanded = new Set(filtered().map((r) => r.name));
  }

  function collapseAll() {
    expanded = new Set();
  }
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && query) query = '';
  }}
/>

<div class="rules-container">
  <!-- ── Toolbar ───────────────────────────────── -->
  <div class="toolbar">
    <div class="search-wrap">
      <span class="search-icon">◈</span>
      <input
        class="search-input"
        type="search"
        placeholder="Search rules by name or keyword…"
        bind:value={query}
        autocomplete="off"
        spellcheck="false"
      />
      {#if query}
        <button class="clear-btn" onclick={() => (query = '')} aria-label="Clear search">✕</button>
      {/if}
    </div>

    <div class="toolbar-right">
      <span class="rule-count">{filtered().length} rule{filtered().length !== 1 ? 's' : ''}</span>
      <button class="text-btn" onclick={expandAll}>Expand all</button>
      <button class="text-btn" onclick={collapseAll}>Collapse all</button>
    </div>
  </div>

  <!-- ── Rules List ────────────────────────────── -->
  {#if filtered().length === 0}
    <div class="empty-state">
      <span class="empty-icon">◈</span>
      <p>No rules match "{query}"</p>
    </div>
  {:else}
    <ul class="rules-list">
      {#each filtered() as rule (rule.name)}
        {@const open = expanded.has(rule.name)}
        <li class="rule-card" class:open>
          <button class="rule-header" onclick={() => toggle(rule.name)} aria-expanded={open}>
            <span class="rule-name">{rule.name}</span>
            {#if rule.summary}
              <span class="rule-summary">"{rule.summary}"</span>
            {/if}
            <span class="chevron" class:flipped={open}>›</span>
          </button>

          {#if open}
            <div class="rule-body">
              {#each rule.description.split('\n\n') as para}
                <p class="rule-para">{para}</p>
              {/each}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .rules-container {
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* ── Toolbar ─────────────────────────────────── */
  .toolbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .search-wrap {
    position: relative;
    flex: 1;
    min-width: 220px;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 0.75rem;
    color: var(--color-accent-dim);
    font-size: 0.85rem;
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    background: var(--color-bg-raised);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.9rem;
    letter-spacing: 0.03em;
    padding: 0.55rem 2.25rem 0.55rem 2.25rem;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .search-input::placeholder {
    color: var(--color-text-muted);
    opacity: 0.6;
  }

  .search-input:focus {
    border-color: var(--color-accent-dim);
    box-shadow: 0 0 0 2px rgba(0, 200, 255, 0.1);
  }

  /* hide browser's native clear button */
  .search-input::-webkit-search-cancel-button {
    display: none;
  }

  .clear-btn {
    position: absolute;
    right: 0.65rem;
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

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .rule-count {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .text-btn {
    background: none;
    border: none;
    color: var(--color-accent-dim);
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    padding: 0.2rem 0.1rem;
    transition: color 0.15s;
  }

  .text-btn:hover {
    color: var(--color-accent);
  }

  /* ── List ────────────────────────────────────── */
  .rules-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    border: 1px solid var(--color-border);
  }

  /* ── Card ────────────────────────────────────── */
  .rule-card {
    border-bottom: 1px solid var(--color-border);
  }

  .rule-card:last-child {
    border-bottom: none;
  }

  .rule-header {
    width: 100%;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    padding: 0.85rem 1.1rem;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: baseline;
    gap: 0.75rem 1rem;
    transition: background 0.1s;
  }

  .rule-header:hover {
    background: rgba(0, 200, 255, 0.04);
  }

  .rule-card.open .rule-header {
    background: rgba(0, 200, 255, 0.05);
    border-bottom: 1px solid var(--color-border);
  }

  .rule-name {
    font-family: 'Orbitron', monospace;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-accent);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .rule-summary {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.82rem;
    color: var(--color-text-muted);
    font-style: italic;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chevron {
    font-size: 1.1rem;
    color: var(--color-text-muted);
    transform: rotate(0deg);
    transition: transform 0.2s;
    line-height: 1;
    display: inline-block;
    flex-shrink: 0;
  }

  .chevron.flipped {
    transform: rotate(90deg);
  }

  /* ── Body ────────────────────────────────────── */
  .rule-body {
    padding: 0.9rem 1.1rem 1.1rem 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    background: var(--color-bg-raised);
  }

  .rule-para {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.88rem;
    color: var(--color-text-muted);
    line-height: 1.65;
  }

  /* ── Empty state ─────────────────────────────── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 3rem 1rem;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
  }

  .empty-icon {
    font-size: 1.5rem;
    opacity: 0.35;
  }

  .empty-state p {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.9rem;
    letter-spacing: 0.05em;
  }
</style>
