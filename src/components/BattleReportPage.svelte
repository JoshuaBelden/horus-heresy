<script lang="ts">
  import {
    meleeWeapons as catalogueMelee,
    rangedWeapons as catalogueRanged,
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
  import { armiesStore, calcArmyPoints, resolveUnitProfile } from '../stores/armies.svelte';
  import { libraryStore } from '../stores/library.svelte';
  import { turnTrackerStore as tt } from '../stores/turnTracker.svelte';
  import TurnTracker from './TurnTracker.svelte';
  import StatusControl from './StatusControl.svelte';
  import { turnSequence, type TrackerSquad } from '../data/turnSequence';

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

  // A model's Type / Sub-Type is documented in the Library as a special rule
  // named e.g. "Infantry Type" or "Sergeant Sub-Type" (a few, like "Walker",
  // use the bare label). Returns the matching rule name, or undefined if the
  // label has no Library entry to link to.
  function typeRule(label: string, kind: 'Type' | 'Sub-Type'): string | undefined {
    for (const name of [`${label} ${kind}`, label]) {
      if (lookupRule(name)) return name;
    }
    return undefined;
  }

  interface RoleSegment {
    label: string;
    rule?: string;
    sep: string;
  }

  // Builds the "Type - Sub-Type" combat-role line as ordered segments: each
  // carries the separator that precedes it and, when documented, the Library
  // rule it links to.
  function roleSegments(models: ModelLoadout[]): RoleSegment[] {
    const segs: RoleSegment[] = [];
    const types = [...new Set(models.map((m) => m.model.type))];
    const subTypes = [...new Set(models.flatMap((m) => m.model.subtypes ?? []))];
    types.forEach((t, i) => {
      segs.push({ label: t, rule: typeRule(t, 'Type'), sep: i === 0 ? '' : ', ' });
    });
    subTypes.forEach((st, i) => {
      segs.push({ label: st, rule: typeRule(st, 'Sub-Type'), sep: i === 0 ? ' - ' : ', ' });
    });
    return segs;
  }

  // Unit blocks are collapsed by default; track which slots are expanded.
  let expanded = $state<Record<string, boolean>>({});
  function toggleUnit(key: string) {
    expanded[key] = !expanded[key];
  }

  // Your turn is the offensive context: phase display rules + "Mark Gone".
  const offensive = $derived(tt.active && tt.turnOwner === 'player');
  // The opponent's turn is the defensive context: tag squads under attack.
  const canTarget = $derived(tt.active && tt.turnOwner === 'opponent');

  // Marking a squad as gone collapses its block to declutter the acted list.
  function markGone(key: string) {
    tt.toggleGone(key);
    if (tt.hasGone(key)) expanded[key] = false;
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
    // Tooltip text when a Prime Advantage (e.g. Paladin) modified this model.
    primeNote?: string;
  }
  interface UnitInstance {
    key: string;
    profile: UnitProfile;
    nickname?: string;
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
        const profile = resolveUnitProfile(s.unit.unitName, army.faction);
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

        // Paladin of the Hekatonystika Prime Advantage: one Model (the Command
        // Model) gains WS +1 and exchanges its bolter for a Terranic greatsword.
        const isPaladin = s.unit.primeAdvantage === 'Paladin of the Hekatonystika';
        let paladinIdx = -1;
        if (isPaladin) {
          paladinIdx = profile.models.findIndex((m) =>
            m.subtypes?.includes('Command'),
          );
          if (paladinIdx < 0) paladinIdx = 0;
          const arr = perModelWeapons[paladinIdx];
          const b = arr.indexOf('Bolter');
          if (b >= 0) arr.splice(b, 1);
          arr.push('Terranic greatsword');
        }

        const models: ModelLoadout[] = profile.models.map((baseModel, i) => {
          const paladinModel = isPaladin && i === paladinIdx;
          const model = paladinModel
            ? { ...baseModel, WS: (baseModel.WS ?? 0) + 1 }
            : baseModel;
          const uniq = [...new Set(perModelWeapons[i])];
          const ranged = uniq
            .map((n) => catalogueRanged.find((w) => w.name === n))
            .filter((w): w is RangedWeapon => w !== undefined);
          const melee = uniq
            .map((n) => catalogueMelee.find((w) => w.name === n))
            .filter((w): w is MeleeWeapon => w !== undefined);
          // Weapon special rules are shown inline in the weapon tables, so they
          // are deliberately not merged into the unit's Special Rules list.
          return paladinModel
            ? {
                model,
                ranged,
                melee,
                primeNote:
                  'Paladin of the Hekatonystika: Weapon Skill +1; bolter exchanged for a Terranic greatsword.',
              }
            : { model, ranged, melee };
        });

        const equipment = [...new Set(equipmentNames)]
          .map((n) => wargearCatalogue.find((g) => g.name === n))
          .filter((g): g is WargearDetail => g !== undefined);
        const rules = [...new Set(ruleNames)].sort();

        result.push({ key: s.id, profile, nickname: s.unit.nickname, models, equipment, rules });
      }
    }

    // Apply the player's saved Battle Report ordering; squads not listed keep
    // their natural detachment/slot order (stable sort) after the ordered ones.
    const order = army.reportOrder ?? [];
    if (order.length) {
      result.sort((a, b) => {
        const ia = order.indexOf(a.key);
        const ib = order.indexOf(b.key);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
    }
    return result;
  });

  // Lightweight squad view models for the Turn Tracker, derived from the unit
  // instances above so the tracker doesn't re-parse army data. The slot id
  // (inst.key) is the stable squad identifier used for per-squad tracking.
  const trackerSquads = $derived.by<TrackerSquad[]>(() =>
    unitInstances.map((inst) => ({
      id: inst.key,
      name: inst.nickname || inst.profile.name,
      rules: inst.rules,
      ranged: inst.models.flatMap((m) =>
        m.ranged.map((w) => ({
          name: w.name,
          specialRules: w.specialRules ?? [],
          traits: w.traits ?? [],
        })),
      ),
      melee: inst.models.flatMap((m) =>
        m.melee.map((w) => ({
          name: w.name,
          specialRules: w.specialRules ?? [],
          traits: w.traits ?? [],
        })),
      ),
      subtypes: [
        ...new Set(inst.models.flatMap((m) => m.model.subtypes ?? [])),
      ],
    })),
  );

  // Per-phase display rules drive the Unit Profiles list while tracking: which
  // units are shown and which model stats are highlighted. When not tracking,
  // every unit is shown with no highlighting.
  const currentPhase = $derived(
    turnSequence.find((p) => p.id === tt.currentPhaseId) ?? turnSequence[0],
  );
  const highlightStats = $derived(
    offensive ? (currentPhase.display.highlightStats ?? []) : [],
  );
  const highlightWeapons = $derived(
    offensive ? (currentPhase.display.highlightWeapons ?? null) : null,
  );
  function hasStat(model: ModelProfile, stat: string): boolean {
    return (model as unknown as Record<string, unknown>)[stat] != null;
  }
  function unitVisible(inst: UnitInstance): boolean {
    if (!offensive) return true;
    const { requireStats, requireWeapons } = currentPhase.display;
    if (
      requireStats?.length &&
      inst.models.some((ml) => requireStats.some((s) => hasStat(ml.model, s)))
    )
      return true;
    if (
      requireWeapons &&
      inst.models.some(
        (ml) => (requireWeapons === 'ranged' ? ml.ranged : ml.melee).length > 0,
      )
    )
      return true;
    return false; // no requirement matched (or none configured) ⇒ hidden
  }
  const visibleInstances = $derived(unitInstances.filter(unitVisible));

  // ── Drag-to-reorder squads ───────────────────────────────────────────────────
  // Dragging is initiated from a per-block handle (draggable). Reordering acts on
  // the full unit-instance order (by slot id) so it stays correct even when the
  // list is phase-filtered while tracking, then persists onto army.reportOrder.
  let draggingKey = $state<string | null>(null);
  let dragOverKey = $state<string | null>(null);

  function onDragStart(e: DragEvent, key: string) {
    draggingKey = key;
    e.dataTransfer?.setData('text/plain', key);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    const block = (e.currentTarget as HTMLElement).closest('.unit-block');
    if (block) e.dataTransfer?.setDragImage(block, 16, 16);
  }

  function onDragOver(e: DragEvent, key: string) {
    if (draggingKey === null || draggingKey === key) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    dragOverKey = key;
  }

  function onDrop(e: DragEvent, targetKey: string) {
    e.preventDefault();
    if (draggingKey !== null && draggingKey !== targetKey) {
      const keys = unitInstances.map((i) => i.key);
      const from = keys.indexOf(draggingKey);
      const to = keys.indexOf(targetKey);
      if (from !== -1 && to !== -1) {
        keys.splice(from, 1);
        keys.splice(to, 0, draggingKey);
        const clone = JSON.parse(JSON.stringify(army));
        clone.reportOrder = keys;
        clone.updatedAt = Date.now();
        armiesStore.update(clone);
      }
    }
    resetDrag();
  }

  function resetDrag() {
    draggingKey = null;
    dragOverKey = null;
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
          {#if w.modes && w.modes.length}
            <tr class="mode-parent">
              <td class="col-name">{w.name}</td>
              <td>{w.R ?? '—'}</td>
              <td>{w.FP ?? '—'}</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td class="col-rules"></td>
              <td class="col-traits">{@render rulesCell(w.traits ?? [])}</td>
            </tr>
            {#each w.modes as mode}
              <tr class="mode-row">
                <td class="col-name mode-name">– {mode.name}</td>
                <td></td>
                <td></td>
                <td>{mode.RS}</td>
                <td>{mode.AP}</td>
                <td>{mode.D}</td>
                <td class="col-rules">{@render rulesCell(mode.specialRules)}</td>
                <td class="col-traits"></td>
              </tr>
            {/each}
          {:else}
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
          {/if}
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

    <!-- Turn Tracker: full-width bar below the header -->
    {#if tt.active}
      <TurnTracker squads={trackerSquads} onstop={() => tt.stop()} />
    {:else}
      <div class="track-start">
        <button class="track-start-btn" onclick={() => tt.start()}>
          Start Tracking Turns
        </button>
      </div>
    {/if}

    <!-- Body: 2/3 Army Info + 1/3 Turn Sequence -->
    <div class="report-body">
      <!-- Left: Army Info -->
      <div class="army-info-col">
        <!-- Unit Profiles -->
        <section class="report-section">
          <h3 class="section-title">Unit Profiles</h3>

          {#if unitInstances.length === 0}
            <p class="empty-note">No units assigned yet.</p>
          {:else if visibleInstances.length === 0}
            <p class="empty-note">
              No units to show for the {currentPhase.name} phase.
            </p>
          {:else}
            {#each visibleInstances as inst (inst.key)}
              {@const profile = inst.profile}
              {@const isOpen = expanded[inst.key] ?? false}
              {@const gone = offensive && tt.hasGone(inst.key)}
              {@const targeted = canTarget && tt.isTargeted(inst.key)}
              <div
                class="unit-block"
                class:is-open={isOpen}
                class:is-gone={gone}
                class:is-targeted={targeted}
                class:is-dragging={draggingKey === inst.key}
                class:drag-over={dragOverKey === inst.key}
                ondragover={(e) => onDragOver(e, inst.key)}
                ondragleave={() => { if (dragOverKey === inst.key) dragOverKey = null; }}
                ondrop={(e) => onDrop(e, inst.key)}
                role="listitem"
              >
                <button
                  class="drag-handle"
                  draggable="true"
                  ondragstart={(e) => onDragStart(e, inst.key)}
                  ondragend={resetDrag}
                  aria-label="Drag to reorder squad"
                  title="Drag to reorder"
                >⋮⋮</button>
                <div class="unit-block-head-row">
                  <button
                    class="unit-block-header"
                    aria-expanded={isOpen}
                    onclick={() => toggleUnit(inst.key)}
                  >
                    <span class="unit-toggle-icon">▸</span>
                    {#if inst.nickname}
                      <span class="unit-block-name">{inst.nickname}</span>
                      <span class="unit-block-sub">{profile.name}</span>
                    {:else}
                      <span class="unit-block-name">{profile.name}</span>
                    {/if}
                    <span class="unit-pts">{profile.points} pts</span>
                  </button>
                  {#if offensive}
                    <button
                      class="unit-mark-btn"
                      class:is-gone={gone}
                      onclick={() => markGone(inst.key)}
                    >
                      {gone ? '✓ Gone' : 'Mark Gone'}
                    </button>
                  {:else if canTarget}
                    <button
                      class="unit-mark-btn"
                      class:is-targeted={targeted}
                      onclick={() => tt.toggleTargeted(inst.key)}
                    >
                      {targeted ? '✓ Targeted' : 'Target'}
                    </button>
                  {/if}
                </div>

                {#if tt.active}
                  <StatusControl squadId={inst.key} />
                {/if}

                {#if isOpen}
                {@const segments = roleSegments(inst.models)}
                <div class="unit-block-role">
                  {#each segments as seg (seg.label)}{seg.sep}{#if seg.rule}<button
                        class="role-link"
                        onclick={() => openRule(seg.rule!)}>{seg.label}</button
                      >{:else}{seg.label}{/if}{/each}
                </div>
                {#each inst.models as ml (ml.model.name)}
                  {@const statCols = isVehicleModel(ml.model.type) ? VEHICLE_STAT_KEYS : STAT_KEYS}
                  <div class="model-block">
                    <div class="model-name">
                      {ml.model.name}{#if ml.model.subtypes && ml.model.subtypes.length}
                        ({ml.model.subtypes.join(', ')}){/if}{#if ml.primeNote}<span
                          class="prime-note"
                          title={ml.primeNote}>◈ Prime</span
                        >{/if}
                    </div>
                    <div class="stats-table-wrap">
                      <table class="stats-table">
                        <thead>
                          <tr>
                            {#each statCols as stat}
                              <th class:stat-highlight={highlightStats.includes(stat)}
                                >{VEHICLE_STAT_LABELS[stat] ?? stat}</th
                              >
                            {/each}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {#each statCols as stat}
                              <td class:stat-highlight={highlightStats.includes(stat)}
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

                    {#if ml.ranged.length > 0 && (!offensive || highlightWeapons === 'ranged')}
                      <div
                        class="ref-group"
                        class:weapons-highlight={highlightWeapons === 'ranged'}
                      >
                        <span class="ref-label">Ranged Weapons</span>
                        {@render rangedTable(ml.ranged)}
                      </div>
                    {/if}

                    {#if ml.melee.length > 0 && (!offensive || highlightWeapons === 'melee')}
                      <div
                        class="ref-group"
                        class:weapons-highlight={highlightWeapons === 'melee'}
                      >
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

  /* ── Start Tracking ──────────────────────────── */
  .track-start {
    display: flex;
    border: 1px solid var(--color-border);
    background: var(--color-bg-raised);
  }

  .track-start-btn {
    flex: 1;
    font-family: 'Orbitron', monospace;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    background: none;
    border: none;
    color: var(--color-accent);
    padding: 0.85rem 1.5rem;
    cursor: pointer;
    transition: background 0.12s;
  }

  .track-start-btn:hover {
    background: rgba(0, 200, 255, 0.08);
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
    position: relative;
    border: 1px solid var(--color-border);
    padding: 0.85rem 1rem 0.85rem 1.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  /* Drag handle: hidden until the block is hovered, sits in the left gutter. */
  .drag-handle {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 1.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: 0.8rem;
    line-height: 1;
    letter-spacing: -2px;
    cursor: grab;
    opacity: 0;
    transition: opacity 0.12s, color 0.12s;
  }

  .unit-block:hover .drag-handle {
    opacity: 0.55;
  }

  .drag-handle:hover {
    opacity: 1;
    color: var(--color-accent);
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .unit-block.is-dragging {
    opacity: 0.4;
  }

  .unit-block.drag-over {
    border-color: var(--color-accent);
    box-shadow: 0 0 8px rgba(0, 200, 255, 0.25);
  }

  /* When tracking, a squad marked "gone" dims to read as already-acted. */
  .unit-block.is-gone {
    opacity: 0.45;
  }

  /* A squad flagged as under attack on the opponent's turn. */
  .unit-block.is-targeted {
    border-color: var(--color-accent);
    box-shadow: 0 0 8px rgba(0, 200, 255, 0.25);
  }

  .unit-block-head-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .unit-block-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
    font: inherit;
    color: inherit;
  }

  .unit-mark-btn {
    flex-shrink: 0;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: none;
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    padding: 0.3rem 0.6rem;
    cursor: pointer;
    white-space: nowrap;
    transition:
      border-color 0.12s,
      color 0.12s,
      background 0.12s;
  }

  .unit-mark-btn:hover {
    border-color: var(--color-accent-dim);
    color: var(--color-accent);
  }

  .unit-mark-btn.is-gone,
  .unit-mark-btn.is-targeted {
    color: var(--color-accent);
    border-color: var(--color-accent-dim);
    background: rgba(0, 200, 255, 0.08);
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
    font-family: 'Orbitron', monospace;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-accent);
  }

  .unit-block-sub {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    opacity: 0.8;
  }

  .unit-pts {
    margin-left: auto;
    font-family: 'Orbitron', monospace;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-gold);
    white-space: nowrap;
  }

  .unit-block-role {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .role-link {
    font: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
    color: var(--color-accent);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: var(--color-accent-dim);
    text-underline-offset: 2px;
    transition: color 0.12s;
  }

  .role-link:hover {
    color: #fff;
    text-decoration-color: var(--color-accent);
  }

  /* ── Loadout / Rule References ───────────────── */
  .ref-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  /* Weapon table for the current phase, highlighted by the Turn Tracker. */
  .ref-group.weapons-highlight .ref-label {
    color: var(--color-accent);
  }

  .ref-group.weapons-highlight :global(.weapons-table-wrap) {
    box-shadow: inset 0 0 0 1px var(--color-accent-dim);
    background: rgba(0, 200, 255, 0.06);
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

  .prime-note {
    margin-left: 0.4rem;
    color: var(--color-gold);
    cursor: help;
    text-shadow: 0 0 6px rgba(201, 147, 58, 0.4);
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

  /* Phase-relevant characteristic highlighted by the Turn Tracker. */
  .stats-table th.stat-highlight {
    color: var(--color-accent);
    background: rgba(0, 200, 255, 0.18);
  }

  .stats-table td.stat-highlight {
    color: var(--color-accent);
    font-weight: 700;
    background: rgba(0, 200, 255, 0.12);
    box-shadow: inset 0 0 0 1px var(--color-accent-dim);
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

  .weapons-table .mode-name {
    padding-left: 1.4rem;
    font-style: italic;
    font-weight: 500;
    color: var(--color-text-muted);
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
