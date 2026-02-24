<script lang="ts">
  import type { DetachmentSlotType, SlottedUnit, UnitProfile } from '../data/types';
  import { units } from '../data';

  const {
    slotType,
    currentUnit,
    onassign,
    oncancel,
  }: {
    slotType: DetachmentSlotType;
    currentUnit: SlottedUnit | null;
    onassign: (unit: SlottedUnit) => void;
    oncancel: () => void;
  } = $props();

  const eligibleUnits = $derived(
    units.filter((u) => u.role === slotType),
  );

  let step = $state<'pick' | 'options'>('pick');
  let search = $state('');
  let selectedProfile = $state<UnitProfile | null>(null);

  // Track selected choice per option index: Map<optionIndex, choiceIndex>
  let selectedChoices = $state<Record<number, number>>({});

  const filteredUnits = $derived(
    eligibleUnits.filter((u) => {
      const q = search.toLowerCase().trim();
      return !q || u.name.toLowerCase().includes(q);
    }),
  );

  const extraPoints = $derived(() => {
    if (!selectedProfile) return 0;
    let total = 0;
    for (const [optIdxStr, choiceIdx] of Object.entries(selectedChoices)) {
      const optIdx = Number(optIdxStr);
      const choice = selectedProfile.options[optIdx]?.choices?.[choiceIdx];
      if (choice?.points) total += choice.points;
    }
    return total;
  });

  const totalPoints = $derived(
    selectedProfile ? selectedProfile.points + extraPoints() : 0,
  );

  function selectUnit(profile: UnitProfile) {
    selectedProfile = profile;
    // Pre-populate choices if editing existing unit
    if (currentUnit && currentUnit.unitName === profile.name) {
      const map: Record<number, number> = {};
      for (const sc of currentUnit.selectedChoices) {
        map[sc.optionIndex] = sc.choiceIndex;
      }
      selectedChoices = map;
    } else {
      selectedChoices = {};
    }
    step = 'options';
  }

  function goBack() {
    step = 'pick';
    selectedProfile = null;
    selectedChoices = {};
  }

  function confirm() {
    if (!selectedProfile) return;
    const choices = Object.entries(selectedChoices).map(([optIdx, choiceIdx]) => ({
      optionIndex: Number(optIdx),
      choiceIndex: choiceIdx,
    }));
    onassign({ unitName: selectedProfile.name, selectedChoices: choices });
  }

  function toggleChoice(optionIndex: number, choiceIndex: number) {
    const current = selectedChoices[optionIndex];
    if (current === choiceIndex) {
      // Deselect
      const next = { ...selectedChoices };
      delete next[optionIndex];
      selectedChoices = next;
    } else {
      selectedChoices = { ...selectedChoices, [optionIndex]: choiceIndex };
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') oncancel();
  }

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
      Transport: '#5a7080',
      'Heavy Transport': '#888888',
    };
    return map[role] ?? '#5a7080';
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="backdrop" onclick={oncancel}>
  <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
    <!-- Step 1: Pick a unit -->
    {#if step === 'pick'}
      <div class="modal-header">
        <div class="header-left">
          <span class="slot-label">Assign</span>
          <span class="slot-type" style="color: {getRoleColor(slotType)}">{slotType}</span>
        </div>
        <button class="close-btn" onclick={oncancel}>×</button>
      </div>

      <div class="search-bar">
        <span class="search-icon">⌕</span>
        <input
          class="search-input"
          type="search"
          placeholder="Search units…"
          bind:value={search}
          autocomplete="off"
        />
      </div>

      <div class="unit-list">
        {#if filteredUnits.length === 0}
          <div class="empty">
            {#if eligibleUnits.length === 0}
              <p>No units available for <strong>{slotType}</strong> slots.</p>
              <p class="sub">Add more units to the armory to fill this role.</p>
            {:else}
              <p>No units match <strong>{search}</strong></p>
            {/if}
          </div>
        {:else}
          {#each filteredUnits as unit (unit.name)}
            <button
              class="unit-row"
              class:current={currentUnit?.unitName === unit.name}
              onclick={() => selectUnit(unit)}
            >
              <span class="unit-name">{unit.name}</span>
              <span
                class="role-badge"
                style="color: {getRoleColor(unit.role)}; border-color: {getRoleColor(unit.role)}44"
              >{unit.role}</span>
              <span class="unit-pts">{unit.points}</span>
            </button>
          {/each}
        {/if}
      </div>

    <!-- Step 2: Configure options -->
    {:else if step === 'options' && selectedProfile}
      <div class="modal-header">
        <button class="back-btn" onclick={goBack}>← Back</button>
        <span class="step-title">{selectedProfile.name}</span>
        <button class="close-btn" onclick={oncancel}>×</button>
      </div>

      <div class="options-body">
        <div class="base-cost-row">
          <span class="base-label">Base cost</span>
          <span class="base-pts">{selectedProfile.points} pts</span>
        </div>

        {#if selectedProfile.options.length > 0}
          <div class="options-section">
            <span class="options-heading">Options</span>

            {#each selectedProfile.options as option, optIdx}
              <div class="option-block">
                <p class="option-desc">{option.description}</p>

                {#if option.choices && option.choices.length > 0}
                  <div class="choice-list">
                    {#each option.choices as choice, choiceIdx}
                      {@const isSelected = selectedChoices[optIdx] === choiceIdx}
                      <button
                        class="choice-btn"
                        class:selected={isSelected}
                        onclick={() => toggleChoice(optIdx, choiceIdx)}
                      >
                        <span class="choice-radio">{isSelected ? '◉' : '○'}</span>
                        <span class="choice-desc">{choice.description}</span>
                        <span class="choice-cost">
                          {#if choice.points !== undefined && choice.points !== 0}
                            +{choice.points} pts
                          {:else if choice.pointsPerModel !== undefined && choice.pointsPerModel !== 0}
                            +{choice.pointsPerModel} pts/model
                          {:else}
                            Free
                          {/if}
                        </span>
                      </button>
                    {/each}
                  </div>
                {:else if option.points || option.pointsPerModel}
                  <p class="option-cost-note">
                    {#if option.points}+{option.points} pts{/if}
                    {#if option.pointsPerModel}+{option.pointsPerModel} pts/model{/if}
                  </p>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <p class="no-options">No configurable options for this unit.</p>
        {/if}
      </div>

      <div class="options-footer">
        <div class="total-row">
          <span class="total-label">Total</span>
          <span class="total-pts">{totalPoints} pts</span>
        </div>
        <button class="assign-btn" onclick={confirm}>Assign Unit</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 300;
    padding: 1rem;
  }

  .modal {
    background: var(--color-bg-raised);
    border: 1px solid var(--color-border);
    width: 100%;
    max-width: 520px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 0 50px rgba(0, 0, 0, 0.7);
    overflow: hidden;
  }

  /* ── Header ──────────────────────────────────── */
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-surface);
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .slot-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .slot-type {
    font-family: 'Orbitron', monospace;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .step-title {
    font-family: 'Orbitron', monospace;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text);
    flex: 1;
    text-align: center;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: 1.4rem;
    line-height: 1;
    cursor: pointer;
    padding: 0 0.2rem;
    flex-shrink: 0;
  }

  .close-btn:hover {
    color: var(--color-text);
  }

  .back-btn {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    background: none;
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    padding: 0.3rem 0.7rem;
    cursor: pointer;
    transition: color 0.12s, border-color 0.12s;
    flex-shrink: 0;
  }

  .back-btn:hover {
    color: var(--color-text);
    border-color: var(--color-text-muted);
  }

  /* ── Step 1: Unit list ───────────────────────── */
  .search-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 1.25rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
    flex-shrink: 0;
  }

  .search-icon {
    color: var(--color-text-muted);
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: var(--color-text);
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.9rem;
    letter-spacing: 0.03em;
    padding: 0.65rem 0;
  }

  .search-input::placeholder {
    color: var(--color-text-muted);
  }

  .search-input::-webkit-search-cancel-button {
    -webkit-appearance: none;
  }

  .unit-list {
    overflow-y: auto;
    flex: 1;
  }

  .unit-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.85rem 1.25rem;
    background: none;
    border: none;
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
  }

  .unit-row:last-child {
    border-bottom: none;
  }

  .unit-row:hover {
    background: rgba(0, 200, 255, 0.05);
  }

  .unit-row.current {
    background: rgba(0, 200, 255, 0.06);
  }

  .unit-name {
    flex: 1;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--color-accent);
  }

  .role-badge {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border: 1px solid;
    padding: 0.15em 0.5em;
    white-space: nowrap;
  }

  .unit-pts {
    font-family: 'Orbitron', monospace;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-gold);
    min-width: 36px;
    text-align: right;
  }

  .empty {
    padding: 3rem 1.5rem;
    text-align: center;
    color: var(--color-text-muted);
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.9rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .empty .sub {
    font-size: 0.8rem;
    opacity: 0.7;
  }

  /* ── Step 2: Options ─────────────────────────── */
  .options-body {
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .base-cost-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.85rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
  }

  .base-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .base-pts {
    font-family: 'Orbitron', monospace;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-gold);
  }

  .options-section {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .options-heading {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    padding: 0.6rem 1.25rem 0.4rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-surface);
  }

  .option-block {
    padding: 0.9rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .option-block:last-child {
    border-bottom: none;
  }

  .option-desc {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.82rem;
    letter-spacing: 0.02em;
    color: var(--color-text-muted);
    line-height: 1.4;
  }

  .choice-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .choice-btn {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    background: none;
    border: 1px solid var(--color-border);
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.1s, background 0.1s;
  }

  .choice-btn:hover {
    border-color: var(--color-accent-dim);
    background: rgba(0, 200, 255, 0.04);
  }

  .choice-btn.selected {
    border-color: var(--color-accent);
    background: rgba(0, 200, 255, 0.08);
  }

  .choice-radio {
    font-size: 0.9rem;
    color: var(--color-accent);
    flex-shrink: 0;
    line-height: 1;
  }

  .choice-desc {
    flex: 1;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.85rem;
    letter-spacing: 0.03em;
    color: var(--color-text);
  }

  .choice-cost {
    font-family: 'Orbitron', monospace;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-gold);
    flex-shrink: 0;
  }

  .option-cost-note {
    font-family: 'Orbitron', monospace;
    font-size: 0.72rem;
    color: var(--color-gold);
  }

  .no-options {
    padding: 1.5rem 1.25rem;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    text-align: center;
    opacity: 0.7;
  }

  /* ── Footer ──────────────────────────────────── */
  .options-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--color-border);
    background: var(--color-bg-surface);
    flex-shrink: 0;
  }

  .total-row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .total-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .total-pts {
    font-family: 'Orbitron', monospace;
    font-size: 1.1rem;
    font-weight: 900;
    color: var(--color-gold);
  }

  .assign-btn {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    background: rgba(0, 200, 255, 0.1);
    border: 1px solid var(--color-accent-dim);
    color: var(--color-accent);
    padding: 0.6rem 1.4rem;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }

  .assign-btn:hover {
    background: rgba(0, 200, 255, 0.18);
    border-color: var(--color-accent);
  }
</style>
