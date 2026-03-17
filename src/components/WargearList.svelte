<script lang="ts">
  import {
    meleeWeapons as catalogueMelee,
    rangedWeapons as catalogueRanged,
    weaponLists,
    wargear,
  } from '../data';
  import { lookupRule } from '../data/specialRules';
  import type { MeleeWeapon, RangedWeapon, SpecialRule } from '../data/types';

  const rangedWeapons: RangedWeapon[] = [...catalogueRanged].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const meleeWeapons: MeleeWeapon[] = [...catalogueMelee].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  // ── Tabs ──────────────────────────────────────────────────────────────────
  type Tab = 'ranged' | 'melee' | 'wargear' | 'lists';
  let activeTab = $state<Tab>('ranged');

  // ── Search ────────────────────────────────────────────────────────────────
  let query = $state('');

  const filteredRanged = $derived(
    query.trim() === ''
      ? rangedWeapons
      : rangedWeapons.filter(
          (w) =>
            w.name.toLowerCase().includes(query.toLowerCase()) ||
            w.traits.some((t) =>
              t.toLowerCase().includes(query.toLowerCase()),
            ) ||
            w.specialRules.some((r) =>
              r.toLowerCase().includes(query.toLowerCase()),
            ),
        ),
  );

  const filteredMelee = $derived(
    query.trim() === ''
      ? meleeWeapons
      : meleeWeapons.filter(
          (w) =>
            w.name.toLowerCase().includes(query.toLowerCase()) ||
            w.traits.some((t) =>
              t.toLowerCase().includes(query.toLowerCase()),
            ) ||
            w.specialRules.some((r) =>
              r.toLowerCase().includes(query.toLowerCase()),
            ),
        ),
  );

  // ── Rule popover ──────────────────────────────────────────────────────────
  interface Popover {
    rule: SpecialRule;
    x: number;
    y: number;
  }
  let popover = $state<Popover | null>(null);

  function openRule(e: MouseEvent, ruleName: string) {
    const rule = lookupRule(ruleName);
    if (!rule) return;
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - 340);
    const y = Math.min(rect.bottom + 6, window.innerHeight - 220);
    popover = { rule, x, y };
  }

  function closePopover() {
    popover = null;
  }

  function fmtList(items: string[]): string {
    return items.length ? items.join(', ') : '—';
  }
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape') closePopover();
  }}
  onclick={(e) => {
    if (popover && !(e.target as HTMLElement).closest('.rule-popover'))
      closePopover();
  }}
/>

<div class="wargear-container">
  <!-- ── Tabs + Search row ─────────────────────────── -->
  <div class="top-bar">
    <nav class="tab-bar" role="tablist">
      <button
        class="tab-btn"
        class:active={activeTab === 'ranged'}
        role="tab"
        aria-selected={activeTab === 'ranged'}
        onclick={() => {
          activeTab = 'ranged';
          query = '';
        }}
        >Ranged <span class="tab-count">({rangedWeapons.length})</span></button
      >
      <button
        class="tab-btn"
        class:active={activeTab === 'melee'}
        role="tab"
        aria-selected={activeTab === 'melee'}
        onclick={() => {
          activeTab = 'melee';
          query = '';
        }}>Melee <span class="tab-count">({meleeWeapons.length})</span></button
      >
      <button
        class="tab-btn"
        class:active={activeTab === 'wargear'}
        role="tab"
        aria-selected={activeTab === 'wargear'}
        onclick={() => {
          activeTab = 'wargear';
          query = '';
        }}
        >Wargear <span class="tab-count">({wargear.length})</span></button
      >
      <button
        class="tab-btn"
        class:active={activeTab === 'lists'}
        role="tab"
        aria-selected={activeTab === 'lists'}
        onclick={() => {
          activeTab = 'lists';
          query = '';
        }}
        >Weapons Lists <span class="tab-count">({weaponLists.length})</span
        ></button
      >
    </nav>

    {#if activeTab === 'ranged' || activeTab === 'melee'}
      <div class="search-bar">
        <span class="search-icon">⌕</span>
        <input
          class="search-input"
          type="search"
          placeholder="Search by name, trait, or rule…"
          bind:value={query}
        />
        {#if query}
          <button
            class="search-clear"
            onclick={() => (query = '')}
            aria-label="Clear search">✕</button
          >
        {/if}
      </div>
    {/if}
  </div>

  <!-- ── Ranged Weapons ───────────────────────────── -->
  {#if activeTab === 'ranged'}
    <section class="weapon-section">
      <div class="section-header">
        <div class="stat-legend">
          <span><abbr title="Range (inches)">R</abbr> Range</span>
          <span
            ><abbr title="Firepower — number of shots">FP</abbr> Firepower</span
          >
          <span><abbr title="Ranged Strength">RS</abbr> Ranged Strength</span>
          <span
            ><abbr title="Armour Penetration">AP</abbr> Armour Penetration</span
          >
          <span
            ><abbr title="Damage — wounds/hull points lost per hit">D</abbr> Damage</span
          >
        </div>
      </div>

      {#if filteredRanged.length === 0}
        <div class="empty-state">
          <span class="empty-icon">◈</span>
          <p>
            {query
              ? 'No ranged weapons match your search.'
              : 'No ranged weapon data yet.'}
          </p>
        </div>
      {:else}
        <div class="table-container">
          <table class="weapon-table">
            <thead class="sticky-head">
              <tr>
                <th class="col-name">Ranged Weapon</th>
                <th class="col-stat">R</th>
                <th class="col-stat">FP</th>
                <th class="col-stat">RS</th>
                <th class="col-stat">AP</th>
                <th class="col-stat">D</th>
                <th class="col-rules">Special Rules</th>
                <th class="col-traits">Traits</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredRanged as w, i (w.name + i)}
                <tr class="weapon-row">
                  <td class="col-name weapon-name">{w.name}</td>
                  <td class="col-stat stat-cell">{w.R}</td>
                  <td class="col-stat stat-cell">{w.FP}</td>
                  <td class="col-stat stat-cell">{w.RS}</td>
                  <td class="col-stat stat-cell">{w.AP}</td>
                  <td class="col-stat stat-cell">{w.D}</td>
                  <td class="col-rules rules-cell">
                    {#if w.specialRules.length === 0}—{/if}
                    {#each w.specialRules as rule, i}
                      {#if i > 0}<span class="rule-sep">, </span>{/if}
                      {#if lookupRule(rule)}
                        <button
                          class="rule-link"
                          onclick={(e) => openRule(e, rule)}>{rule}</button
                        >
                      {:else}
                        <span>{rule}</span>
                      {/if}
                    {/each}
                  </td>
                  <td class="col-traits traits-cell">{fmtList(w.traits)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>
  {/if}

  <!-- ── Melee Weapons ────────────────────────────── -->
  {#if activeTab === 'melee'}
    <section class="weapon-section">
      <div class="section-header">
        <div class="stat-legend">
          <span><abbr title="Initiative Modifier">IM</abbr> Initiative</span>
          <span><abbr title="Attacks Modifier">AM</abbr> Attacks</span>
          <span><abbr title="Strength Modifier">SM</abbr> Strength</span>
          <span><abbr title="Armour Penetration">AP</abbr> AP</span>
          <span><abbr title="Damage">D</abbr> Damage</span>
        </div>
      </div>

      {#if filteredMelee.length === 0}
        <div class="empty-state">
          <span class="empty-icon">◈</span>
          <p>
            {query
              ? 'No melee weapons match your search.'
              : 'No melee weapon data yet.'}
          </p>
        </div>
      {:else}
        <div class="table-container">
          <table class="weapon-table">
            <thead class="sticky-head">
              <tr>
                <th class="col-name">Melee Weapon</th>
                <th class="col-stat">IM</th>
                <th class="col-stat">AM</th>
                <th class="col-stat">SM</th>
                <th class="col-stat">AP</th>
                <th class="col-stat">D</th>
                <th class="col-rules">Special Rules</th>
                <th class="col-traits">Traits</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredMelee as w, i (w.name + i)}
                <tr class="weapon-row">
                  <td class="col-name weapon-name">{w.name}</td>
                  <td class="col-stat stat-cell">{w.IM}</td>
                  <td class="col-stat stat-cell">{w.AM}</td>
                  <td class="col-stat stat-cell">{w.SM}</td>
                  <td class="col-stat stat-cell">{w.AP}</td>
                  <td class="col-stat stat-cell">{w.D}</td>
                  <td class="col-rules rules-cell">
                    {#if w.specialRules.length === 0}—{/if}
                    {#each w.specialRules as rule, i}
                      {#if i > 0}<span class="rule-sep">, </span>{/if}
                      {#if lookupRule(rule)}
                        <button
                          class="rule-link"
                          onclick={(e) => openRule(e, rule)}>{rule}</button
                        >
                      {:else}
                        <span>{rule}</span>
                      {/if}
                    {/each}
                  </td>
                  <td class="col-traits traits-cell">{fmtList(w.traits)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>
  {/if}

  <!-- ── Wargear ──────────────────────────────────── -->
  {#if activeTab === 'wargear'}
    <section class="weapon-section">
      {#if wargear.length === 0}
        <div class="empty-state">
          <span class="empty-icon">◈</span>
          <p>No wargear data yet.</p>
        </div>
      {:else}
        <div class="lists-grid">
          {#each wargear as item}
            <div class="list-card">
              <div class="list-card-header">
                <h3 class="list-card-title">{item.name}</h3>
              </div>
              <div class="wargear-card-body">
                {#if item.summary}
                  <p class="wargear-summary">"{item.summary}"</p>
                {/if}
                <p class="wargear-desc">{item.description}</p>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}

  <!-- ── Weapons Lists ────────────────────────────── -->
  {#if activeTab === 'lists'}
    <section class="weapon-section">
      {#if weaponLists.length === 0}
        <div class="empty-state">
          <span class="empty-icon">◈</span>
          <p>No weapons lists yet.</p>
        </div>
      {:else}
        <div class="lists-grid">
          {#each weaponLists as list}
            <div class="list-card">
              <div class="list-card-header">
                <h3 class="list-card-title">{list.name}</h3>
              </div>
              <table class="weapon-table">
                <thead>
                  <tr>
                    <th class="col-name">Weapon</th>
                    <th class="col-pts">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {#each list.entries as entry}
                    <tr class="weapon-row">
                      <td class="col-name weapon-name">{entry.weaponName}</td>
                      <td class="col-pts stat-cell"
                        >{entry.points === 0 ? '—' : '+' + entry.points}</td
                      >
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</div>

{#if popover}
  <div
    class="rule-popover"
    style="left: {popover.x}px; top: {popover.y}px"
    role="tooltip"
  >
    <div class="popover-header">
      <span class="popover-name">{popover.rule.name}</span>
      <button class="popover-close" onclick={closePopover} aria-label="Close"
        >✕</button
      >
    </div>
    {#if popover.rule.summary}
      <p class="popover-summary">"{popover.rule.summary}"</p>
    {/if}
    <div class="popover-body">
      {#each popover.rule.description.split('\n\n') as para}
        <p class="popover-para">{para}</p>
      {/each}
    </div>
  </div>
{/if}

<style>
  .wargear-container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* ── Top Bar ──────────────────────────────────── */
  .top-bar {
    display: flex;
    align-items: stretch;
    gap: 0;
    border: 1px solid var(--color-border);
  }

  /* ── Tab Bar ──────────────────────────────────── */
  .tab-bar {
    display: flex;
    flex-shrink: 0;
  }

  .tab-btn {
    background: var(--color-bg-raised);
    border: none;
    border-right: 1px solid var(--color-border);
    padding: 0.65rem 1.25rem;
    font-family: 'Orbitron', monospace;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    cursor: pointer;
    transition:
      color 0.15s,
      background 0.15s;
    white-space: nowrap;
  }

  .tab-btn:hover {
    color: var(--color-text);
    background: var(--color-bg-surface);
  }

  .tab-btn.active {
    color: var(--color-accent);
    background: var(--color-bg-surface);
    box-shadow: inset 0 -2px 0 var(--color-accent);
  }

  .tab-count {
    font-size: 0.6em;
    opacity: 0.6;
    letter-spacing: 0.05em;
  }

  /* ── Search Bar ───────────────────────────────── */
  .search-bar {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    gap: 0;
    background: var(--color-bg-raised);
  }

  .search-icon {
    padding: 0 0.75rem;
    font-size: 1.1rem;
    color: var(--color-text-muted);
    pointer-events: none;
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    padding: 0.65rem 0.5rem 0.65rem 0;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.9rem;
    color: var(--color-text);
    letter-spacing: 0.03em;
  }

  .search-input::placeholder {
    color: var(--color-text-muted);
    opacity: 0.6;
  }

  .search-input::-webkit-search-cancel-button {
    display: none;
  }

  .search-clear {
    background: none;
    border: none;
    padding: 0.65rem 0.85rem;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 0.75rem;
    flex-shrink: 0;
    transition: color 0.15s;
  }

  .search-clear:hover {
    color: var(--color-text);
  }

  .top-bar:focus-within {
    border-color: var(--color-accent-dim);
  }

  /* ── Section ─────────────────────────────────── */
  .weapon-section {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .section-header {
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
    gap: 1rem;
    padding: 0.6rem 1.25rem;
    border: 1px solid var(--color-border);
    border-bottom: none;
    background: var(--color-bg-raised);
    flex-wrap: wrap;
  }

  .stat-legend {
    display: flex;
    gap: 1.25rem;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    flex-wrap: wrap;
  }

  .stat-legend abbr {
    text-decoration: none;
    color: var(--color-gold);
    font-weight: 600;
  }

  /* ── Table ───────────────────────────────────── */
  .table-container {
    border: 1px solid var(--color-border);
    overflow-x: auto;
    overflow-y: auto;
    max-height: 65vh;
  }

  .weapon-table {
    width: 100%;
    border-collapse: collapse;
  }

  .weapon-table thead tr {
    background: var(--color-bg-surface);
    border-bottom: 1px solid var(--color-border);
  }

  .sticky-head {
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .sticky-head tr {
    background: var(--color-bg-surface);
  }

  .sticky-head th {
    box-shadow: 0 1px 0 var(--color-border);
  }

  .weapon-table th {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    padding: 0.65rem 0.9rem;
    text-align: left;
    white-space: nowrap;
  }

  .weapon-row {
    border-bottom: 1px solid var(--color-border);
    transition: background 0.1s;
  }

  .weapon-row:last-child {
    border-bottom: none;
  }

  .weapon-row:hover {
    background: rgba(0, 200, 255, 0.04);
  }

  .weapon-table td {
    padding: 0.7rem 0.9rem;
    vertical-align: top;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.9rem;
  }

  /* ── Columns ─────────────────────────────────── */
  .col-name {
    min-width: 160px;
  }

  .col-stat {
    width: 52px;
    text-align: center;
  }

  .col-rules {
    min-width: 140px;
  }

  .col-traits {
    min-width: 120px;
  }

  /* ── Cell Styles ─────────────────────────────── */
  .weapon-name {
    font-weight: 600;
    color: var(--color-text);
    letter-spacing: 0.02em;
  }

  .stat-cell {
    font-family: 'Orbitron', monospace;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-gold);
    text-align: center;
  }

  .rules-cell {
    font-size: 0.82rem;
    color: var(--color-accent);
    letter-spacing: 0.02em;
  }

  .traits-cell {
    font-size: 0.82rem;
    color: var(--color-text-muted);
    letter-spacing: 0.02em;
  }

  /* ── Rule Chips ──────────────────────────────── */
  .rule-link {
    background: none;
    border: none;
    padding: 0;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.82rem;
    color: var(--color-accent);
    cursor: pointer;
    letter-spacing: 0.02em;
    text-decoration: underline dotted;
    text-underline-offset: 2px;
    transition: color 0.15s;
  }

  .rule-link:hover {
    color: #fff;
  }

  .rule-sep {
    color: var(--color-text-muted);
  }

  /* ── Rule Popover ─────────────────────────────── */
  .rule-popover {
    position: fixed;
    z-index: 200;
    width: 320px;
    max-height: 50vh;
    overflow-y: auto;
    background: var(--color-bg-raised);
    border: 1px solid var(--color-accent-dim);
    box-shadow:
      0 0 20px rgba(0, 200, 255, 0.12),
      0 4px 16px rgba(0, 0, 0, 0.6);
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .popover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .popover-name {
    font-family: 'Orbitron', monospace;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-accent);
    letter-spacing: 0.05em;
  }

  .popover-close {
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 0.75rem;
    padding: 0.1rem 0.3rem;
    flex-shrink: 0;
    transition: color 0.15s;
  }

  .popover-close:hover {
    color: var(--color-text);
  }

  .popover-summary {
    font-size: 0.75rem;
    color: var(--color-gold);
    font-style: italic;
    line-height: 1.5;
    border-left: 2px solid var(--color-gold);
    padding-left: 0.5rem;
  }

  .popover-body {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .popover-para {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    line-height: 1.6;
  }

  /* ── Weapons Lists Grid ──────────────────────── */
  .lists-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1rem;
  }

  .list-card {
    border: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
  }

  .list-card-header {
    padding: 0.75rem 1rem;
    background: var(--color-bg-raised);
    border-bottom: 1px solid var(--color-border);
  }

  .list-card-title {
    font-family: 'Orbitron', monospace;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-accent);
  }

  .col-pts {
    width: 48px;
    text-align: center;
  }

  /* ── Wargear Cards ───────────────────────────── */
  .wargear-card-body {
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .wargear-summary {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.82rem;
    color: var(--color-gold);
    font-style: italic;
    line-height: 1.5;
    border-left: 2px solid var(--color-gold);
    padding-left: 0.5rem;
  }

  .wargear-desc {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.82rem;
    color: var(--color-text-muted);
    line-height: 1.6;
  }

  /* ── Empty State ─────────────────────────────── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2.5rem 1rem;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
  }

  .empty-icon {
    font-size: 1.5rem;
    opacity: 0.4;
  }

  .empty-state p {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.9rem;
    letter-spacing: 0.05em;
  }
</style>
