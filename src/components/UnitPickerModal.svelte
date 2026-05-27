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

  // ── Picker state ────────────────────────────────────────────────────────
  const UNIT_SECTION = '__unit__';

  // Unit-level option choices: optionIndex → choiceIndex
  let unitChoices = $state<Record<number, number>>({});

  // Model-count options: optionIndex → number of *added* models
  let modelCounts = $state<Record<number, number>>({});

  // Per-model loadout subgroups, keyed by model name. Each subgroup has a count
  // and one choice per applicable per-model option (null = no upgrade).
  type Subgroup = { count: number; choices: Record<number, number | null> };
  let subgroups = $state<Record<string, Subgroup[]>>({});

  // Which collapsible sections are expanded (collapsed by default).
  let expanded = $state<Record<string, boolean>>({});

  const filteredUnits = $derived(
    eligibleUnits.filter((u) => {
      const q = search.toLowerCase().trim();
      return !q || u.name.toLowerCase().includes(q);
    }),
  );

  // ── Section model derived from the profile ──────────────────────────────
  type ModelSection = {
    modelName: string;
    baseCount: number;
    countOptIdx: number | null;
    perModelOptIdxs: number[];
  };

  function perModelOptionsFor(profile: UnitProfile, modelName: string): number[] {
    return profile.options
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => o.appliesTo === 'per-model' && o.modelName === modelName)
      .map(({ i }) => i);
  }

  const modelSections = $derived<ModelSection[]>(
    selectedProfile
      ? selectedProfile.models
          .map((m) => {
            const countOptIdx = selectedProfile!.options.findIndex(
              (o) => o.appliesTo === 'model-count' && o.modelName === m.name
            );
            return {
              modelName: m.name,
              baseCount: m.count ?? 1,
              countOptIdx: countOptIdx >= 0 ? countOptIdx : null,
              perModelOptIdxs: perModelOptionsFor(selectedProfile!, m.name),
            };
          })
          .filter((s) => s.countOptIdx !== null || s.perModelOptIdxs.length > 0)
      : []
  );

  // Unit-wide options (not tied to a model): Vexilla, Nuncio-vox, etc.
  const unitOptIdxs = $derived<number[]>(
    selectedProfile
      ? selectedProfile.options
          .map((o, i) => ({ o, i }))
          .filter(({ o }) => o.appliesTo !== 'model-count' && o.appliesTo !== 'per-model')
          .map(({ i }) => i)
      : []
  );

  function totalCount(modelName: string): number {
    const section = modelSections.find((s) => s.modelName === modelName);
    if (!section) return 0;
    const added = section.countOptIdx !== null ? (modelCounts[section.countOptIdx] ?? 0) : 0;
    return section.baseCount + added;
  }

  const extraPoints = $derived(() => {
    if (!selectedProfile) return 0;
    let total = 0;

    // Unit-level option choices
    for (const [i, c] of Object.entries(unitChoices)) {
      const opt = selectedProfile.options[+i];
      if (!opt) continue;
      if (opt.weaponListNames) {
        total += resolveListEntries(opt)[c]?.points ?? 0;
      } else {
        total += opt.choices?.[c]?.points ?? 0;
      }
    }

    // Added models
    for (const [i, count] of Object.entries(modelCounts)) {
      total += count * (selectedProfile.options[+i]?.pointsPerModel ?? 0);
    }

    // Per-model subgroup loadouts
    for (const sgs of Object.values(subgroups)) {
      for (const sg of sgs) {
        for (const [optIdx, ci] of Object.entries(sg.choices)) {
          if (ci === null) continue;
          const choice = selectedProfile.options[+optIdx]?.choices?.[ci];
          total += sg.count * (choice?.pointsPerModel ?? 0);
        }
      }
    }

    return total;
  });

  const totalPoints = $derived(
    selectedProfile ? selectedProfile.points + extraPoints() : 0,
  );

  function initSubgroups(profile: UnitProfile): Record<string, Subgroup[]> {
    const result: Record<string, Subgroup[]> = {};
    for (const m of profile.models) {
      const optIdxs = perModelOptionsFor(profile, m.name);
      if (optIdxs.length === 0) continue;
      const choices: Record<number, number | null> = {};
      for (const idx of optIdxs) choices[idx] = null;
      result[m.name] = [{ count: m.count ?? 1, choices }];
    }
    return result;
  }

  // Reconstruct subgroups from a flat ModelGroup[] (the saved shape). The picker
  // always writes parallel groups per model, so the i-th group of each option
  // belongs to the i-th subgroup.
  function restoreSubgroups(profile: UnitProfile, groups: ModelGroup[]): Record<string, Subgroup[]> {
    const fresh = initSubgroups(profile);
    const result: Record<string, Subgroup[]> = {};
    for (const m of profile.models) {
      const optIdxs = perModelOptionsFor(profile, m.name);
      if (optIdxs.length === 0) continue;

      const byOpt: Record<number, ModelGroup[]> = {};
      for (const idx of optIdxs) byOpt[idx] = groups.filter((g) => g.optionIndex === idx);
      const subCount = Math.max(0, ...optIdxs.map((idx) => byOpt[idx].length));
      if (subCount === 0) {
        result[m.name] = fresh[m.name];
        continue;
      }

      const subs: Subgroup[] = [];
      for (let i = 0; i < subCount; i++) {
        const choices: Record<number, number | null> = {};
        let count = m.count ?? 1;
        for (const idx of optIdxs) {
          const g = byOpt[idx][i];
          choices[idx] = g ? g.choiceIndex : null;
          if (g) count = g.count;
        }
        subs.push({ count, choices });
      }
      result[m.name] = subs;
    }
    return result;
  }

  function selectUnit(profile: UnitProfile) {
    selectedProfile = profile;
    expanded = {};

    if (currentUnit && currentUnit.unitName === profile.name) {
      const choicesMap: Record<number, number> = {};
      const countsMap: Record<number, number> = {};
      for (const sc of currentUnit.selectedChoices) {
        const opt = profile.options[sc.optionIndex];
        if (opt?.appliesTo === 'model-count') countsMap[sc.optionIndex] = sc.count ?? 0;
        else choicesMap[sc.optionIndex] = sc.choiceIndex;
      }
      unitChoices = choicesMap;
      modelCounts = countsMap;
      subgroups = restoreSubgroups(profile, currentUnit.modelGroups ?? []);
    } else {
      unitChoices = {};
      modelCounts = {};
      subgroups = initSubgroups(profile);
    }

    step = 'options';
  }

  function goBack() {
    step = 'pick';
    selectedProfile = null;
    unitChoices = {};
    modelCounts = {};
    subgroups = {};
    expanded = {};
  }

  function confirm() {
    if (!selectedProfile) return;

    const choices = [
      ...Object.entries(unitChoices).map(([i, c]) => ({
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

    const groups: ModelGroup[] = [];
    for (const sgs of Object.values(subgroups)) {
      for (const sg of sgs) {
        for (const [optIdx, ci] of Object.entries(sg.choices)) {
          groups.push({ optionIndex: +optIdx, count: sg.count, choiceIndex: ci });
        }
      }
    }

    onassign({ unitName: selectedProfile.name, selectedChoices: choices, modelGroups: groups });
  }

  // ── Interactions ────────────────────────────────────────────────────────
  function toggleSection(key: string) {
    expanded = { ...expanded, [key]: !expanded[key] };
  }

  function toggleUnitChoice(optionIndex: number, choiceIndex: number) {
    const next = { ...unitChoices };
    if (next[optionIndex] === choiceIndex) delete next[optionIndex];
    else next[optionIndex] = choiceIndex;
    unitChoices = next;
  }

  function setModelCount(optionIndex: number, delta: number) {
    if (!selectedProfile) return;
    const opt = selectedProfile.options[optionIndex];
    const max = opt?.max ?? 0;
    const current = modelCounts[optionIndex] ?? 0;
    const next = Math.max(0, Math.min(max, current + delta));
    modelCounts = { ...modelCounts, [optionIndex]: next };

    // Absorb the change into the last subgroup for the same model.
    const modelName = opt?.modelName;
    if (!modelName) return;
    const sgs = subgroups[modelName];
    if (!sgs || sgs.length === 0) return;
    const total = totalCount(modelName);
    const sumExceptLast = sgs.slice(0, -1).reduce((s, g) => s + g.count, 0);
    const lastCount = Math.max(1, total - sumExceptLast);
    subgroups = {
      ...subgroups,
      [modelName]: [...sgs.slice(0, -1), { ...sgs[sgs.length - 1], count: lastCount }],
    };
  }

  function setSubgroupChoice(modelName: string, i: number, optionIndex: number, choiceIndex: number | null) {
    const sgs = [...(subgroups[modelName] ?? [])];
    sgs[i] = { ...sgs[i], choices: { ...sgs[i].choices, [optionIndex]: choiceIndex } };
    subgroups = { ...subgroups, [modelName]: sgs };
  }

  function splitSubgroup(modelName: string, i: number) {
    const sgs = [...(subgroups[modelName] ?? [])];
    const g = sgs[i];
    if (g.count < 2) return;
    const half = Math.floor(g.count / 2);
    sgs.splice(i, 1,
      { count: half, choices: { ...g.choices } },
      { count: g.count - half, choices: { ...g.choices } },
    );
    subgroups = { ...subgroups, [modelName]: sgs };
  }

  function removeSubgroup(modelName: string, i: number) {
    const sgs = [...(subgroups[modelName] ?? [])];
    if (sgs.length <= 1) return;
    const removed = sgs.splice(i, 1)[0];
    const target = sgs.length - 1;
    sgs[target] = { ...sgs[target], count: sgs[target].count + removed.count };
    subgroups = { ...subgroups, [modelName]: sgs };
  }

  function setSubgroupCount(modelName: string, i: number, newCount: number) {
    const sgs = [...(subgroups[modelName] ?? [])];
    if (sgs.length <= 1) return;
    const total = totalCount(modelName);
    const clamped = Math.max(1, Math.min(newCount, total - sgs.length + 1));
    const delta = clamped - sgs[i].count;
    const otherIdx = i === sgs.length - 1 ? i - 1 : i + 1;
    const otherNew = sgs[otherIdx].count - delta;
    if (otherNew < 1) return;
    sgs[i] = { ...sgs[i], count: clamped };
    sgs[otherIdx] = { ...sgs[otherIdx], count: otherNew };
    subgroups = { ...subgroups, [modelName]: sgs };
  }

  // ── Summaries (comma-delimited, shown on collapsed section headers) ───────
  function sectionSummary(section: ModelSection): string {
    const sgs = subgroups[section.modelName] ?? [];
    const parts: string[] = [];
    if (section.countOptIdx !== null && (modelCounts[section.countOptIdx] ?? 0) > 0) {
      parts.push(`+${modelCounts[section.countOptIdx]}`);
    }
    for (const sg of sgs) {
      for (const optIdx of section.perModelOptIdxs) {
        const ci = sg.choices[optIdx];
        if (ci === null || ci === undefined) continue;
        const choice = selectedProfile?.options[optIdx]?.choices?.[ci];
        if (!choice) continue;
        parts.push(sg.count === 1 ? choice.description : `${sg.count}× ${choice.description}`);
      }
    }
    return parts.join(', ');
  }

  function unitSummary(): string {
    const parts: string[] = [];
    for (const optIdx of unitOptIdxs) {
      const ci = unitChoices[optIdx];
      if (ci === undefined) continue;
      const opt = selectedProfile?.options[optIdx];
      if (!opt) continue;
      if (opt.weaponListNames) {
        const e = resolveListEntries(opt)[ci];
        if (e) parts.push(e.weaponName);
      } else {
        const c = opt.choices?.[ci];
        if (c) parts.push(c.description);
      }
    }
    return parts.join(', ');
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

{#snippet weaponStats(weapon: MeleeWeapon | RangedWeapon)}
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
      <span class="ws-cell">{(weapon as RangedWeapon).RS}</span>
      <span class="ws-cell">{weapon.AP}</span>
      <span class="ws-cell">{weapon.D}</span>
    {/if}
    {#if weapon.specialRules.length > 0}
      <span class="ws-rules">{weapon.specialRules.join(', ')}</span>
    {/if}
  </div>
{/snippet}

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

        {#if modelSections.length > 0 || unitOptIdxs.length > 0}
          <!-- Per-model sections -->
          {#each modelSections as section (section.modelName)}
            {@const total = totalCount(section.modelName)}
            {@const sgs = subgroups[section.modelName] ?? []}
            {@const summary = sectionSummary(section)}
            <div class="section-block">
              <button class="section-header" onclick={() => toggleSection(section.modelName)}>
                <span class="section-chevron">{expanded[section.modelName] ? '▾' : '▸'}</span>
                <span class="section-title">{total} × {section.modelName}</span>
                {#if summary}<span class="section-summary">{summary}</span>{/if}
              </button>

              {#if expanded[section.modelName]}
                <div class="section-body">
                  {#if section.countOptIdx !== null}
                    {@const cIdx = section.countOptIdx}
                    {@const cOpt = selectedProfile.options[cIdx]}
                    {@const added = modelCounts[cIdx] ?? 0}
                    <div class="model-count-row">
                      <span class="add-label">Add models</span>
                      <button class="stepper-btn" onclick={() => setModelCount(cIdx, -1)} disabled={added <= 0}>−</button>
                      <span class="stepper-val">{added}</span>
                      <button class="stepper-btn" onclick={() => setModelCount(cIdx, 1)} disabled={added >= (cOpt.max ?? 0)}>+</button>
                      <span class="stepper-pts">
                        {added > 0 ? `+${added * (cOpt.pointsPerModel ?? 0)} pts` : `+${cOpt.pointsPerModel ?? 0}/model`}
                      </span>
                    </div>
                  {/if}

                  {#each sgs as sg, gIdx}
                    <div class="group-row">
                      <div class="group-header">
                        {#if sgs.length > 1}
                          <input
                            class="group-count-input"
                            type="number"
                            min="1"
                            max={total - sgs.length + 1}
                            value={sg.count}
                            oninput={(e) => setSubgroupCount(section.modelName, gIdx, +(e.target as HTMLInputElement).value)}
                          />
                        {:else}
                          <span class="group-count">{total}</span>
                        {/if}
                        <span class="group-model-name">× {section.modelName}</span>
                        <div class="group-actions">
                          {#if sg.count >= 2}
                            <button class="split-btn" onclick={() => splitSubgroup(section.modelName, gIdx)}>Split</button>
                          {/if}
                          {#if sgs.length > 1}
                            <button class="remove-btn" onclick={() => removeSubgroup(section.modelName, gIdx)}>×</button>
                          {/if}
                        </div>
                      </div>

                      <div class="subgroup-body">
                        {#each section.perModelOptIdxs as optIdx}
                          {@const opt = selectedProfile.options[optIdx]}
                          {@const sel = sg.choices[optIdx] ?? null}
                          <p class="option-desc">{opt.description}</p>
                          <div class="choice-list">
                            <button
                              class="choice-btn"
                              class:selected={sel === null}
                              onclick={() => setSubgroupChoice(section.modelName, gIdx, optIdx, null)}
                            >
                              <div class="choice-main">
                                <span class="choice-radio">{sel === null ? '◉' : '○'}</span>
                                <span class="choice-desc">No upgrade</span>
                                <span class="choice-cost">Free</span>
                              </div>
                            </button>
                            {#each opt.choices ?? [] as choice, choiceIdx}
                              {@const isSelected = sel === choiceIdx}
                              {@const weapon = choice.weaponName ? findWeapon(choice.weaponName) : undefined}
                              <button
                                class="choice-btn"
                                class:selected={isSelected}
                                onclick={() => setSubgroupChoice(section.modelName, gIdx, optIdx, choiceIdx)}
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
                                {#if weapon}{@render weaponStats(weapon)}{/if}
                              </button>
                            {/each}
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}

          <!-- Unit-wide upgrades -->
          {#if unitOptIdxs.length > 0}
            {@const usummary = unitSummary()}
            <div class="section-block">
              <button class="section-header" onclick={() => toggleSection(UNIT_SECTION)}>
                <span class="section-chevron">{expanded[UNIT_SECTION] ? '▾' : '▸'}</span>
                <span class="section-title">Unit upgrades</span>
                {#if usummary}<span class="section-summary">{usummary}</span>{/if}
              </button>

              {#if expanded[UNIT_SECTION]}
                <div class="section-body">
                  {#each unitOptIdxs as optIdx}
                    {@const opt = selectedProfile.options[optIdx]}
                    <div class="option-block">
                      <p class="option-desc">{opt.description}</p>
                      <div class="choice-list">
                        {#if opt.weaponListNames}
                          {#each resolveListEntries(opt) as entry, entryIdx}
                            {@const isSelected = unitChoices[optIdx] === entryIdx}
                            {@const weapon = findWeapon(entry.weaponName)}
                            <button
                              class="choice-btn"
                              class:selected={isSelected}
                              onclick={() => toggleUnitChoice(optIdx, entryIdx)}
                            >
                              <div class="choice-main">
                                <span class="choice-radio">{isSelected ? '◉' : '○'}</span>
                                <span class="choice-desc">{entry.weaponName}</span>
                                <span class="choice-cost">{entry.points !== 0 ? `+${entry.points} pts` : 'Free'}</span>
                              </div>
                              {#if weapon}{@render weaponStats(weapon)}{/if}
                            </button>
                          {/each}
                        {:else if opt.choices}
                          {#each opt.choices as choice, choiceIdx}
                            {@const isSelected = unitChoices[optIdx] === choiceIdx}
                            {@const weapon = choice.weaponName ? findWeapon(choice.weaponName) : undefined}
                            <button
                              class="choice-btn"
                              class:selected={isSelected}
                              onclick={() => toggleUnitChoice(optIdx, choiceIdx)}
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
                              {#if weapon}{@render weaponStats(weapon)}{/if}
                            </button>
                          {/each}
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
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

  /* ── Collapsible sections ────────────────────── */
  .section-block {
    border-bottom: 1px solid var(--color-border);
  }

  .section-block:last-child {
    border-bottom: none;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1.25rem;
    background: var(--color-bg-surface);
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
  }

  .section-header:hover {
    background: rgba(0, 200, 255, 0.05);
  }

  .section-chevron {
    color: var(--color-text-muted);
    font-size: 0.8rem;
    flex-shrink: 0;
    width: 0.9rem;
  }

  .section-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--color-accent);
    flex-shrink: 0;
    white-space: nowrap;
  }

  .section-summary {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    color: var(--color-text-muted);
    letter-spacing: 0.02em;
    flex: 1;
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .section-body {
    padding: 0.75rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    background: var(--color-bg);
  }

  .add-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    margin-right: auto;
  }

  .option-block {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
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
    padding: 0.2rem 0 0.4rem;
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

  .subgroup-body {
    padding: 0.5rem 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
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
