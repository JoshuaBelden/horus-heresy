<script lang="ts">
  import type { ArmyDetachment, SlottedUnit, DetachmentSlotType } from '../data/types';
  import { units } from '../data';
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

  function openPicker(slotId: string, slotType: DetachmentSlotType, currentUnit: SlottedUnit | null) {
    pickerSlotId = slotId;
    pickerSlotType = slotType;
    pickerCurrentUnit = currentUnit;
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
    };
    return map[slotType] ?? '#5a7080';
  }

  function getUnitName(unit: SlottedUnit | null): string {
    return unit ? unit.unitName : '';
  }

  function getUnitPoints(unit: SlottedUnit): number {
    return calcSlottedUnitPoints(unit);
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
      <div class="slot-row" class:filled={slot.unit !== null}>
        <span class="slot-badge" style="color: {color}; border-color: {color}44">
          {slot.slotType}
        </span>

        {#if slot.unit}
          <button
            class="slot-unit-btn"
            onclick={() => openPicker(slot.id, slot.slotType, slot.unit)}
          >
            {slot.unit.unitName}
          </button>
          <span class="slot-pts">{getUnitPoints(slot.unit)} pts</span>
          <button
            class="slot-clear-btn"
            onclick={() => onclear(slot.id)}
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

  .slot-pts {
    font-family: 'Orbitron', monospace;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--color-gold);
    flex-shrink: 0;
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
</style>
