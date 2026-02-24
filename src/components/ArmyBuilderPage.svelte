<script lang="ts">
  import type { DetachmentSlotType, SlottedUnit } from '../data/types';
  import {
    armiesStore,
    createWarlordDetachment,
    calcArmyPoints,
    calcSlottedUnitPoints,
  } from '../stores/armies.svelte';
  import DetachmentCard from './DetachmentCard.svelte';

  const { armyId, onback }: { armyId: string; onback: () => void } = $props();

  const army = $derived(armiesStore.list.find((a) => a.id === armyId)!);
  const totalPoints = $derived(army ? calcArmyPoints(army) : 0);
  const hasWarlord = $derived(army?.detachments.some((d) => d.type === 'Warlord') ?? false);

  function addWarlordDetachment() {
    const clone = JSON.parse(JSON.stringify(army));
    clone.detachments.push(createWarlordDetachment());
    clone.updatedAt = Date.now();
    armiesStore.update(clone);
  }

  function removeWarlordDetachment() {
    const clone = JSON.parse(JSON.stringify(army));
    clone.detachments = clone.detachments.filter(
      (d: { type: string }) => d.type !== 'Warlord',
    );
    clone.updatedAt = Date.now();
    armiesStore.update(clone);
  }

  function assignUnit(detIndex: number, slotId: string, unit: SlottedUnit) {
    const clone = JSON.parse(JSON.stringify(army));
    clone.detachments[detIndex].slots = clone.detachments[detIndex].slots.map(
      (s: { id: string }) => (s.id === slotId ? { ...s, unit } : s),
    );
    clone.updatedAt = Date.now();
    armiesStore.update(clone);
  }

  function clearSlot(detIndex: number, slotId: string) {
    const clone = JSON.parse(JSON.stringify(army));
    clone.detachments[detIndex].slots = clone.detachments[detIndex].slots.map(
      (s: { id: string }) => (s.id === slotId ? { ...s, unit: null } : s),
    );
    clone.updatedAt = Date.now();
    armiesStore.update(clone);
  }

  const FACTION_COLORS: Record<string, string> = {
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
</script>

{#if !army}
  <div class="error">Army not found.</div>
{:else}
  <div class="builder">
    <!-- Header bar -->
    <div class="builder-header">
      <button class="back-btn" onclick={onback}>← Back</button>
      <div class="army-info">
        <span class="army-name">{army.name}</span>
        <span
          class="faction-tag"
          style="color: {FACTION_COLORS[army.faction] ?? '#5a7080'}; border-color: {FACTION_COLORS[army.faction] ?? '#5a7080'}55"
        >{army.faction}</span>
      </div>
      <div class="points-display">
        <span class="points-value">{totalPoints}</span>
        <span class="points-label">pts</span>
      </div>
    </div>

    <!-- Detachments -->
    <div class="detachments">
      {#each army.detachments as detachment, detIndex (detachment.type + detIndex)}
        <div class="detachment-wrapper">
          <DetachmentCard
            {detachment}
            {detIndex}
            onassign={(slotId, unit) => assignUnit(detIndex, slotId, unit)}
            onclear={(slotId) => clearSlot(detIndex, slotId)}
          />
          {#if detachment.type === 'Warlord'}
            <button class="remove-det-btn" onclick={removeWarlordDetachment}>
              − Remove Warlord Detachment
            </button>
          {/if}
        </div>
      {/each}

      {#if !hasWarlord}
        <button class="add-det-btn" onclick={addWarlordDetachment}>
          + Add Warlord Detachment
        </button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .error {
    text-align: center;
    padding: 4rem;
    color: var(--color-text-muted);
    font-family: 'Rajdhani', sans-serif;
  }

  .builder {
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* ── Header ──────────────────────────────────── */
  .builder-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg-raised);
    flex-wrap: wrap;
  }

  .back-btn {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    background: none;
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    padding: 0.45rem 0.9rem;
    cursor: pointer;
    transition: border-color 0.12s, color 0.12s;
    flex-shrink: 0;
  }

  .back-btn:hover {
    border-color: var(--color-text-muted);
    color: var(--color-text);
  }

  .army-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .army-name {
    font-family: 'Orbitron', monospace;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .faction-tag {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border: 1px solid;
    padding: 0.15em 0.5em;
    width: fit-content;
  }

  .points-display {
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
    flex-shrink: 0;
  }

  .points-value {
    font-family: 'Orbitron', monospace;
    font-size: 1.6rem;
    font-weight: 900;
    color: var(--color-gold);
    text-shadow: 0 0 16px rgba(201, 147, 58, 0.4);
    line-height: 1;
  }

  .points-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-gold-dim);
  }

  /* ── Detachments ─────────────────────────────── */
  .detachments {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .detachment-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .add-det-btn {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    background: none;
    border: 1px dashed var(--color-border);
    color: var(--color-text-muted);
    padding: 0.85rem 1.5rem;
    cursor: pointer;
    width: 100%;
    transition: border-color 0.12s, color 0.12s;
    text-align: center;
  }

  .add-det-btn:hover {
    border-color: var(--color-accent-dim);
    color: var(--color-accent);
  }

  .remove-det-btn {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    background: none;
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    padding: 0.5rem 1rem;
    cursor: pointer;
    align-self: flex-end;
    transition: border-color 0.12s, color 0.12s;
  }

  .remove-det-btn:hover {
    border-color: var(--color-danger);
    color: var(--color-danger);
  }
</style>
