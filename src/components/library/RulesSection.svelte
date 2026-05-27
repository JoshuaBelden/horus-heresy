<script lang="ts">
  import { tick } from 'svelte';
  import { lookupRule } from '../../data/specialRules';
  import { libraryStore } from '../../stores/library.svelte';
  import { filterRules } from './search';

  const filtered = $derived(filterRules(libraryStore.query));

  let expanded = $state<Set<string>>(new Set());
  let highlighted = $state<string | null>(null);

  // Stable DOM id for a rule card, used for deep-link scrolling.
  function ruleId(name: string): string {
    return 'lib-rule-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  function toggle(name: string) {
    const next = new Set(expanded);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    expanded = next;
  }

  function expandAll() {
    expanded = new Set(filtered.map((r) => r.name));
  }

  function collapseAll() {
    expanded = new Set();
  }

  // Deep link: when another part of the app requests a rule, expand it, scroll
  // to it, and briefly highlight it.
  let highlightTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    const target = libraryStore.target;
    if (!target) return;
    const rule = lookupRule(target);
    libraryStore.target = null;
    if (!rule) return;

    const next = new Set(expanded);
    next.add(rule.name);
    expanded = next;
    highlighted = rule.name;

    tick().then(() => {
      const el = document.getElementById(ruleId(rule.name));
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    clearTimeout(highlightTimer);
    highlightTimer = setTimeout(() => {
      if (highlighted === rule.name) highlighted = null;
    }, 2000);
  });
</script>

<div class="rules-section">
  <div class="toolbar">
    <span class="rule-count"
      >{filtered.length} rule{filtered.length !== 1 ? 's' : ''}</span
    >
    <div class="toolbar-actions">
      <button class="text-btn" onclick={expandAll}>Expand all</button>
      <button class="text-btn" onclick={collapseAll}>Collapse all</button>
    </div>
  </div>

  {#if filtered.length === 0}
    <div class="empty-state">
      <span class="empty-icon">◈</span>
      <p>No rules match "{libraryStore.query}"</p>
    </div>
  {:else}
    <ul class="rules-list">
      {#each filtered as rule (rule.name)}
        {@const open = expanded.has(rule.name)}
        <li
          id={ruleId(rule.name)}
          class="rule-card"
          class:open
          class:highlighted={highlighted === rule.name}
        >
          <button
            class="rule-header"
            onclick={() => toggle(rule.name)}
            aria-expanded={open}
          >
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
  .rules-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .rule-count {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.7rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .toolbar-actions {
    display: flex;
    gap: 0.6rem;
  }

  .text-btn {
    background: none;
    border: none;
    color: var(--color-accent-dim);
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    padding: 0.1rem;
    transition: color 0.15s;
  }

  .text-btn:hover {
    color: var(--color-accent);
  }

  .rules-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-border);
  }

  .rule-card {
    border-bottom: 1px solid var(--color-border);
    transition: box-shadow 0.3s;
  }

  .rule-card:last-child {
    border-bottom: none;
  }

  .rule-card.highlighted {
    box-shadow: inset 0 0 0 1px var(--color-accent);
  }

  .rule-header {
    width: 100%;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    padding: 0.7rem 0.9rem;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: baseline;
    gap: 0.3rem 0.75rem;
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
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-accent);
  }

  .rule-summary {
    grid-column: 1 / -1;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-style: italic;
    line-height: 1.4;
  }

  .chevron {
    font-size: 1.1rem;
    color: var(--color-text-muted);
    transform: rotate(0deg);
    transition: transform 0.2s;
    line-height: 1;
    display: inline-block;
  }

  .chevron.flipped {
    transform: rotate(90deg);
  }

  .rule-body {
    padding: 0.85rem 0.9rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    background: var(--color-bg-raised);
  }

  .rule-para {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    line-height: 1.6;
    white-space: pre-line;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    padding: 2.5rem 1rem;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
  }

  .empty-icon {
    font-size: 1.4rem;
    opacity: 0.35;
  }

  .empty-state p {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.85rem;
    letter-spacing: 0.05em;
  }
</style>
