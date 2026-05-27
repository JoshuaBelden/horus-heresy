<script lang="ts">
  import {
    meleeWeapons as catalogueMelee,
    rangedWeapons as catalogueRanged,
    units,
    wargear as wargearCatalogue,
    weaponLists,
  } from '../data';
  import { lookupRule } from '../data/specialRules';
  import type {
    MeleeWeapon,
    ModelProfile,
    RangedWeapon,
    UnitProfile,
    WargearDetail,
  } from '../data/types';
  import { armiesStore, calcArmyPoints } from '../stores/armies.svelte';
  import { libraryStore } from '../stores/library.svelte';

  const { armyId, onback }: { armyId: string; onback: () => void } = $props();

  const army = $derived(armiesStore.list.find((a) => a.id === armyId)!);
  const totalPoints = $derived(army ? calcArmyPoints(army) : 0);

  const STAT_KEYS = ['M', 'WS', 'BS', 'S', 'T', 'W', 'I', 'A', 'LD', 'CL', 'WP', 'IN', 'SAV', 'INV'];
  // Vehicles use armour facings, Hull Points and Transport Capacity.
  const VEHICLE_STAT_KEYS = ['M', 'BS', 'armourFront', 'armourSide', 'armourRear', 'HP', 'transportCapacity'];
  const VEHICLE_STAT_LABELS: Record<string, string> = {
    M: 'M', BS: 'BS', armourFront: 'Front', armourSide: 'Side',
    armourRear: 'Rear', HP: 'HP', transportCapacity: 'Transport',
  };
  const isVehicleModel = (type: string) => type === 'Vehicle' || type === 'Flying Vehicle';

  // Rule references open the shared Library panel and jump to the rule.
  function openRule(ruleName: string) {
    libraryStore.openRule(ruleName);
  }

  // Unit blocks are collapsed by default; track which slots are expanded.
  let expanded = $state<Record<string, boolean>>({});
  function toggleUnit(key: string) {
    expanded[key] = !expanded[key];
  }

  // ── Per-slot unit instances ──────────────────────────────────────────────────
  // Every filled detachment slot is rendered as its own block — duplicates (e.g.
  // two Tactical Squads) appear separately because each slot has its own loadout.
  // Within a unit, weapons are grouped under the model that carries them so a
  // Sergeant's loadout reads separately from the rank-and-file Legionaries.
  interface ModelLoadout {
    model: ModelProfile;
    ranged: RangedWeapon[];
    melee: MeleeWeapon[];
  }
  interface UnitInstance {
    key: string;
    profile: UnitProfile;
    models: ModelLoadout[];
    equipment: WargearDetail[];
    rules: string[];
  }

  // Which model in the unit an option applies to, or null for unit-wide.
  // `modelName` is authoritative; otherwise we match the option's prose against
  // each model's name/subtype (stemmed, so "Legionaries" matches "Legionary").
  function attributeModel(profile: UnitProfile, optionIndex: number): number | null {
    const opt = profile.options[optionIndex];
    if (!opt) return null;
    if (opt.modelName) {
      const i = profile.models.findIndex((m) => m.name === opt.modelName);
      if (i >= 0) return i;
    }
    const desc = opt.description.toLowerCase();
    for (let i = 0; i < profile.models.length; i++) {
      const m = profile.models[i];
      for (const token of [m.name, ...(m.subtypes ?? [])]) {
        if (!token) continue;
        const stem = token.toLowerCase().replace(/(ies|s|y)$/, '');
        if (stem.length >= 3 && desc.includes(stem)) return i;
      }
    }
    return null;
  }

  const unitInstances = $derived.by(() => {
    const result: UnitInstance[] = [];
    if (!army) return result;
    for (const det of army.detachments) {
      for (const s of det.slots) {
        if (!s.unit) continue;
        const profile = units.find((u) => u.name === s.unit!.unitName);
        if (!profile) continue;

        // Default wargear is the shared baseline carried by every model; selected
        // options add weapons to a specific model (or all, when unit-wide).
        const perModelWeapons: string[][] = profile.models.map(() => [
          ...profile.wargear,
        ]);
        const equipmentNames: string[] = [...profile.wargear];
        const ruleNames: string[] = [...profile.specialRules];

        const addWeapon = (name: string, modelIndex: number | null) => {
          if (modelIndex === null)
            for (const arr of perModelWeapons) arr.push(name);
          else perModelWeapons[modelIndex].push(name);
        };

        for (const sc of s.unit.selectedChoices) {
          const opt = profile.options[sc.optionIndex];
          if (!opt) continue;
          const modelIndex = attributeModel(profile, sc.optionIndex);
          if (opt.weaponListNames) {
            const entries = opt.weaponListNames.flatMap(
              (n) => weaponLists.find((l) => l.name === n)?.entries ?? [],
            );
            const e = entries[sc.choiceIndex];
            if (e) addWeapon(e.weaponName, modelIndex);
          } else if (opt.choices) {
            const choice = opt.choices[sc.choiceIndex];
            if (choice?.weaponName) addWeapon(choice.weaponName, modelIndex);
            if (choice?.wargearName) equipmentNames.push(choice.wargearName);
          }
        }
        for (const group of s.unit.modelGroups ?? []) {
          if (group.choiceIndex === null) continue;
          const opt = profile.options[group.optionIndex];
          const choice = opt?.choices?.[group.choiceIndex];
          if (choice?.weaponName)
            addWeapon(choice.weaponName, attributeModel(profile, group.optionIndex));
        }

        const models: ModelLoadout[] = profile.models.map((model, i) => {
          const uniq = [...new Set(perModelWeapons[i])];
          const ranged = uniq
            .map((n) => catalogueRanged.find((w) => w.name === n))
            .filter((w): w is RangedWeapon => w !== undefined);
          const melee = uniq
            .map((n) => catalogueMelee.find((w) => w.name === n))
            .filter((w): w is MeleeWeapon => w !== undefined);
          for (const w of [...ranged, ...melee]) ruleNames.push(...w.specialRules);
          return { model, ranged, melee };
        });

        const equipment = [...new Set(equipmentNames)]
          .map((n) => wargearCatalogue.find((g) => g.name === n))
          .filter((g): g is WargearDetail => g !== undefined);
        const rules = [...new Set(ruleNames)].sort();

        result.push({ key: s.id, profile, models, equipment, rules });
      }
    }
    return result;
  });

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

{#snippet rulesCell(items: string[])}
  {#if items.length === 0}—{:else}{#each items as r, i}{#if lookupRule(r)}<button
          class="rule-link"
          onclick={() => openRule(r)}>{r}</button
        >{:else}{r}{/if}{#if i < items.length - 1},
      {/if}{/each}{/if}
{/snippet}

{#snippet rangedTable(weapons: RangedWeapon[])}
  <div class="weapons-table-wrap">
    <table class="weapons-table">
      <thead>
        <tr>
          <th class="col-name">Name</th>
          <th>R</th>
          <th>FP</th>
          <th>RS</th>
          <th>AP</th>
          <th>D</th>
          <th class="col-rules">Special Rules</th>
          <th class="col-traits">Traits</th>
        </tr>
      </thead>
      <tbody>
        {#each weapons as w (w.name)}
          <tr>
            <td class="col-name">{w.name}</td>
            <td>{w.R ?? '—'}</td>
            <td>{w.FP ?? '—'}</td>
            <td>{w.RS ?? '—'}</td>
            <td>{w.AP ?? '—'}</td>
            <td>{w.D ?? '—'}</td>
            <td class="col-rules">{@render rulesCell(w.specialRules ?? [])}</td>
            <td class="col-traits">{@render rulesCell(w.traits ?? [])}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/snippet}

{#snippet meleeTable(weapons: MeleeWeapon[])}
  <div class="weapons-table-wrap">
    <table class="weapons-table">
      <thead>
        <tr>
          <th class="col-name">Name</th>
          <th>IM</th>
          <th>AM</th>
          <th>SM</th>
          <th>AP</th>
          <th>D</th>
          <th class="col-rules">Special Rules</th>
          <th class="col-traits">Traits</th>
        </tr>
      </thead>
      <tbody>
        {#each weapons as w (w.name)}
          <tr>
            <td class="col-name">{w.name}</td>
            <td>{w.IM ?? '—'}</td>
            <td>{w.AM ?? '—'}</td>
            <td>{w.SM ?? '—'}</td>
            <td>{w.AP ?? '—'}</td>
            <td>{w.D ?? '—'}</td>
            <td class="col-rules">{@render rulesCell(w.specialRules ?? [])}</td>
            <td class="col-traits">{@render rulesCell(w.traits ?? [])}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/snippet}

{#if !army}
  <div class="error">Army not found.</div>
{:else}
  <div class="page">
    <!-- Header -->
    <div class="page-header">
      <button class="back-btn" onclick={onback}>← Back</button>
      <div class="army-info">
        <span class="army-name">{army.name}</span>
        <span
          class="faction-tag"
          style="color: {FACTION_COLORS[army.faction] ??
            '#5a7080'}; border-color: {FACTION_COLORS[army.faction] ??
            '#5a7080'}55">{army.faction}</span
        >
      </div>
      <div class="points-display">
        <span class="points-value">{totalPoints}</span>
        <span class="points-label">pts</span>
      </div>
    </div>

    <!-- Body: 2/3 Army Info + 1/3 Turn Sequence -->
    <div class="report-body">
      <!-- Left: Army Info -->
      <div class="army-info-col">
        <!-- Unit Profiles -->
        <section class="report-section">
          <h3 class="section-title">Unit Profiles</h3>

          {#if unitInstances.length === 0}
            <p class="empty-note">No units assigned yet.</p>
          {:else}
            {#each unitInstances as inst (inst.key)}
              {@const profile = inst.profile}
              {@const isOpen = expanded[inst.key] ?? false}
              <div class="unit-block" class:is-open={isOpen}>
                <button
                  class="unit-block-header"
                  aria-expanded={isOpen}
                  onclick={() => toggleUnit(inst.key)}
                >
                  <span class="unit-toggle-icon">▸</span>
                  <span class="unit-block-name">{profile.name}</span>
                  <span class="unit-pts">{profile.points} pts</span>
                </button>

                {#if isOpen}
                {#each inst.models as ml (ml.model.name)}
                  {@const statCols = isVehicleModel(ml.model.type) ? VEHICLE_STAT_KEYS : STAT_KEYS}
                  <div class="model-block">
                    <div class="model-name">
                      {ml.model.name}{#if ml.model.subtypes && ml.model.subtypes.length}
                        ({ml.model.subtypes.join(', ')}){/if}
                    </div>
                    <div class="stats-table-wrap">
                      <table class="stats-table">
                        <thead>
                          <tr>
                            {#each statCols as stat}
                              <th>{VEHICLE_STAT_LABELS[stat] ?? stat}</th>
                            {/each}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {#each statCols as stat}
                              <td
                                >{(ml.model as unknown as Record<
                                  string,
                                  unknown
                                >)[stat] ?? '—'}</td
                              >
                            {/each}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {#if ml.ranged.length > 0}
                      <div class="ref-group">
                        <span class="ref-label">Ranged Weapons</span>
                        {@render rangedTable(ml.ranged)}
                      </div>
                    {/if}

                    {#if ml.melee.length > 0}
                      <div class="ref-group">
                        <span class="ref-label">Melee Weapons</span>
                        {@render meleeTable(ml.melee)}
                      </div>
                    {/if}
                  </div>
                {/each}

                {#if inst.equipment.length > 0}
                  <div class="ref-group">
                    <span class="ref-label">Equipment</span>
                    <ul class="wargear-list">
                      {#each inst.equipment as item (item.name)}
                        <li class="wargear-item">
                          <span class="wargear-name">{item.name}</span>
                          <span class="wargear-summary">{item.summary}</span>
                          <p class="wargear-desc">{item.description}</p>
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}

                {#if inst.rules.length > 0}
                  <div class="ref-group">
                    <span class="ref-label">Special Rules</span>
                    <div class="ref-chips">
                      {#each inst.rules as rule (rule)}
                        {#if lookupRule(rule)}
                          <button
                            class="ref-chip ref-chip-link"
                            onclick={() => openRule(rule)}>{rule}</button
                          >
                        {:else}
                          <span class="ref-chip">{rule}</span>
                        {/if}
                      {/each}
                    </div>
                  </div>
                {/if}
                {/if}
              </div>
            {/each}
          {/if}
        </section>
      </div>
    </div>
  </div>
{/if}

<style>
  .page {
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .error {
    padding: 2rem;
    color: var(--color-danger);
    font-family: 'Rajdhani', sans-serif;
  }

  /* ── Header ─────────────────────────────────── */
  .page-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg-raised);
  }

  .back-btn {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    background: none;
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    padding: 0.4rem 0.85rem;
    cursor: pointer;
    white-space: nowrap;
    transition:
      border-color 0.12s,
      color 0.12s;
    flex-shrink: 0;
  }

  .back-btn:hover {
    border-color: var(--color-accent-dim);
    color: var(--color-accent);
  }

  .army-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .army-name {
    font-family: 'Orbitron', monospace;
    font-size: 0.88rem;
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
    white-space: nowrap;
    flex-shrink: 0;
  }


  .points-display {
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
    flex-shrink: 0;
  }

  .points-value {
    font-family: 'Orbitron', monospace;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-gold);
    text-shadow: 0 0 8px rgba(201, 147, 58, 0.4);
  }

  .points-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  /* ── Body Layout ─────────────────────────────── */
  .report-body {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    align-items: stretch;
  }

  /* ── Army Info Column ────────────────────────── */
  .army-info-col {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .report-section {
    border: 1px solid var(--color-border);
    background: var(--color-bg-raised);
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .section-title {
    font-family: 'Orbitron', monospace;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--color-accent);
    padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--color-border);
    margin: 0;
  }

  .empty-note {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    font-style: italic;
    margin: 0;
  }

  .wargear-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .wargear-item {
    border: 1px solid var(--color-border);
    padding: 0.6rem 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .wargear-name {
    font-family: 'Orbitron', sans-serif;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-accent);
    letter-spacing: 0.05em;
  }

  .wargear-summary {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-text-muted);
    font-style: italic;
  }

  .wargear-desc {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.82rem;
    color: var(--color-text);
    margin: 0.2rem 0 0;
    line-height: 1.5;
  }

  /* ── Unit Blocks ─────────────────────────────── */
  .unit-block {
    border: 1px solid var(--color-border);
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .unit-block-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
    font: inherit;
    color: inherit;
  }

  .unit-toggle-icon {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    transition: transform 0.15s ease;
    flex-shrink: 0;
  }

  .unit-block.is-open .unit-toggle-icon {
    transform: rotate(90deg);
  }

  .unit-block-name {
    margin-right: auto;
    font-family: 'Orbitron', monospace;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-accent);
  }

  .unit-pts {
    font-family: 'Orbitron', monospace;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-gold);
    white-space: nowrap;
  }

  /* ── Loadout / Rule References ───────────────── */
  .ref-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .ref-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .ref-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 0.4rem;
  }

  .ref-chip {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.74rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    background: rgba(0, 0, 0, 0.15);
    padding: 0.12em 0.5em;
    line-height: 1.3;
  }

  .ref-chip-link {
    color: var(--color-accent);
    border-color: var(--color-accent-dim);
    background: rgba(0, 200, 255, 0.04);
    cursor: pointer;
    transition:
      background 0.12s,
      border-color 0.12s;
  }

  .ref-chip-link:hover {
    background: rgba(0, 200, 255, 0.12);
    border-color: var(--color-accent);
  }

  /* ── Model Stats ─────────────────────────────── */
  .model-block {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .model-name {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .stats-table-wrap {
    overflow-x: auto;
  }

  .stats-table {
    border-collapse: collapse;
    font-family: 'Orbitron', monospace;
    font-size: 0.7rem;
    width: 100%;
  }

  .stats-table th,
  .stats-table td {
    padding: 0.3rem 0.5rem;
    text-align: center;
    border: 1px solid var(--color-border);
    white-space: nowrap;
  }

  .stats-table th {
    color: var(--color-text-muted);
    font-weight: 600;
    letter-spacing: 0.1em;
    background: rgba(0, 0, 0, 0.2);
  }

  .stats-table td {
    color: var(--color-text);
  }

  /* ── Weapons Tables ──────────────────────────── */
  .weapons-table-wrap {
    overflow-x: auto;
  }

  .weapons-table {
    border-collapse: collapse;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.78rem;
    width: 100%;
  }

  .weapons-table th,
  .weapons-table td {
    padding: 0.3rem 0.6rem;
    border: 1px solid var(--color-border);
    white-space: nowrap;
    text-align: center;
  }

  .weapons-table th {
    font-family: 'Orbitron', monospace;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
    background: rgba(0, 0, 0, 0.2);
  }

  .weapons-table .col-name {
    text-align: left;
    color: var(--color-text);
    font-weight: 600;
  }

  .weapons-table .col-rules {
    text-align: left;
    white-space: normal;
    max-width: 220px;
    color: var(--color-text-muted);
    font-size: 0.72rem;
  }

  .weapons-table .col-traits {
    text-align: left;
    white-space: normal;
    max-width: 140px;
    color: var(--color-text-muted);
    font-size: 0.72rem;
  }

  /* Weapon special rules link into the shared Library panel. */
  .rule-link {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--color-accent);
    font-size: inherit;
    font-family: inherit;
    text-decoration: underline;
    text-decoration-color: rgba(0, 200, 255, 0.35);
    text-underline-offset: 2px;
    transition:
      color 0.15s,
      text-decoration-color 0.15s;
  }

  .rule-link:hover {
    color: #fff;
    text-decoration-color: rgba(0, 200, 255, 0.7);
  }

</style>
