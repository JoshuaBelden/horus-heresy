<script lang="ts">
  import type { Faction, ArmyList } from '../data/types';
  import { armiesStore, createCrusadeDetachment, calcArmyPoints } from '../stores/armies.svelte';

  const { onopen, onreport }: { onopen: (id: string) => void; onreport: (id: string) => void } = $props();

  const FACTIONS: Faction[] = [
    'Dark Angels',
    'White Scars',
    'Space Wolves',
    'Imperial Fists',
    'Blood Angels',
    'Iron Hands',
    'Ultramarines',
    'Salamanders',
    'Raven Guard',
  ];

  const FACTION_COLORS: Record<Faction, string> = {
    'Dark Angels': '#1a5c1a',
    'White Scars': '#c8d8e8',
    'Space Wolves': '#5a7ab0',
    'Imperial Fists': '#c9a020',
    'Blood Angels': '#8b1a1a',
    'Iron Hands': '#3a3a3a',
    Ultramarines: '#1a3ab0',
    Salamanders: '#1a6630',
    'Raven Guard': '#404040',
  };

  // Create form state
  let showCreate = $state(false);
  let newName = $state('');
  let newFaction = $state<Faction>('Ultramarines');

  // Long-press delete state
  let pressingId = $state<string | null>(null);
  let pressTimer = $state<ReturnType<typeof setTimeout> | null>(null);

  function openCreateForm() {
    newName = '';
    newFaction = 'Ultramarines';
    showCreate = true;
  }

  function cancelCreate() {
    showCreate = false;
  }

  function submitCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const id = crypto.randomUUID();
    armiesStore.create({
      id,
      name: trimmed,
      faction: newFaction,
      allegiance: 'Loyalist',
      detachments: [createCrusadeDetachment()],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    showCreate = false;
    onopen(id);
  }

  function startPress(armyId: string) {
    pressingId = armyId;
    pressTimer = setTimeout(() => {
      armiesStore.remove(armyId);
      pressingId = null;
      pressTimer = null;
    }, 900);
  }

  function cancelPress() {
    if (pressTimer) clearTimeout(pressTimer);
    pressingId = null;
    pressTimer = null;
  }

  function handleKeyCreate(e: KeyboardEvent) {
    if (e.key === 'Enter') submitCreate();
    if (e.key === 'Escape') cancelCreate();
  }

  // ── Import / Export ──────────────────────────────────────────────────────────

  function exportArmy(army: ArmyList) {
    const { id: _, ...data } = army;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${army.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  let fileInput: HTMLInputElement = undefined!;

  function triggerImport() {
    fileInput.click();
  }

  function handleImportFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        const army: ArmyList = {
          id: crypto.randomUUID(),
          name: data.name ?? 'Imported Army',
          faction: data.faction ?? 'Ultramarines',
          allegiance: data.allegiance ?? 'Loyalist',
          detachments: data.detachments ?? [createCrusadeDetachment()],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        armiesStore.create(army);
      } catch {
        alert('Could not read army file. Make sure it is a valid JSON export.');
      }
    };
    reader.readAsText(file);
    (e.target as HTMLInputElement).value = '';
  }

  function filledSlots(army: (typeof armiesStore.list)[number]): number {
    return army.detachments.reduce(
      (acc, det) => acc + det.slots.filter((s) => s.unit !== null).length,
      0,
    );
  }

  function totalSlots(army: (typeof armiesStore.list)[number]): number {
    return army.detachments.reduce((acc, det) => acc + det.slots.length, 0);
  }
</script>

<div class="page">
  <div class="page-header">
    <div class="page-title-group">
      <h2 class="page-title">My Armies</h2>
      <span class="army-count">{armiesStore.list.length} roster{armiesStore.list.length !== 1 ? 's' : ''}</span>
    </div>
    <div class="header-actions">
      <button class="action-btn" onclick={triggerImport}>Import</button>
      <button class="create-btn" onclick={openCreateForm}>+ New Army</button>
    </div>
  </div>
  <input
    type="file"
    accept=".json"
    style="display:none"
    bind:this={fileInput}
    onchange={handleImportFile}
  />

  {#if armiesStore.list.length === 0}
    <div class="empty-state">
      <span class="empty-icon">◈</span>
      <p class="empty-title">No armies yet</p>
      <p class="empty-sub">Create your first army roster to get started.</p>
      <button class="create-btn" onclick={openCreateForm}>+ New Army</button>
    </div>
  {:else}
    <div class="army-grid">
      {#each armiesStore.list as army (army.id)}
        {@const pts = calcArmyPoints(army)}
        {@const filled = filledSlots(army)}
        {@const total = totalSlots(army)}
        <div class="army-card">
          <div class="card-main">
            <button class="card-body" onclick={() => onopen(army.id)}>
              <div class="card-top">
                <span class="army-name">{army.name}</span>
                <span
                  class="faction-badge"
                  style="color: {FACTION_COLORS[army.faction]}; border-color: {FACTION_COLORS[army.faction]}55"
                >{army.faction}</span>
              </div>
              <div class="card-bottom">
                <div class="card-stat">
                  <span class="stat-value points">{pts}</span>
                  <span class="stat-label">pts</span>
                </div>
                <div class="card-stat">
                  <span class="stat-value">{filled}/{total}</span>
                  <span class="stat-label">slots filled</span>
                </div>
                <div class="card-stat">
                  <span class="stat-value allegiance">{army.allegiance}</span>
                </div>
              </div>
            </button>

            <button
              class="delete-btn"
              class:pressing={pressingId === army.id}
              onpointerdown={() => startPress(army.id)}
              onpointerup={cancelPress}
              onpointerleave={cancelPress}
              onpointercancel={cancelPress}
              title="Hold to delete"
              aria-label="Delete army"
            >
              <span class="delete-icon">⊗</span>
              <span class="delete-fill"></span>
            </button>
          </div>

          <div class="card-actions">
            <button class="report-btn" onclick={() => onreport(army.id)}>
              ⚔ Battle Report
            </button>
            <button class="export-btn" onclick={() => exportArmy(army)}>
              Export
            </button>
          </div>
        </div>
      {/each}
    </div>
    <p class="hint-text">Hold the ⊗ button to delete an army roster</p>
  {/if}
</div>

<!-- Create Army Modal -->
{#if showCreate}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={cancelCreate}>
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal-header">
        <h3 class="modal-title">New Army Roster</h3>
        <button class="modal-close" onclick={cancelCreate}>×</button>
      </div>

      <div class="modal-body">
        <label class="field-label" for="army-name">Army Name</label>
        <input
          id="army-name"
          class="text-input"
          type="text"
          placeholder="e.g. Iron Fist of Caliban"
          bind:value={newName}
          onkeydown={handleKeyCreate}
          autocomplete="off"
        />

        <label class="field-label" for="faction-grid">Faction</label>
        <div class="faction-grid" id="faction-grid">
          {#each FACTIONS as faction}
            <button
              class="faction-btn"
              class:selected={newFaction === faction}
              style="--fc: {FACTION_COLORS[faction]}"
              onclick={() => (newFaction = faction)}
            >{faction}</button>
          {/each}
        </div>

        <div class="allegiance-row">
          <span class="field-label">Allegiance</span>
          <span class="allegiance-badge">Loyalist</span>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" onclick={cancelCreate}>Cancel</button>
        <button class="btn-create" onclick={submitCreate} disabled={!newName.trim()}>
          Create &amp; Build
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page {
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* ── Page Header ─────────────────────────────── */
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg-raised);
  }

  .page-title-group {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }

  .page-title {
    font-family: 'Orbitron', monospace;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-accent);
  }

  .army-count {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
  }

  .create-btn {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-accent);
    border: 1px solid var(--color-accent-dim);
    background: rgba(0, 200, 255, 0.06);
    padding: 0.5rem 1.1rem;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .create-btn:hover {
    background: rgba(0, 200, 255, 0.12);
    border-color: var(--color-accent);
  }

  /* ── Empty State ─────────────────────────────── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 4rem 1rem;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    background: var(--color-bg-raised);
  }

  .empty-icon {
    font-size: 2rem;
    opacity: 0.3;
  }

  .empty-title {
    font-family: 'Orbitron', monospace;
    font-size: 0.85rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .empty-sub {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  /* ── Army Grid ───────────────────────────────── */
  .army-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }

  .army-card {
    position: relative;
    border: 1px solid var(--color-border);
    background: var(--color-bg-raised);
    display: flex;
    flex-direction: column;
    transition: border-color 0.15s;
  }

  .army-card:hover {
    border-color: var(--color-accent-dim);
  }

  .card-main {
    display: flex;
    flex: 1;
  }

  .card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem 1rem 1.25rem 1.25rem;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    min-width: 0;
  }

  .card-top {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .army-name {
    font-family: 'Orbitron', monospace;
    font-size: 0.88rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--color-text);
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.15s;
  }

  .card-body:hover .army-name {
    color: var(--color-accent);
  }

  .faction-badge {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border: 1px solid;
    padding: 0.15em 0.5em;
    width: fit-content;
  }

  .card-bottom {
    display: flex;
    align-items: flex-end;
    gap: 1.25rem;
  }

  .card-stat {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .stat-value {
    font-family: 'Orbitron', monospace;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .stat-value.points {
    color: var(--color-gold);
  }

  .stat-value.allegiance {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .stat-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.62rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  /* ── Header Actions ──────────────────────────── */
  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    background: none;
    padding: 0.5rem 1.1rem;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }

  .action-btn:hover {
    color: var(--color-accent);
    border-color: var(--color-accent-dim);
    background: rgba(0, 200, 255, 0.06);
  }

  /* ── Card Actions ───────────────────────────── */
  .card-actions {
    display: flex;
    border-top: 1px solid var(--color-border);
  }

  .report-btn,
  .export-btn {
    flex: 1;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    transition: color 0.15s, background 0.15s;
  }

  .report-btn:hover,
  .export-btn:hover {
    color: var(--color-accent);
    background: rgba(0, 200, 255, 0.06);
  }

  .export-btn {
    border-left: 1px solid var(--color-border);
  }

  /* ── Delete Button ───────────────────────────── */
  .delete-btn {
    position: relative;
    overflow: hidden;
    width: 44px;
    flex-shrink: 0;
    background: none;
    border: none;
    border-left: 1px solid var(--color-border);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    transition: color 0.15s;
  }

  .delete-btn:hover {
    color: var(--color-danger);
  }

  .delete-icon {
    position: relative;
    z-index: 1;
    font-size: 1.1rem;
    line-height: 1;
    pointer-events: none;
  }

  .delete-fill {
    position: absolute;
    inset: 0;
    background: rgba(176, 48, 48, 0.18);
    transform: scaleY(0);
    transform-origin: bottom;
    transition: none;
  }

  .delete-btn.pressing .delete-fill {
    transform: scaleY(1);
    transition: transform 0.9s linear;
  }

  .delete-btn.pressing {
    color: var(--color-danger);
  }

  /* ── Hint ────────────────────────────────────── */
  .hint-text {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    opacity: 0.6;
    text-align: center;
  }

  /* ── Modal ───────────────────────────────────── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.72);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 1rem;
  }

  .modal {
    background: var(--color-bg-raised);
    border: 1px solid var(--color-border);
    width: 100%;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.6);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  .modal-title {
    font-family: 'Orbitron', monospace;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-accent);
  }

  .modal-close {
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: 1.4rem;
    cursor: pointer;
    line-height: 1;
    padding: 0 0.25rem;
  }

  .modal-close:hover {
    color: var(--color-text);
  }

  .modal-body {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .field-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    display: block;
    margin-bottom: -0.4rem;
  }

  .text-input {
    width: 100%;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font-family: 'Rajdhani', sans-serif;
    font-size: 1rem;
    letter-spacing: 0.03em;
    padding: 0.6rem 0.85rem;
    outline: none;
    transition: border-color 0.15s;
  }

  .text-input:focus {
    border-color: var(--color-accent-dim);
    box-shadow: 0 0 0 1px var(--color-accent-dim);
  }

  .faction-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .faction-btn {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    padding: 0.55rem 0.4rem;
    cursor: pointer;
    transition: border-color 0.12s, color 0.12s, background 0.12s;
    text-align: center;
  }

  .faction-btn:hover {
    border-color: var(--fc);
    color: var(--fc);
  }

  .faction-btn.selected {
    border-color: var(--fc);
    color: var(--fc);
    background: color-mix(in srgb, var(--fc) 12%, transparent);
  }

  .allegiance-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .allegiance-badge {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #4caf50;
    border: 1px solid #4caf5055;
    padding: 0.2em 0.6em;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1.25rem 1.5rem;
    border-top: 1px solid var(--color-border);
  }

  .btn-cancel {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    background: none;
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    padding: 0.5rem 1.1rem;
    cursor: pointer;
    transition: border-color 0.12s, color 0.12s;
  }

  .btn-cancel:hover {
    border-color: var(--color-text-muted);
    color: var(--color-text);
  }

  .btn-create {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    background: rgba(0, 200, 255, 0.1);
    border: 1px solid var(--color-accent-dim);
    color: var(--color-accent);
    padding: 0.5rem 1.25rem;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }

  .btn-create:hover:not(:disabled) {
    background: rgba(0, 200, 255, 0.18);
    border-color: var(--color-accent);
  }

  .btn-create:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
