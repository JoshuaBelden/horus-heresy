<script lang="ts">
  import { units } from '../data';
  import { lookupRule } from '../data/specialRules';
  import type { RangedWeapon, MeleeWeapon, WargearDetail, SpecialRule } from '../data/types';

  type RangedEntry = RangedWeapon & { source: string };
  type MeleeEntry = MeleeWeapon & { source: string };
  type DetailEntry = WargearDetail & { source: string };

  const rangedWeapons: RangedEntry[] = units.flatMap(
    (u) => (u.rangedWeapons ?? []).map((w) => ({ ...w, source: u.name })),
  );

  const meleeWeapons: MeleeEntry[] = units.flatMap(
    (u) => (u.meleeWeapons ?? []).map((w) => ({ ...w, source: u.name })),
  );

  const wargearDetails: DetailEntry[] = units.flatMap(
    (u) => (u.wargearDetails ?? []).map((wd) => ({ ...wd, source: u.name })),
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
  onkeydown={(e) => { if (e.key === 'Escape') closePopover(); }}
  onclick={(e) => {
    if (popover && !(e.target as HTMLElement).closest('.rule-popover')) closePopover();
  }}
/>

<div class="wargear-container">

  <!-- ── Ranged Weapons ───────────────────────────── -->
  <section class="weapon-section">
    <div class="section-header">
      <h2 class="section-title">Ranged Weapons</h2>
      <div class="stat-legend">
        <span><abbr title="Range (inches)">R</abbr> Range</span>
        <span><abbr title="Firepower — number of shots">FP</abbr> Firepower</span>
        <span><abbr title="Ranged Strength">RS</abbr> Ranged Strength</span>
        <span><abbr title="Armour Penetration">AP</abbr> Armour Penetration</span>
        <span><abbr title="Damage — wounds/hull points lost per hit">D</abbr> Damage</span>
      </div>
    </div>

    {#if rangedWeapons.length === 0}
      <div class="empty-state">
        <span class="empty-icon">◈</span>
        <p>No ranged weapon data yet.</p>
      </div>
    {:else}
      <div class="table-container">
        <table class="weapon-table">
          <thead>
            <tr>
              <th class="col-name">Ranged Weapon</th>
              <th class="col-source">Source</th>
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
            {#each rangedWeapons as w (w.source + '::' + w.name)}
              <tr class="weapon-row">
                <td class="col-name weapon-name">{w.name}</td>
                <td class="col-source source-cell">{w.source}</td>
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
                      <button class="rule-link" onclick={(e) => openRule(e, rule)}>{rule}</button>
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

  <!-- ── Melee Weapons ────────────────────────────── -->
  <section class="weapon-section">
    <div class="section-header">
      <h2 class="section-title">Melee Weapons</h2>
      <div class="stat-legend">
        <span><abbr title="Initiative Modifier">IM</abbr> Initiative</span>
        <span><abbr title="Attacks Modifier">AM</abbr> Attacks</span>
        <span><abbr title="Strength Modifier">SM</abbr> Strength</span>
        <span><abbr title="Armour Penetration">AP</abbr> AP</span>
        <span><abbr title="Damage">D</abbr> Damage</span>
      </div>
    </div>

    {#if meleeWeapons.length === 0}
      <div class="empty-state">
        <span class="empty-icon">◈</span>
        <p>No melee weapon data yet.</p>
      </div>
    {:else}
      <div class="table-container">
        <table class="weapon-table">
          <thead>
            <tr>
              <th class="col-name">Melee Weapon</th>
              <th class="col-source">Source</th>
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
            {#each meleeWeapons as w (w.source + '::' + w.name)}
              <tr class="weapon-row">
                <td class="col-name weapon-name">{w.name}</td>
                <td class="col-source source-cell">{w.source}</td>
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
                      <button class="rule-link" onclick={(e) => openRule(e, rule)}>{rule}</button>
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

  <!-- ── Wargear Details ──────────────────────────── -->
  {#if wargearDetails.length > 0}
    <section class="weapon-section">
      <div class="section-header">
        <h2 class="section-title">Wargear</h2>
      </div>
      <div class="table-container">
        <table class="weapon-table wargear-table">
          <thead>
            <tr>
              <th class="col-wargear-name">Wargear</th>
              <th class="col-source">Source</th>
              <th class="col-wargear-summary">Summary</th>
              <th class="col-wargear-desc">Rule</th>
            </tr>
          </thead>
          <tbody>
            {#each wargearDetails as wd (wd.source + '::' + wd.name)}
              <tr class="weapon-row">
                <td class="col-wargear-name weapon-name">{wd.name}</td>
                <td class="col-source source-cell">{wd.source}</td>
                <td class="col-wargear-summary summary-cell">"{wd.summary}"</td>
                <td class="col-wargear-desc desc-cell">{wd.description}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
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
      <button class="popover-close" onclick={closePopover} aria-label="Close">✕</button>
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
    gap: 2.5rem;
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
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border: 1px solid var(--color-border);
    border-bottom: none;
    background: var(--color-bg-raised);
    flex-wrap: wrap;
  }

  .section-title {
    font-family: 'Orbitron', monospace;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-accent);
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
  }

  .weapon-table {
    width: 100%;
    border-collapse: collapse;
  }

  .weapon-table thead tr {
    background: var(--color-bg-surface);
    border-bottom: 1px solid var(--color-border);
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

  .col-source {
    min-width: 140px;
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

  .col-wargear-name {
    min-width: 140px;
    white-space: nowrap;
  }

  .col-wargear-summary {
    min-width: 200px;
    max-width: 280px;
  }

  .col-wargear-desc {
    min-width: 260px;
  }

  /* ── Cell Styles ─────────────────────────────── */
  .weapon-name {
    font-weight: 600;
    color: var(--color-text);
    letter-spacing: 0.02em;
  }

  .source-cell {
    color: var(--color-accent);
    font-size: 0.78rem;
    letter-spacing: 0.03em;
    opacity: 0.8;
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

  .summary-cell {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-style: italic;
    line-height: 1.4;
  }

  .desc-cell {
    font-size: 0.8rem;
    color: var(--color-text);
    line-height: 1.5;
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
