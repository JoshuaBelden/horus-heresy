<script lang="ts">
  import type {
    ArmyDetachment,
    SlottedUnit,
    DetachmentSlot,
    DetachmentSlotType,
    Faction,
  } from '../data/types';
  import {
    units,
    weaponLists,
    availablePrimeAdvantages,
    primeAdvantages,
    HEKATONYSTIKA_ORDERS,
    ORDER_EXEMPLAR_ADVANTAGES,
  } from '../data';
  import { calcSlottedUnitPoints, resolveUnitProfile, primeQuota } from '../stores/armies.svelte';
  import { libraryStore } from '../stores/library.svelte';
  import UnitPickerModal from './UnitPickerModal.svelte';

  const {
    detachment,
    detIndex,
    faction,
    armyPrimeAdvantages,
    onassign,
    onclear,
    onrename,
    onprime,
    onprimeorder,
    onprimeslot,
  }: {
    detachment: ArmyDetachment;
    detIndex: number;
    faction: Faction;
    // Prime Advantage names selected anywhere in the army (for once-per-army limits).
    armyPrimeAdvantages: string[];
    onassign: (slotId: string, unit: SlottedUnit) => void;
    onclear: (slotId: string) => void;
    onrename: (slotId: string, nickname: string | undefined) => void;
    onprime: (slotId: string, advantage: string | undefined) => void;
    onprimeorder: (slotId: string, order: string | undefined) => void;
    onprimeslot: (slotId: string, isPrime: boolean) => void;
  } = $props();

  // Per-role Prime Slot quota for this detachment. The player designates which
  // filled slots are Prime (up to the quota; may designate none).
  const quota = $derived(primeQuota(detachment.type));
  const isPrime = (slot: DetachmentSlot) => !!slot.prime;
  const primeEligible = (slot: DetachmentSlot) => (quota[slot.slotType] ?? 0) > 0;
  function designatedCount(role: DetachmentSlotType): number {
    return detachment.slots.filter((s) => s.slotType === role && s.prime).length;
  }
  // A filled, prime-eligible slot may be toggled if already Prime, or if the
  // role's quota isn't yet exhausted by other slots.
  function canTogglePrime(slot: DetachmentSlot): boolean {
    if (!slot.unit || !primeEligible(slot)) return false;
    return !!slot.prime || designatedCount(slot.slotType) < (quota[slot.slotType] ?? 0);
  }

  // Prime Advantages selectable for a filled Prime Slot, applying rulebook limits.
  function primeOptionsFor(slot: DetachmentSlot) {
    if (!isPrime(slot) || !slot.unit) return [];
    const profile = units.find((u) => u.name === slot.unit!.unitName);
    const hasUnique = !!profile?.models.some((m) =>
      m.subtypes?.includes('Unique'),
    );
    const usedInDetachment = detachment.slots
      .filter((s) => s.id !== slot.id && s.unit?.primeAdvantage)
      .map((s) => s.unit!.primeAdvantage!);
    // Exclude this slot's own current pick so re-selecting it stays valid.
    const usedInArmy = [...armyPrimeAdvantages];
    const own = slot.unit.primeAdvantage;
    if (own) {
      const idx = usedInArmy.indexOf(own);
      if (idx >= 0) usedInArmy.splice(idx, 1);
    }
    return availablePrimeAdvantages({
      slotType: slot.slotType,
      unit: profile,
      hasUnique,
      faction,
      usedInDetachment,
      usedInArmy,
    });
  }

  let pickerSlotId = $state<string | null>(null);
  let pickerSlotType = $state<DetachmentSlotType | null>(null);
  let pickerCurrentUnit = $state<SlottedUnit | null>(null);
  let expandedSlotId = $state<string | null>(null);
  let collapsed = $state(false);

  // Double-click a filled slot's name to rename it; blank reverts to unit name.
  let editingSlotId = $state<string | null>(null);
  let editValue = $state('');

  function startEdit(slot: { id: string; unit: SlottedUnit | null }) {
    if (!slot.unit) return;
    editingSlotId = slot.id;
    editValue = slot.unit.nickname ?? '';
  }

  function commitEdit() {
    if (editingSlotId === null) return;
    const trimmed = editValue.trim();
    onrename(editingSlotId, trimmed === '' ? undefined : trimmed);
    editingSlotId = null;
  }

  function cancelEdit() {
    editingSlotId = null;
  }

  function focusSelect(node: HTMLInputElement) {
    node.focus();
    node.select();
  }

  const detachmentPoints = $derived(
    detachment.slots.reduce(
      (sum, s) => sum + (s.unit ? calcSlottedUnitPoints(s.unit, faction) : 0),
      0,
    ),
  );

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
      'Lord of War': '#c9933a',
      Support: '#00b8a0',
      Armour: '#7a8aa0',
      Recon: '#a0c060',
      'Heavy Assault': '#e0703a',
      'Fast Attack': '#ffb020',
      Elites: '#b060d0',
    };
    return map[slotType] ?? '#5a7080';
  }

  function getUnitPoints(unit: SlottedUnit): number {
    return calcSlottedUnitPoints(unit, faction);
  }

  function getExpandedData(unit: SlottedUnit) {
    const profile = resolveUnitProfile(unit.unitName, faction);
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
  <button
    class="det-header"
    onclick={() => (collapsed = !collapsed)}
    aria-expanded={!collapsed}
  >
    <span class="det-type">
      <span class="det-chevron">{collapsed ? '▸' : '▾'}</span>
      {detachment.type} Detachment
    </span>
    <div class="det-header-right">
      <span class="det-slot-count">
        {detachment.slots.filter((s) => s.unit !== null).length}/{detachment.slots.length} filled
      </span>
      <span class="det-pts">{detachmentPoints} pts</span>
    </div>
  </button>

  {#if !collapsed}
  <div class="slot-list">
    {#each detachment.slots as slot (slot.id)}
      {@const color = getSlotColor(slot.slotType)}
      <div class="slot-row" class:filled={slot.unit !== null} class:expanded={expandedSlotId === slot.id} class:prime={isPrime(slot)}>
        {#if isPrime(slot)}
          <span class="prime-star" title="Prime Slot — fill it to select a Prime Advantage">◈</span>
        {/if}
        <span class="slot-badge" style="color: {color}; border-color: {color}44">
          {slot.slotType}
        </span>

        {#if slot.unit}
          {#if editingSlotId === slot.id}
            <input
              class="slot-name-input"
              bind:value={editValue}
              placeholder={slot.unit.unitName}
              use:focusSelect
              onblur={commitEdit}
              onkeydown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
              }}
            />
          {:else}
            <button
              class="slot-unit-btn"
              onclick={() => toggleExpand(slot.id)}
              ondblclick={() => startEdit(slot)}
              aria-expanded={expandedSlotId === slot.id}
              title="Double-click to rename"
            >
              <span class="chevron">{expandedSlotId === slot.id ? '▾' : '▸'}</span>
              {#if slot.unit.nickname}
                <span class="slot-nickname">{slot.unit.nickname}</span>
                <span class="slot-unit-sub">{slot.unit.unitName}</span>
              {:else}
                {slot.unit.unitName}
              {/if}
            </button>
          {/if}
          {#if isPrime(slot) && slot.unit.primeAdvantage}
            {@const adv = slot.unit.primeAdvantage}
            <button
              class="prime-adv-tag"
              onclick={() => libraryStore.openRule(adv)}
              title="View Prime Advantage rule"
            >◈ {adv}</button>
          {/if}
          <span class="slot-pts">{getUnitPoints(slot.unit)} pts</span>
          {#if primeEligible(slot)}
            <button
              class="slot-prime-btn"
              class:active={isPrime(slot)}
              disabled={!canTogglePrime(slot)}
              onclick={() => { onprimeslot(slot.id, !slot.prime); if (!slot.prime) expandedSlotId = slot.id; }}
              title={isPrime(slot)
                ? 'Prime Slot — click to unset'
                : canTogglePrime(slot)
                  ? 'Designate as Prime Slot'
                  : `Prime ${slot.slotType} limit reached (${quota[slot.slotType]})`}
              aria-label="Toggle Prime Slot"
              aria-pressed={isPrime(slot)}
            >◈</button>
          {/if}
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

          {#if isPrime(slot)}
            {@const primeOpts = primeOptionsFor(slot)}
            <div class="expansion-prime">
              <span class="options-label">◈ Prime Advantage</span>
              <select
                class="prime-select"
                value={slot.unit.primeAdvantage ?? ''}
                onchange={(e) =>
                  onprime(slot.id, e.currentTarget.value || undefined)}
              >
                <option value="">— None —</option>
                {#each primeOpts as adv (adv.name)}
                  <option value={adv.name}>{adv.name}</option>
                {/each}
                {#if slot.unit.primeAdvantage && !primeOpts.some((a) => a.name === slot.unit?.primeAdvantage)}
                  <option value={slot.unit.primeAdvantage}
                    >{slot.unit.primeAdvantage}</option
                  >
                {/if}
              </select>
              {#if slot.unit.primeAdvantage}
                {@const adv = slot.unit.primeAdvantage}
                <p class="prime-summary">
                  {primeAdvantages.find((a) => a.name === adv)?.summary ?? ''}
                  <button class="rule-link" onclick={() => libraryStore.openRule(adv)}
                    >View rule ◈</button
                  >
                </p>
                {#if ORDER_EXEMPLAR_ADVANTAGES.includes(adv)}
                  <span class="options-label">Order of the Hekatonystika</span>
                  <select
                    class="prime-select"
                    value={slot.unit.primeOrder ?? ''}
                    onchange={(e) =>
                      onprimeorder(slot.id, e.currentTarget.value || undefined)}
                  >
                    <option value="">— Select an Order —</option>
                    {#each HEKATONYSTIKA_ORDERS as order (order)}
                      <option value={order}>{order}</option>
                    {/each}
                  </select>
                  <p class="prime-summary">
                    <button
                      class="rule-link"
                      onclick={() => libraryStore.openRule('Orders of the Hekatonystika')}
                      >View Orders ◈</button
                    >
                  </p>
                {/if}
              {/if}
            </div>
          {/if}

        </div>
      {/if}
    {/each}
  </div>
  {/if}
</div>

{#if pickerSlotId !== null && pickerSlotType !== null}
  <UnitPickerModal
    slotType={pickerSlotType}
    currentUnit={pickerCurrentUnit}
    {faction}
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
    gap: 0.9rem;
    width: 100%;
    padding: 0.9rem 1.5rem;
    background: var(--color-bg-surface);
    border: none;
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
  }

  .det-header:hover {
    background: rgba(0, 200, 255, 0.05);
  }

  .det-type {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'Orbitron', monospace;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-accent);
  }

  .det-chevron {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .det-header-right {
    display: flex;
    align-items: baseline;
    gap: 0.9rem;
  }

  .det-slot-count {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
  }

  .det-pts {
    font-family: 'Orbitron', monospace;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--color-gold);
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

  .slot-nickname {
    color: var(--color-text);
  }

  .slot-unit-sub {
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
    opacity: 0.75;
  }

  .slot-name-input {
    flex: 1;
    min-width: 0;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-accent-dim);
    color: var(--color-text);
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.92rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 0.3rem 0.5rem;
    outline: none;
  }

  .slot-name-input:focus {
    border-color: var(--color-accent);
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

  .slot-prime-btn {
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

  .slot-prime-btn:hover:not(:disabled) {
    color: var(--color-gold);
    border-color: var(--color-gold-dim);
  }

  .slot-prime-btn.active {
    color: var(--color-gold);
    border-color: var(--color-gold-dim);
    background: rgba(201, 147, 58, 0.1);
    text-shadow: 0 0 8px rgba(201, 147, 58, 0.5);
  }

  .slot-prime-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
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

  /* ── Prime Slots ─────────────────────────────── */
  .prime-star {
    color: var(--color-gold);
    font-size: 0.8rem;
    flex-shrink: 0;
    text-shadow: 0 0 8px rgba(201, 147, 58, 0.5);
  }

  .slot-row.prime {
    background: rgba(201, 147, 58, 0.04);
  }

  .prime-adv-tag {
    background: rgba(201, 147, 58, 0.1);
    border: 1px solid var(--color-gold-dim);
    color: var(--color-gold);
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    padding: 0.1rem 0.4rem;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.12s;
  }

  .prime-adv-tag:hover {
    background: rgba(201, 147, 58, 0.2);
  }

  .expansion-prime {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding-top: 0.35rem;
    border-top: 1px solid var(--color-border);
  }

  .prime-select {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-gold-dim);
    color: var(--color-text);
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.8rem;
    padding: 0.3rem 0.5rem;
    width: fit-content;
    min-width: 14rem;
    cursor: pointer;
  }

  .prime-summary {
    margin: 0;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.76rem;
    color: var(--color-text-muted);
    line-height: 1.4;
  }

  .rule-link {
    background: none;
    border: none;
    padding: 0;
    margin-left: 0.4rem;
    cursor: pointer;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-accent);
    text-decoration: underline dotted;
    text-underline-offset: 2px;
  }

  .rule-link:hover {
    color: #fff;
  }
</style>
