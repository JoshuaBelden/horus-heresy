<script lang="ts">
  import type { ArmyDetachment, SlottedUnit, DetachmentSlotType } from '../data/types';
  import { units, weaponLists } from '../data';
  import { calcSlottedUnitPoints } from '../stores/armies.svelte';
  import UnitPickerModal from './UnitPickerModal.svelte';

  const {
    detachment,
    detIndex,
    onassign,
    onclear,
  }: {
    detachment: ArmyDetachment;
    detIndex: number;
    onassign: (slotId: string, unit: SlottedUnit) => void;
    onclear: (slotId: string) => void;
  } = $props();

  let pickerSlotId = $state<string | null>(null);
  let pickerSlotType = $state<DetachmentSlotType | null>(null);
  let pickerCurrentUnit = $state<SlottedUnit | null>(null);
  let expandedSlotId = $state<string | null>(null);

  function openPicker(slotId: string, slotType: DetachmentSlotType, currentUnit: SlottedUnit | null) {
    pickerSlotId = slotId;
    pickerSlotType = slotType;
    pickerCurrentUnit = currentUnit;
  }

  function toggleExpand(slotId: string) {
    expandedSlotId = expandedSlotId === slotId ? null : slotId;
  }

  function handleAssign(unit: SlottedUnit) {
    if (pickerSlotId) {
      onassign(pickerSlotId, unit);
    }
    pickerSlotId = null;
    pickerSlotType = null;
    pickerCurrentUnit = null;
  }

  function handlePickerCancel() {
    pickerSlotId = null;
    pickerSlotType = null;
    pickerCurrentUnit = null;
  }

  function getSlotColor(slotType: DetachmentSlotType): string {
    const map: Record<DetachmentSlotType, string> = {
      'High Command': '#4caf50',
      Command: '#4caf50',
      Troops: '#00c8ff',
      Transport: '#5a7080',
      Warlord: '#ff4444',
      Retinue: '#cc88ff',
      'Heavy Transport': '#888888',
      'War-Engine': '#cc4400',
    };
    return map[slotType] ?? '#5a7080';
  }

  function getUnitPoints(unit: SlottedUnit): number {
    return calcSlottedUnitPoints(unit);
  }

  function getExpandedData(unit: SlottedUnit) {
    const profile = units.find((u) => u.name === unit.unitName);
    if (!profile) return { models: [], lines: [] };

    const lines: { label: string; pts: number }[] = [];

    for (const sc of unit.selectedChoices) {
      const opt = profile.options[sc.optionIndex];
      if (!opt) continue;

      if (opt.appliesTo === 'model-count') {
        if (sc.count && sc.count > 0) {
          lines.push({ label: `+${sc.count} ${opt.modelName ?? 'models'}`, pts: sc.count * (opt.pointsPerModel ?? 0) });
        }
      } else if (opt.weaponListNames) {
        const allEntries = opt.weaponListNames.flatMap(
          (name) => weaponLists.find((l) => l.name === name)?.entries ?? []
        );
        const entry = allEntries[sc.choiceIndex];
        if (entry) lines.push({ label: entry.weaponName, pts: entry.points });
      } else {
        const choice = opt.choices?.[sc.choiceIndex];
        if (choice) lines.push({ label: choice.description, pts: choice.points ?? 0 });
      }
    }

    for (const group of unit.modelGroups ?? []) {
      if (group.choiceIndex === null) continue;
      const opt = profile.options[group.optionIndex];
      const choice = opt?.choices?.[group.choiceIndex];
      if (choice) {
        const pts = group.count * (choice.pointsPerModel ?? 0);
        lines.push({ label: `${group.count}× ${opt?.modelName ?? 'model'}: ${choice.description}`, pts });
      }
    }

    // Model roster with correct counts (accounting for additional models)
    const additionalSc = unit.selectedChoices.find(
      (sc) => profile.options[sc.optionIndex]?.appliesTo === 'model-count'
    );
    const additionalModelName = additionalSc
      ? profile.options[additionalSc.optionIndex]?.modelName
      : undefined;
    const models = profile.models.map((m) => ({
      ...m,
      count: (m.count ?? 1) + (m.name === additionalModelName ? (additionalSc?.count ?? 0) : 0),
    }));

    return { models, lines };
  }
</script>

<div class="det-card">
  <div class="det-header">
    <span class="det-type">{detachment.type} Detachment</span>
    <span class="det-slot-count">
      {detachment.slots.filter((s) => s.unit !== null).length}/{detachment.slots.length} filled
    </span>
  </div>

  <div class="slot-list">
    {#each detachment.slots as slot (slot.id)}
      {@const color = getSlotColor(slot.slotType)}
      <div class="slot-row" class:filled={slot.unit !== null} class:expanded={expandedSlotId === slot.id}>
        <span class="slot-badge" style="color: {color}; border-color: {color}44">
          {slot.slotType}
        </span>

        {#if slot.unit}
          <button
            class="slot-unit-btn"
            onclick={() => toggleExpand(slot.id)}
            aria-expanded={expandedSlotId === slot.id}
          >
            <span class="chevron">{expandedSlotId === slot.id ? '▾' : '▸'}</span>
            {slot.unit.unitName}
          </button>
          <span class="slot-pts">{getUnitPoints(slot.unit)} pts</span>
          <button
            class="slot-edit-btn"
            onclick={() => openPicker(slot.id, slot.slotType, slot.unit)}
            title="Edit unit options"
            aria-label="Edit unit options"
          >✎</button>
          <button
            class="slot-clear-btn"
            onclick={() => { onclear(slot.id); if (expandedSlotId === slot.id) expandedSlotId = null; }}
            title="Remove unit"
            aria-label="Remove unit from slot"
          >×</button>
        {:else}
          <button
            class="slot-empty-btn"
            onclick={() => openPicker(slot.id, slot.slotType, null)}
          >
            <span class="empty-label">— Empty —</span>
            <span class="assign-hint">Click to assign</span>
          </button>
        {/if}
      </div>

      {#if slot.unit && expandedSlotId === slot.id}
        {@const expanded = getExpandedData(slot.unit)}
        <div class="slot-expansion" style="border-left-color: {color}">
          <div class="expansion-models">
            {#each expanded.models as model}
              <div class="model-row">
                <span class="model-name">{model.name}</span>
                <span class="model-count">×{model.count ?? 1}</span>
              </div>
            {/each}
          </div>
          {#if expanded.lines.length > 0}
            <div class="expansion-options">
              <span class="options-label">Options</span>
              {#each expanded.lines as line}
                <div class="option-line">
                  <span class="option-item">› {line.label}</span>
                  {#if line.pts > 0}
                    <span class="option-pts">+{line.pts}</span>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}

        </div>
      {/if}
    {/each}
  </div>
</div>

{#if pickerSlotId !== null && pickerSlotType !== null}
  <UnitPickerModal
    slotType={pickerSlotType}
    currentUnit={pickerCurrentUnit}
    onassign={handleAssign}
    oncancel={handlePickerCancel}
  />
{/if}

<style>
  .det-card {
    border: 1px solid var(--color-border);
    background: var(--color-bg-raised);
    overflow: hidden;
  }

  .det-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.9rem 1.5rem;
    background: var(--color-bg-surface);
    border-bottom: 1px solid var(--color-border);
  }

  .det-type {
    font-family: 'Orbitron', monospace;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-accent);
  }

  .det-slot-count {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
  }

  /* ── Slot Rows ───────────────────────────────── */
  .slot-list {
    display: flex;
    flex-direction: column;
  }

  .slot-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0 1.5rem;
    min-height: 52px;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.1s;
  }

  .slot-row:last-child {
    border-bottom: none;
  }

  .slot-row.filled {
    background: rgba(0, 200, 255, 0.02);
  }

  .slot-row.expanded {
    background: rgba(0, 200, 255, 0.05);
  }

  .slot-badge {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border: 1px solid;
    padding: 0.15em 0.5em;
    white-space: nowrap;
    flex-shrink: 0;
    width: 120px;
    text-align: center;
  }

  /* ── Empty slot ──────────────────────────────── */
  .slot-empty-btn {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: none;
    border: 1px dashed transparent;
    padding: 0.5rem 0.6rem;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.12s;
  }

  .slot-empty-btn:hover {
    border-color: var(--color-border);
  }

  .slot-empty-btn:hover .assign-hint {
    opacity: 1;
  }

  .empty-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    opacity: 0.5;
  }

  .assign-hint {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.68rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-accent);
    opacity: 0;
    transition: opacity 0.12s;
  }

  /* ── Filled slot ─────────────────────────────── */
  .slot-unit-btn {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.92rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--color-text);
    transition: color 0.12s;
  }

  .slot-unit-btn:hover {
    color: var(--color-accent);
  }

  .chevron {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .slot-pts {
    font-family: 'Orbitron', monospace;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--color-gold);
    flex-shrink: 0;
  }

  .slot-edit-btn {
    background: none;
    border: 1px solid transparent;
    color: var(--color-text-muted);
    font-size: 0.85rem;
    line-height: 1;
    padding: 0.25rem 0.4rem;
    cursor: pointer;
    flex-shrink: 0;
    transition: color 0.12s, border-color 0.12s;
  }

  .slot-edit-btn:hover {
    color: var(--color-accent);
    border-color: var(--color-accent-dim);
  }

  .slot-clear-btn {
    background: none;
    border: 1px solid transparent;
    color: var(--color-text-muted);
    font-size: 1rem;
    line-height: 1;
    padding: 0.25rem 0.4rem;
    cursor: pointer;
    flex-shrink: 0;
    transition: color 0.12s, border-color 0.12s;
  }

  .slot-clear-btn:hover {
    color: var(--color-danger);
    border-color: var(--color-danger);
  }

  /* ── Expanded section ────────────────────────── */
  .slot-expansion {
    border-left: 2px solid;
    margin: 0;
    padding: 0.6rem 1.5rem 0.75rem 2rem;
    background: var(--color-bg-surface);
    border-bottom: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .expansion-models {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .model-row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .model-name {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--color-text);
  }

  .model-count {
    font-family: 'Orbitron', monospace;
    font-size: 0.68rem;
    color: var(--color-text-muted);
  }

  .expansion-options {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding-top: 0.35rem;
    border-top: 1px solid var(--color-border);
  }

  .options-label {
    font-family: 'Orbitron', monospace;
    font-size: 0.55rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    margin-bottom: 0.1rem;
  }

  .option-line {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .option-item {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.78rem;
    letter-spacing: 0.03em;
    color: var(--color-accent);
  }

  .option-pts {
    font-family: 'Orbitron', monospace;
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--color-gold);
    white-space: nowrap;
    flex-shrink: 0;
  }

</style>
