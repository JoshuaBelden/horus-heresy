<script lang="ts">
  import type { DetachmentSlotType, SlottedUnit, UnitProfile, UnitOption, MeleeWeapon, RangedWeapon, ModelGroup } from '../data/types';
  import { units, meleeWeapons, rangedWeapons, weaponLists } from '../data';

  function findWeapon(name: string): MeleeWeapon | RangedWeapon | undefined {
    return meleeWeapons.find((w) => w.name === name) ?? rangedWeapons.find((w) => w.name === name);
  }

  function isMelee(w: MeleeWeapon | RangedWeapon): w is MeleeWeapon {
    return 'IM' in w;
  }

  // Expand weaponListNames into flat entries for a given option
  function resolveListEntries(opt: UnitOption): { weaponName: string; points: number }[] {
    if (!opt.weaponListNames) return [];
    return opt.weaponListNames.flatMap(
      (name) => weaponLists.find((l) => l.name === name)?.entries ?? []
    );
  }

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

  // When editing an existing unit, auto-advance to options with it pre-selected
  $effect(() => {
    if (currentUnit) {
      const profile = units.find((u) => u.name === currentUnit.unitName);
      if (profile) selectUnit(profile);
    }
  });

  // Unit-level choices (existing): optionIndex → choiceIndex
  let selectedChoices = $state<Record<number, number>>({});

  // Model-count options: optionIndex → count
  let modelCounts = $state<Record<number, number>>({});

  // Per-model group states: optionIndex → array of {count, choiceIndex | null}
  type GroupState = { count: number; choiceIndex: number | null };
  let modelGroupStates = $state<Record<number, GroupState[]>>({});

  const filteredUnits = $derived(
    eligibleUnits.filter((u) => {
      const q = search.toLowerCase().trim();
      return !q || u.name.toLowerCase().includes(q);
    }),
  );

  // Total model count for a given per-model option (base + additional)
  function totalModelCount(perModelOptIdx: number): number {
    if (!selectedProfile) return 0;
    const perModelOpt = selectedProfile.options[perModelOptIdx];
    const modelName = perModelOpt?.modelName;
    if (!modelName) return 0;
    const baseCount = selectedProfile.models.find((m) => m.name === modelName)?.count ?? 0;
    // Find corresponding model-count option
    const countOptIdx = selectedProfile.options.findIndex(
      (o) => o.appliesTo === 'model-count' && o.modelName === modelName
    );
    const additional = countOptIdx >= 0 ? (modelCounts[countOptIdx] ?? 0) : 0;
    return baseCount + additional;
  }

  const extraPoints = $derived(() => {
    if (!selectedProfile) return 0;
    let total = 0;

    // Unit-level choices
    for (const [i, c] of Object.entries(selectedChoices)) {
      const opt = selectedProfile.options[+i];
      if (!opt) continue;
      if (opt.weaponListNames) {
        const entries = resolveListEntries(opt);
        total += entries[c]?.points ?? 0;
      } else {
        total += opt.choices?.[c]?.points ?? 0;
      }
    }

    // Model-count
    for (const [i, count] of Object.entries(modelCounts)) {
      total += count * (selectedProfile.options[+i]?.pointsPerModel ?? 0);
    }

    // Per-model groups
    for (const [i, groups] of Object.entries(modelGroupStates)) {
      for (const g of groups) {
        if (g.choiceIndex === null) continue;
        const choice = selectedProfile.options[+i]?.choices?.[g.choiceIndex];
        total += g.count * (choice?.pointsPerModel ?? 0);
      }
    }

    return total;
  });

  const totalPoints = $derived(
    selectedProfile ? selectedProfile.points + extraPoints() : 0,
  );

  function initModelGroups(profile: UnitProfile) {
    const gs: Record<number, GroupState[]> = {};
    profile.options.forEach((opt, idx) => {
      if (opt.appliesTo === 'per-model' && opt.modelName) {
        const baseCount = profile.models.find((m) => m.name === opt.modelName)?.count ?? 0;
        gs[idx] = [{ count: baseCount, choiceIndex: null }];
      }
    });
    return gs;
  }

  function selectUnit(profile: UnitProfile) {
    selectedProfile = profile;

    if (currentUnit && currentUnit.unitName === profile.name) {
      // Restore unit-level choices
      const choicesMap: Record<number, number> = {};
      const countsMap: Record<number, number> = {};
      for (const sc of currentUnit.selectedChoices) {
        const opt = profile.options[sc.optionIndex];
        if (opt?.appliesTo === 'model-count') {
          countsMap[sc.optionIndex] = sc.count ?? 0;
        } else {
          choicesMap[sc.optionIndex] = sc.choiceIndex;
        }
      }
      selectedChoices = choicesMap;
      modelCounts = countsMap;

      // Restore model groups
      const gs: Record<number, GroupState[]> = initModelGroups(profile);
      for (const group of currentUnit.modelGroups ?? []) {
        const opt = profile.options[group.optionIndex];
        if (opt?.appliesTo === 'per-model') {
          // Replace initialized defaults with saved groups
          if (!gs[group.optionIndex] || gs[group.optionIndex].length === 1 && gs[group.optionIndex][0].choiceIndex === null) {
            gs[group.optionIndex] = [];
          }
          gs[group.optionIndex].push({ count: group.count, choiceIndex: group.choiceIndex });
        }
      }
      modelGroupStates = gs;
    } else {
      selectedChoices = {};
      modelCounts = {};
      modelGroupStates = initModelGroups(profile);
    }

    step = 'options';
  }

  function goBack() {
    step = 'pick';
    selectedProfile = null;
    selectedChoices = {};
    modelCounts = {};
    modelGroupStates = {};
  }

  function confirm() {
    if (!selectedProfile) return;

    const choices = [
      ...Object.entries(selectedChoices).map(([i, c]) => ({
        optionIndex: +i,
        choiceIndex: c,
      })),
      ...Object.entries(modelCounts)
        .filter(([, c]) => c > 0)
        .map(([i, c]) => ({
          optionIndex: +i,
          choiceIndex: 0,
          count: c,
        })),
    ];

    const groups: ModelGroup[] = Object.entries(modelGroupStates).flatMap(([optIdx, gs]) =>
      gs.map((g) => ({ optionIndex: +optIdx, count: g.count, choiceIndex: g.choiceIndex }))
    );

    onassign({ unitName: selectedProfile.name, selectedChoices: choices, modelGroups: groups });
  }

  function toggleChoice(optionIndex: number, choiceIndex: number) {
    const current = selectedChoices[optionIndex];
    if (current === choiceIndex) {
      const next = { ...selectedChoices };
      delete next[optionIndex];
      selectedChoices = next;
    } else {
      selectedChoices = { ...selectedChoices, [optionIndex]: choiceIndex };
    }
  }

  function setModelCount(optionIndex: number, delta: number) {
    if (!selectedProfile) return;
    const opt = selectedProfile.options[optionIndex];
    const max = opt?.max ?? 0;
    const current = modelCounts[optionIndex] ?? 0;
    const next = Math.max(0, Math.min(max, current + delta));
    modelCounts = { ...modelCounts, [optionIndex]: next };

    // Update size of per-model groups for same modelName
    const modelName = opt?.modelName;
    if (!modelName) return;
    const perModelOptIdx = selectedProfile.options.findIndex(
      (o) => o.appliesTo === 'per-model' && o.modelName === modelName
    );
    if (perModelOptIdx < 0) return;

    // Recalculate total and adjust last group count
    const total = totalModelCount(perModelOptIdx);
    const groups = modelGroupStates[perModelOptIdx];
    if (!groups || groups.length === 0) return;
    const sumExceptLast = groups.slice(0, -1).reduce((s, g) => s + g.count, 0);
    const lastCount = Math.max(0, total - sumExceptLast);
    modelGroupStates = {
      ...modelGroupStates,
      [perModelOptIdx]: [...groups.slice(0, -1), { ...groups[groups.length - 1], count: lastCount }],
    };
  }

  function setGroupChoice(optionIndex: number, groupIdx: number, choiceIndex: number | null) {
    const groups = [...(modelGroupStates[optionIndex] ?? [])];
    groups[groupIdx] = { ...groups[groupIdx], choiceIndex };
    modelGroupStates = { ...modelGroupStates, [optionIndex]: groups };
  }

  function splitGroup(optionIndex: number, groupIdx: number) {
    const groups = [...(modelGroupStates[optionIndex] ?? [])];
    const g = groups[groupIdx];
    if (g.count < 2) return;
    const half = Math.floor(g.count / 2);
    groups.splice(groupIdx, 1,
      { count: half, choiceIndex: g.choiceIndex },
      { count: g.count - half, choiceIndex: null },
    );
    modelGroupStates = { ...modelGroupStates, [optionIndex]: groups };
  }

  function removeGroup(optionIndex: number, groupIdx: number) {
    const groups = [...(modelGroupStates[optionIndex] ?? [])];
    if (groups.length <= 1) return;
    const removed = groups.splice(groupIdx, 1)[0];
    // Add removed count to last remaining group
    groups[groups.length - 1] = { ...groups[groups.length - 1], count: groups[groups.length - 1].count + removed.count };
    modelGroupStates = { ...modelGroupStates, [optionIndex]: groups };
  }

  function setGroupCount(optionIndex: number, groupIdx: number, newCount: number) {
    const groups = [...(modelGroupStates[optionIndex] ?? [])];
    if (groups.length <= 1) return; // single group count is fixed to totalModelCount
    const total = totalModelCount(optionIndex);
    const clamped = Math.max(1, Math.min(newCount, total - groups.length + 1));
    const delta = clamped - groups[groupIdx].count;
    // Apply delta to adjacent group
    const otherIdx = groupIdx === groups.length - 1 ? groupIdx - 1 : groupIdx + 1;
    const otherNew = groups[otherIdx].count - delta;
    if (otherNew < 1) return;
    groups[groupIdx] = { ...groups[groupIdx], count: clamped };
    groups[otherIdx] = { ...groups[otherIdx], count: otherNew };
    modelGroupStates = { ...modelGroupStates, [optionIndex]: groups };
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
      'War-Engine': '#cc4400',
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

                <!-- MODEL-COUNT: stepper -->
                {#if option.appliesTo === 'model-count'}
                  {@const count = modelCounts[optIdx] ?? 0}
                  {@const pts = count * (option.pointsPerModel ?? 0)}
                  <div class="model-count-row">
                    <button class="stepper-btn" onclick={() => setModelCount(optIdx, -1)} disabled={count <= 0}>−</button>
                    <span class="stepper-val">{count}</span>
                    <button class="stepper-btn" onclick={() => setModelCount(optIdx, 1)} disabled={count >= (option.max ?? 0)}>+</button>
                    <span class="stepper-pts">{pts > 0 ? `+${pts} pts` : 'Free'}</span>
                  </div>

                <!-- PER-MODEL: model groups -->
                {:else if option.appliesTo === 'per-model' && option.choices}
                  {@const groups = modelGroupStates[optIdx] ?? []}
                  {@const total = totalModelCount(optIdx)}
                  <div class="group-list">
                    {#each groups as group, gIdx}
                      <div class="group-row">
                        <div class="group-header">
                          {#if groups.length > 1}
                            <input
                              class="group-count-input"
                              type="number"
                              min="1"
                              max={total - groups.length + 1}
                              value={group.count}
                              oninput={(e) => setGroupCount(optIdx, gIdx, +(e.target as HTMLInputElement).value)}
                            />
                          {:else}
                            <span class="group-count">{total}</span>
                          {/if}
                          <span class="group-model-name">× {option.modelName}</span>
                          <div class="group-actions">
                            {#if group.count >= 2}
                              <button class="split-btn" onclick={() => splitGroup(optIdx, gIdx)}>Split</button>
                            {/if}
                            {#if groups.length > 1}
                              <button class="remove-btn" onclick={() => removeGroup(optIdx, gIdx)}>×</button>
                            {/if}
                          </div>
                        </div>
                        <div class="choice-list">
                          <button
                            class="choice-btn"
                            class:selected={group.choiceIndex === null}
                            onclick={() => setGroupChoice(optIdx, gIdx, null)}
                          >
                            <div class="choice-main">
                              <span class="choice-radio">{group.choiceIndex === null ? '◉' : '○'}</span>
                              <span class="choice-desc">No upgrade</span>
                              <span class="choice-cost">Free</span>
                            </div>
                          </button>
                          {#each option.choices as choice, choiceIdx}
                            {@const isSelected = group.choiceIndex === choiceIdx}
                            {@const weapon = choice.weaponName ? findWeapon(choice.weaponName) : undefined}
                            <button
                              class="choice-btn"
                              class:selected={isSelected}
                              onclick={() => setGroupChoice(optIdx, gIdx, choiceIdx)}
                            >
                              <div class="choice-main">
                                <span class="choice-radio">{isSelected ? '◉' : '○'}</span>
                                <span class="choice-desc">{choice.description}</span>
                                <span class="choice-cost">
                                  {#if choice.pointsPerModel !== undefined && choice.pointsPerModel !== 0}
                                    +{choice.pointsPerModel} pts/model
                                  {:else}
                                    Free
                                  {/if}
                                </span>
                              </div>
                              {#if weapon}
                                <div class="weapon-stats">
                                  {#if isMelee(weapon)}
                                    <span class="ws-cell ws-header">IM</span>
                                    <span class="ws-cell ws-header">AM</span>
                                    <span class="ws-cell ws-header">SM</span>
                                    <span class="ws-cell ws-header">AP</span>
                                    <span class="ws-cell ws-header">D</span>
                                    <span class="ws-cell">{weapon.IM}</span>
                                    <span class="ws-cell">{weapon.AM}</span>
                                    <span class="ws-cell">{weapon.SM}</span>
                                    <span class="ws-cell">{weapon.AP}</span>
                                    <span class="ws-cell">{weapon.D}</span>
                                  {:else}
                                    <span class="ws-cell ws-header">R</span>
                                    <span class="ws-cell ws-header">FP</span>
                                    <span class="ws-cell ws-header">RS</span>
                                    <span class="ws-cell ws-header">AP</span>
                                    <span class="ws-cell ws-header">D</span>
                                    <span class="ws-cell">{weapon.R}</span>
                                    <span class="ws-cell">{weapon.FP}</span>
                                    <span class="ws-cell">{(weapon as import('../data/types').RangedWeapon).RS}</span>
                                    <span class="ws-cell">{weapon.AP}</span>
                                    <span class="ws-cell">{weapon.D}</span>
                                  {/if}
                                  {#if weapon.specialRules.length > 0}
                                    <span class="ws-rules">{weapon.specialRules.join(', ')}</span>
                                  {/if}
                                </div>
                              {/if}
                            </button>
                          {/each}
                        </div>
                      </div>
                    {/each}
                  </div>

                <!-- WEAPON LIST choices -->
                {:else if option.weaponListNames}
                  {@const entries = resolveListEntries(option)}
                  <div class="choice-list">
                    {#each entries as entry, entryIdx}
                      {@const isSelected = selectedChoices[optIdx] === entryIdx}
                      {@const weapon = findWeapon(entry.weaponName)}
                      <button
                        class="choice-btn"
                        class:selected={isSelected}
                        onclick={() => toggleChoice(optIdx, entryIdx)}
                      >
                        <div class="choice-main">
                          <span class="choice-radio">{isSelected ? '◉' : '○'}</span>
                          <span class="choice-desc">{entry.weaponName}</span>
                          <span class="choice-cost">
                            {#if entry.points !== 0}
                              +{entry.points} pts
                            {:else}
                              Free
                            {/if}
                          </span>
                        </div>
                        {#if weapon}
                          <div class="weapon-stats">
                            {#if isMelee(weapon)}
                              <span class="ws-cell ws-header">IM</span>
                              <span class="ws-cell ws-header">AM</span>
                              <span class="ws-cell ws-header">SM</span>
                              <span class="ws-cell ws-header">AP</span>
                              <span class="ws-cell ws-header">D</span>
                              <span class="ws-cell">{weapon.IM}</span>
                              <span class="ws-cell">{weapon.AM}</span>
                              <span class="ws-cell">{weapon.SM}</span>
                              <span class="ws-cell">{weapon.AP}</span>
                              <span class="ws-cell">{weapon.D}</span>
                            {:else}
                              <span class="ws-cell ws-header">R</span>
                              <span class="ws-cell ws-header">FP</span>
                              <span class="ws-cell ws-header">RS</span>
                              <span class="ws-cell ws-header">AP</span>
                              <span class="ws-cell ws-header">D</span>
                              <span class="ws-cell">{weapon.R}</span>
                              <span class="ws-cell">{weapon.FP}</span>
                              <span class="ws-cell">{(weapon as import('../data/types').RangedWeapon).RS}</span>
                              <span class="ws-cell">{weapon.AP}</span>
                              <span class="ws-cell">{weapon.D}</span>
                            {/if}
                            {#if weapon.specialRules.length > 0}
                              <span class="ws-rules">{weapon.specialRules.join(', ')}</span>
                            {/if}
                          </div>
                        {/if}
                      </button>
                    {/each}
                  </div>

                <!-- EXPLICIT choices (existing) -->
                {:else if option.choices && option.choices.length > 0}
                  <div class="choice-list">
                    {#each option.choices as choice, choiceIdx}
                      {@const isSelected = selectedChoices[optIdx] === choiceIdx}
                      {@const weapon = choice.weaponName ? findWeapon(choice.weaponName) : undefined}
                      <button
                        class="choice-btn"
                        class:selected={isSelected}
                        onclick={() => toggleChoice(optIdx, choiceIdx)}
                      >
                        <div class="choice-main">
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
                        </div>
                        {#if weapon}
                          <div class="weapon-stats">
                            {#if isMelee(weapon)}
                              <span class="ws-cell ws-header">IM</span>
                              <span class="ws-cell ws-header">AM</span>
                              <span class="ws-cell ws-header">SM</span>
                              <span class="ws-cell ws-header">AP</span>
                              <span class="ws-cell ws-header">D</span>
                              <span class="ws-cell">{weapon.IM}</span>
                              <span class="ws-cell">{weapon.AM}</span>
                              <span class="ws-cell">{weapon.SM}</span>
                              <span class="ws-cell">{weapon.AP}</span>
                              <span class="ws-cell">{weapon.D}</span>
                            {:else}
                              <span class="ws-cell ws-header">R</span>
                              <span class="ws-cell ws-header">FP</span>
                              <span class="ws-cell ws-header">RS</span>
                              <span class="ws-cell ws-header">AP</span>
                              <span class="ws-cell ws-header">D</span>
                              <span class="ws-cell">{weapon.R}</span>
                              <span class="ws-cell">{weapon.FP}</span>
                              <span class="ws-cell">{(weapon as import('../data/types').RangedWeapon).RS}</span>
                              <span class="ws-cell">{weapon.AP}</span>
                              <span class="ws-cell">{weapon.D}</span>
                            {/if}
                            {#if weapon.specialRules.length > 0}
                              <span class="ws-rules">{weapon.specialRules.join(', ')}</span>
                            {/if}
                          </div>
                        {/if}
                      </button>
                    {/each}
                  </div>
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

  /* ── Model Count Stepper ─────────────────────── */
  .model-count-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.4rem 0;
  }

  .stepper-btn {
    width: 28px;
    height: 28px;
    background: none;
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.1s, color 0.1s;
    flex-shrink: 0;
  }

  .stepper-btn:hover:not(:disabled) {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .stepper-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .stepper-val {
    font-family: 'Orbitron', monospace;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-text);
    min-width: 24px;
    text-align: center;
  }

  .stepper-pts {
    font-family: 'Orbitron', monospace;
    font-size: 0.72rem;
    color: var(--color-gold);
    margin-left: 0.3rem;
  }

  /* ── Per-model Groups ────────────────────────── */
  .group-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .group-row {
    border: 1px solid var(--color-border);
    background: var(--color-bg);
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.6rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-surface);
  }

  .group-count {
    font-family: 'Orbitron', monospace;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-accent);
    min-width: 24px;
    text-align: center;
  }

  .group-count-input {
    width: 44px;
    background: var(--color-bg-raised);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font-family: 'Orbitron', monospace;
    font-size: 0.78rem;
    font-weight: 700;
    text-align: center;
    padding: 0.2rem 0.3rem;
    outline: none;
  }

  .group-model-name {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
    flex: 1;
  }

  .group-actions {
    display: flex;
    gap: 0.3rem;
  }

  .split-btn {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: none;
    border: 1px solid var(--color-border);
    color: var(--color-accent);
    padding: 0.1rem 0.45rem;
    cursor: pointer;
    transition: border-color 0.1s, background 0.1s;
  }

  .split-btn:hover {
    border-color: var(--color-accent);
    background: rgba(0, 200, 255, 0.08);
  }

  .remove-btn {
    background: none;
    border: 1px solid transparent;
    color: var(--color-text-muted);
    font-size: 0.9rem;
    line-height: 1;
    padding: 0.1rem 0.3rem;
    cursor: pointer;
    transition: color 0.1s, border-color 0.1s;
  }

  .remove-btn:hover {
    color: var(--color-danger);
    border-color: var(--color-danger);
  }

  /* ── Choice list ─────────────────────────────── */
  .choice-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .choice-btn {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    width: 100%;
    background: none;
    border: 1px solid var(--color-border);
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.1s, background 0.1s;
  }

  .choice-main {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
  }

  .weapon-stats {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0;
    margin-left: 1.5rem;
    border: 1px solid var(--color-border);
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.68rem;
  }

  .ws-cell {
    padding: 0.2rem 0.35rem;
    text-align: center;
    color: var(--color-text);
    border-right: 1px solid var(--color-border);
  }

  .ws-cell:last-of-type {
    border-right: none;
  }

  .ws-header {
    color: var(--color-text-muted);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
  }

  .ws-rules {
    grid-column: 1 / -1;
    padding: 0.2rem 0.35rem;
    color: var(--color-text-muted);
    font-size: 0.62rem;
    font-style: italic;
    border-top: 1px solid var(--color-border);
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
