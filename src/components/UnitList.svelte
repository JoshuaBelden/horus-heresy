<script lang="ts">
  import { units } from '../data';
  import type { UnitProfile } from '../data/types';
  import UnitModal from './UnitModal.svelte';

  let searchQuery = $state('');
  let selectedUnit = $state<UnitProfile | null>(null);

  const filteredUnits = $derived(
    units.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const types = [...new Set(u.models.map((m) => m.type))].join(' ').toLowerCase();
      return u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q) || types.includes(q);
    }),
  );

  function getRoleColor(role: string): string {
    const map: Record<string, string> = {
      Troops: '#00c8ff',
      Elites: '#9966ff',
      Armour: '#c9933a',
      Support: '#ff9933',
      Command: '#4caf50',
      'High Command': '#4caf50',
      Warlord: '#ff4444',
      Retinue: '#cc88ff',
      Recon: '#00ccaa',
      'Fast Attack': '#ffdd00',
      'Heavy Assault': '#ff6633',
      'Lord of War': '#ff4444',
    };
    return map[role] ?? '#5a7080';
  }

  function getModelTypes(unit: UnitProfile): string {
    return [...new Set(unit.models.map((m) => m.type))].join(', ');
  }
</script>

<div class="unit-list-container">
  <div class="list-header">
    <div class="list-title-group">
      <h2 class="list-title">Unit Compendium</h2>
      <span class="unit-count">{filteredUnits.length} / {units.length} units</span>
    </div>
    <div class="search-wrapper">
      <span class="search-icon">⌕</span>
      <input
        class="search-input"
        type="search"
        placeholder="Search by name, role, or type…"
        bind:value={searchQuery}
        aria-label="Search units"
      />
    </div>
  </div>

  <div class="table-container">
    {#if filteredUnits.length === 0}
      <div class="empty-state">
        <span class="empty-icon">◈</span>
        <p>No units match <strong>{searchQuery}</strong></p>
      </div>
    {:else}
      <table class="unit-table">
        <thead>
          <tr>
            <th class="col-name">Unit Name</th>
            <th class="col-role">Role</th>
            <th class="col-pts">Pts</th>
            <th class="col-type">Type</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredUnits as unit (unit.name)}
            <tr class="unit-row">
              <td class="col-name">
                <button class="unit-name-btn" onclick={() => (selectedUnit = unit)}>
                  {unit.name}
                </button>
              </td>
              <td class="col-role">
                <span
                  class="role-badge"
                  style="color: {getRoleColor(unit.role)}; border-color: {getRoleColor(unit.role)}44"
                  >{unit.role}</span
                >
              </td>
              <td class="col-pts">{unit.points}</td>
              <td class="col-type">{getModelTypes(unit)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>

{#if selectedUnit}
  <UnitModal unit={selectedUnit} onclose={() => (selectedUnit = null)} />
{/if}

<style>
  .unit-list-container {
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* ── Header ──────────────────────────────── */
  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    padding: 1.25rem 1.5rem;
    border: 1px solid var(--color-border);
    border-bottom: none;
    background: var(--color-bg-raised);
    flex-wrap: wrap;
  }

  .list-title-group {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }

  .list-title {
    font-family: 'Orbitron', monospace;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-accent);
  }

  .unit-count {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
  }

  /* ── Search ──────────────────────────────── */
  .search-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    padding: 0 0.75rem;
    transition: border-color 0.15s;
  }

  .search-wrapper:focus-within {
    border-color: var(--color-accent-dim);
    box-shadow: 0 0 0 1px var(--color-accent-dim);
  }

  .search-icon {
    color: var(--color-text-muted);
    font-size: 1.1rem;
    line-height: 1;
    pointer-events: none;
    flex-shrink: 0;
  }

  .search-input {
    background: none;
    border: none;
    outline: none;
    color: var(--color-text);
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.9rem;
    letter-spacing: 0.03em;
    padding: 0.5rem 0;
    width: 260px;
  }

  .search-input::placeholder {
    color: var(--color-text-muted);
  }

  /* Hide browser-native search clear button */
  .search-input::-webkit-search-cancel-button {
    -webkit-appearance: none;
  }

  /* ── Table ───────────────────────────────── */
  .table-container {
    border: 1px solid var(--color-border);
    overflow-x: auto;
  }

  .unit-table {
    width: 100%;
    border-collapse: collapse;
  }

  .unit-table thead tr {
    background: var(--color-bg-surface);
    border-bottom: 1px solid var(--color-border);
  }

  .unit-table th {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    padding: 0.75rem 1rem;
    text-align: left;
    white-space: nowrap;
  }

  .unit-table th.col-pts {
    text-align: right;
  }

  .unit-row {
    border-bottom: 1px solid var(--color-border);
    transition: background 0.1s;
  }

  .unit-row:last-child {
    border-bottom: none;
  }

  .unit-row:hover {
    background: rgba(0, 200, 255, 0.04);
  }

  .unit-table td {
    padding: 0.8rem 1rem;
    vertical-align: middle;
  }

  /* ── Columns ─────────────────────────────── */
  .col-name {
    width: 40%;
  }

  .col-role {
    width: 20%;
  }

  .col-pts {
    width: 10%;
    text-align: right;
    font-family: 'Orbitron', monospace;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-gold);
  }

  .col-type {
    width: 30%;
    font-size: 0.8rem;
    color: var(--color-text-muted);
    letter-spacing: 0.03em;
  }

  /* ── Unit Name Button ────────────────────── */
  .unit-name-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--color-accent);
    padding: 0;
    text-align: left;
    transition: color 0.15s, text-shadow 0.15s;
  }

  .unit-name-btn:hover {
    color: #fff;
    text-shadow: 0 0 12px rgba(0, 200, 255, 0.6);
  }

  /* ── Role Badge ──────────────────────────── */
  .role-badge {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border: 1px solid;
    padding: 0.2em 0.55em;
    white-space: nowrap;
  }

  /* ── Empty State ─────────────────────────── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 3rem 1rem;
    color: var(--color-text-muted);
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

  .empty-state strong {
    color: var(--color-text);
  }
</style>
