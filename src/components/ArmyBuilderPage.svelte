<script lang="ts">
  import type { DetachmentSlotType, DetachmentType, SlottedUnit } from '../data/types';
  import {
    armiesStore,
    DETACHMENT_DEFINITIONS,
    createDetachment,
    calcArmyPoints,
    calcSlottedUnitPoints,
    type DetachmentDefinition,
  } from '../stores/armies.svelte';
  import { getFactionRules, ORDER_EXEMPLAR_ADVANTAGES } from '../data';
  import { libraryStore } from '../stores/library.svelte';
  import DetachmentCard from './DetachmentCard.svelte';

  const { armyId, onback, onreport }: { armyId: string; onback: () => void; onreport: () => void } = $props();

  const army = $derived(armiesStore.list.find((a) => a.id === armyId)!);
  const totalPoints = $derived(army ? calcArmyPoints(army) : 0);
  const armyRules = $derived(army ? getFactionRules(army.faction) : []);

  // Every non-primary detachment can be added any number of times (no FO rules
  // enforced). Faction-specific detachments are only offered to matching armies.
  const addableDetachments = $derived(
    DETACHMENT_DEFINITIONS.filter(
      (d) => !d.primary && (!d.faction || d.faction === army?.faction),
    ),
  );

  function slotSummary(def: DetachmentDefinition): string {
    return def.slots.map((s) => `${s.slotType} ×${s.count}`).join(' · ');
  }

  function addDetachment(type: DetachmentType) {
    const clone = JSON.parse(JSON.stringify(army));
    clone.detachments.push(createDetachment(type));
    clone.updatedAt = Date.now();
    armiesStore.update(clone);
  }

  function removeDetachment(detIndex: number) {
    const clone = JSON.parse(JSON.stringify(army));
    clone.detachments.splice(detIndex, 1);
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
    // Removing the unit also clears any Prime designation on that slot.
    clone.detachments[detIndex].slots = clone.detachments[detIndex].slots.map(
      (s: { id: string }) => (s.id === slotId ? { ...s, unit: null, prime: false } : s),
    );
    clone.updatedAt = Date.now();
    armiesStore.update(clone);
  }

  function setPrimeSlot(detIndex: number, slotId: string, isPrime: boolean) {
    const clone = JSON.parse(JSON.stringify(army));
    clone.detachments[detIndex].slots = clone.detachments[detIndex].slots.map(
      (s: { id: string; unit: SlottedUnit | null }) => {
        if (s.id !== slotId) return s;
        if (isPrime) return { ...s, prime: true };
        // Un-designating drops the Prime Advantage and Order on the unit.
        const unit = s.unit
          ? { ...s.unit, primeAdvantage: undefined, primeOrder: undefined }
          : s.unit;
        return { ...s, prime: false, unit };
      },
    );
    clone.updatedAt = Date.now();
    armiesStore.update(clone);
  }

  function renameUnit(detIndex: number, slotId: string, nickname: string | undefined) {
    const clone = JSON.parse(JSON.stringify(army));
    clone.detachments[detIndex].slots = clone.detachments[detIndex].slots.map(
      (s: { id: string; unit: SlottedUnit | null }) =>
        s.id === slotId && s.unit ? { ...s, unit: { ...s.unit, nickname } } : s,
    );
    clone.updatedAt = Date.now();
    armiesStore.update(clone);
  }

  function setPrimeAdvantage(detIndex: number, slotId: string, advantage: string | undefined) {
    // Drop any previously-selected Order if the new advantage doesn't grant one.
    const keepsOrder = !!advantage && ORDER_EXEMPLAR_ADVANTAGES.includes(advantage);
    const clone = JSON.parse(JSON.stringify(army));
    clone.detachments[detIndex].slots = clone.detachments[detIndex].slots.map(
      (s: { id: string; unit: SlottedUnit | null }) =>
        s.id === slotId && s.unit
          ? {
              ...s,
              unit: {
                ...s.unit,
                primeAdvantage: advantage,
                primeOrder: keepsOrder ? s.unit.primeOrder : undefined,
              },
            }
          : s,
    );
    clone.updatedAt = Date.now();
    armiesStore.update(clone);
  }

  function setPrimeOrder(detIndex: number, slotId: string, order: string | undefined) {
    const clone = JSON.parse(JSON.stringify(army));
    clone.detachments[detIndex].slots = clone.detachments[detIndex].slots.map(
      (s: { id: string; unit: SlottedUnit | null }) =>
        s.id === slotId && s.unit
          ? { ...s, unit: { ...s.unit, primeOrder: order } }
          : s,
    );
    clone.updatedAt = Date.now();
    armiesStore.update(clone);
  }

  // Every Prime Advantage selected across the army, for once-per-army limits.
  const armyPrimeAdvantages = $derived(
    army
      ? army.detachments.flatMap((d) =>
          d.slots
            .map((s) => s.unit?.primeAdvantage)
            .filter((a): a is string => !!a),
        )
      : [],
  );

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
        <div class="army-meta">
          <span
            class="faction-tag"
            style="color: {FACTION_COLORS[army.faction] ?? '#5a7080'}; border-color: {FACTION_COLORS[army.faction] ?? '#5a7080'}55"
          >{army.faction}</span>
          {#if armyRules.length > 0}
            <span class="army-rules">
              {#each armyRules as rule (rule)}
                <button class="rule-link" onclick={() => libraryStore.openRule(rule)}>{rule}</button>
              {/each}
            </span>
          {/if}
        </div>
      </div>
      <div class="points-display">
        <span class="points-value">{totalPoints}</span>
        <span class="points-label">pts</span>
      </div>
      <button class="report-btn" onclick={onreport}>⚔ Battle Report</button>
    </div>

    <!-- Detachments -->
    <div class="detachments">
      {#each army.detachments as detachment, detIndex (detachment.type + detIndex)}
        <div class="detachment-wrapper">
          <DetachmentCard
            {detachment}
            {detIndex}
            faction={army.faction}
            {armyPrimeAdvantages}
            onassign={(slotId, unit) => assignUnit(detIndex, slotId, unit)}
            onclear={(slotId) => clearSlot(detIndex, slotId)}
            onrename={(slotId, nickname) => renameUnit(detIndex, slotId, nickname)}
            onprime={(slotId, advantage) => setPrimeAdvantage(detIndex, slotId, advantage)}
            onprimeorder={(slotId, order) => setPrimeOrder(detIndex, slotId, order)}
            onprimeslot={(slotId, isPrime) => setPrimeSlot(detIndex, slotId, isPrime)}
          />
          {#if detachment.type !== 'Crusade Primary'}
            <button class="remove-det-btn" onclick={() => removeDetachment(detIndex)}>
              − Remove {detachment.type} Detachment
            </button>
          {/if}
        </div>
      {/each}

      <div class="add-det-list">
        {#each addableDetachments as def (def.type)}
          <button class="add-det-btn" onclick={() => addDetachment(def.type)}>
            <span class="add-det-label">+ Add {def.type} Detachment</span>
            <span class="add-det-roles">{slotSummary(def)}</span>
          </button>
        {/each}
      </div>
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

  .report-btn {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    background: rgba(0, 200, 255, 0.06);
    border: 1px solid var(--color-accent-dim);
    color: var(--color-accent);
    padding: 0.45rem 0.9rem;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.12s, border-color 0.12s;
  }

  .report-btn:hover {
    background: rgba(0, 200, 255, 0.12);
    border-color: var(--color-accent);
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

  .army-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35rem 0.6rem;
  }

  .army-rules {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem 0.5rem;
  }

  .rule-link {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--color-accent);
    text-decoration: underline dotted;
    text-underline-offset: 2px;
    transition: color 0.12s;
  }

  .rule-link::before {
    content: '◈ ';
    color: var(--color-accent-dim);
    text-decoration: none;
  }

  .rule-link:hover {
    color: #fff;
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

  .add-det-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .add-det-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    font-family: 'Rajdhani', sans-serif;
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

  .add-det-label {
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .add-det-roles {
    font-size: 0.68rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    opacity: 0.7;
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
