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
    RangedWeapon,
    UnitProfile,
    WargearDetail,
  } from '../data/types';
  import { armiesStore, calcArmyPoints } from '../stores/armies.svelte';
  import { libraryStore } from '../stores/library.svelte';

  const { armyId, onback }: { armyId: string; onback: () => void } = $props();

  const army = $derived(armiesStore.list.find((a) => a.id === armyId)!);
  const totalPoints = $derived(army ? calcArmyPoints(army) : 0);

  const allFilledProfiles = $derived(
    army
      ? army.detachments
          .flatMap((d) => d.slots)
          .filter((s) => s.unit !== null)
          .map((s) => units.find((u) => u.name === s.unit!.unitName))
          .filter((u): u is UnitProfile => u !== undefined)
      : [],
  );

  const uniqueProfiles = $derived([
    ...new Map(allFilledProfiles.map((p) => [p.name, p])).values(),
  ]);

  // Collect all weapon names across all slotted units: defaults + chosen options
  const allWargearNames = $derived(
    army
      ? [
          ...new Set(
            army.detachments
              .flatMap((d) => d.slots)
              .filter((s) => s.unit !== null)
              .flatMap((s) => {
                const profile = units.find((u) => u.name === s.unit!.unitName);
                if (!profile) return [];
                const names: string[] = [...profile.wargear];
                for (const sc of s.unit!.selectedChoices) {
                  const opt = profile.options[sc.optionIndex];
                  if (!opt) continue;
                  if (opt.weaponListNames) {
                    const entries = opt.weaponListNames.flatMap(
                      (n) =>
                        weaponLists.find((l) => l.name === n)?.entries ?? [],
                    );
                    const entry = entries[sc.choiceIndex];
                    if (entry) names.push(entry.weaponName);
                  } else if (opt.choices) {
                    const choice = opt.choices[sc.choiceIndex];
                    if (choice?.weaponName) names.push(choice.weaponName);
                  }
                }
                for (const group of s.unit!.modelGroups ?? []) {
                  if (group.choiceIndex === null) continue;
                  const opt = profile.options[group.optionIndex];
                  const choice = opt?.choices?.[group.choiceIndex];
                  if (choice?.weaponName) names.push(choice.weaponName);
                }
                return names;
              }),
          ),
        ]
      : [],
  );

  // Collect selected wargear items (non-weapon equipment like Vexilla, Nuncio-vox, etc.)
  const selectedWargear = $derived(
    army
      ? [
          ...new Map(
            army.detachments
              .flatMap((d) => d.slots)
              .filter((s) => s.unit !== null)
              .flatMap((s) => {
                const profile = units.find((u) => u.name === s.unit!.unitName);
                if (!profile) return [];
                const names: string[] = [...profile.wargear];
                for (const sc of s.unit!.selectedChoices) {
                  const opt = profile.options[sc.optionIndex];
                  const choice = opt?.choices?.[sc.choiceIndex];
                  if (choice?.wargearName) names.push(choice.wargearName);
                }
                return names;
              })
              .map((n) => wargearCatalogue.find((g) => g.name === n))
              .filter((g): g is WargearDetail => g !== undefined)
              .map((g) => [g.name, g] as [string, WargearDetail]),
          ).values(),
        ]
      : [],
  );

  const rangedWeapons = $derived(
    allWargearNames
      .map((n) => catalogueRanged.find((w) => w.name === n))
      .filter((w): w is RangedWeapon => w !== undefined),
  );

  const meleeWeapons = $derived(
    allWargearNames
      .map((n) => catalogueMelee.find((w) => w.name === n))
      .filter((w): w is MeleeWeapon => w !== undefined),
  );

  const STAT_KEYS = ['M', 'WS', 'BS', 'S', 'T', 'W', 'I', 'A', 'LD', 'CL', 'WP', 'IN', 'SAV', 'INV'];

  // Rule references open the shared Library panel and jump to the rule.
  function openRule(ruleName: string) {
    libraryStore.openRule(ruleName);
  }

  // ── Per-unit loadout & rule references ───────────────────────────────────────
  // Each unit profile lists the weapons / equipment / special rules it is using.
  // The full stat lines live in the Wargear & Special Rules sections below, so
  // these are rendered as clickable references that jump to the matching entry.
  function slug(s: string): string {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  interface UnitRefs {
    weapons: string[];
    equipment: string[];
    rules: string[];
  }

  const profileRefs = $derived.by(() => {
    const map = new Map<string, UnitRefs>();
    if (!army) return map;
    for (const det of army.detachments) {
      for (const s of det.slots) {
        if (!s.unit) continue;
        const profile = units.find((u) => u.name === s.unit!.unitName);
        if (!profile) continue;
        let entry = map.get(profile.name);
        if (!entry) {
          entry = { weapons: [], equipment: [], rules: [] };
          map.set(profile.name, entry);
        }
        entry.weapons.push(...profile.wargear);
        entry.rules.push(...profile.specialRules);
        for (const sc of s.unit.selectedChoices) {
          const opt = profile.options[sc.optionIndex];
          if (!opt) continue;
          if (opt.weaponListNames) {
            const entries = opt.weaponListNames.flatMap(
              (n) => weaponLists.find((l) => l.name === n)?.entries ?? [],
            );
            const e = entries[sc.choiceIndex];
            if (e) entry.weapons.push(e.weaponName);
          } else if (opt.choices) {
            const choice = opt.choices[sc.choiceIndex];
            if (choice?.weaponName) entry.weapons.push(choice.weaponName);
            if (choice?.wargearName) entry.equipment.push(choice.wargearName);
          }
        }
        for (const group of s.unit.modelGroups ?? []) {
          if (group.choiceIndex === null) continue;
          const opt = profile.options[group.optionIndex];
          const choice = opt?.choices?.[group.choiceIndex];
          if (choice?.weaponName) entry.weapons.push(choice.weaponName);
        }
      }
    }
    for (const entry of map.values()) {
      entry.weapons = [...new Set(entry.weapons)];
      entry.equipment = [...new Set(entry.equipment)];
      for (const name of entry.weapons) {
        const w =
          catalogueRanged.find((x) => x.name === name) ??
          catalogueMelee.find((x) => x.name === name);
        if (w) entry.rules.push(...w.specialRules);
      }
      entry.rules = [...new Set(entry.rules)].sort();
    }
    return map;
  });

  // Anchor id for a loadout entry, or null when it has no matching row below.
  function loadoutAnchor(name: string): string | null {
    if (
      catalogueRanged.some((w) => w.name === name) ||
      catalogueMelee.some((w) => w.name === name)
    )
      return `wpn-${slug(name)}`;
    if (selectedWargear.some((g) => g.name === name)) return `eq-${slug(name)}`;
    return null;
  }

  let flashId = $state<string | null>(null);
  let flashTimer: ReturnType<typeof setTimeout> | null = null;

  function jumpTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    flashId = id;
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => (flashId = null), 1500);
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
        <span class="report-label">Battle Report</span>
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

          {#if uniqueProfiles.length === 0}
            <p class="empty-note">No units assigned yet.</p>
          {:else}
            {#each uniqueProfiles as profile (profile.name)}
              {@const refs = profileRefs.get(profile.name)}
              <div class="unit-block">
                <div class="unit-block-header">
                  <span class="unit-block-name">{profile.name}</span>
                  <span class="unit-pts">{profile.points} pts</span>
                </div>

                {#each profile.models as model (model.name)}
                  <div class="model-block">
                    <div class="model-name">{model.name}</div>
                    <div class="stats-table-wrap">
                      <table class="stats-table">
                        <thead>
                          <tr>
                            {#each STAT_KEYS as stat}
                              <th>{stat}</th>
                            {/each}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {#each STAT_KEYS as stat}
                              <td
                                >{(model as unknown as Record<string, unknown>)[
                                  stat
                                ] ?? '—'}</td
                              >
                            {/each}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                {/each}

                {#if refs && (refs.weapons.length > 0 || refs.equipment.length > 0)}
                  <div class="ref-group">
                    <span class="ref-label">Loadout</span>
                    <div class="ref-chips">
                      {#each [...refs.weapons, ...refs.equipment] as name (name)}
                        {@const anchor = loadoutAnchor(name)}
                        {#if anchor}
                          <button
                            class="ref-chip ref-chip-link"
                            onclick={() => jumpTo(anchor)}>{name}</button
                          >
                        {:else}
                          <span class="ref-chip">{name}</span>
                        {/if}
                      {/each}
                    </div>
                  </div>
                {/if}

                {#if refs && refs.rules.length > 0}
                  <div class="ref-group">
                    <span class="ref-label">Special Rules</span>
                    <div class="ref-chips">
                      {#each refs.rules as rule (rule)}
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
              </div>
            {/each}
          {/if}
        </section>

        <!-- Wargear -->
        <section class="report-section">
          <h3 class="section-title">Wargear</h3>

          {#if rangedWeapons.length > 0}
            <h4 class="subsection-title">Ranged Weapons</h4>
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
                  </tr>
                </thead>
                <tbody>
                  {#each rangedWeapons as w (w.name)}
                    <tr
                      id="wpn-{slug(w.name)}"
                      class:ref-flash={flashId === `wpn-${slug(w.name)}`}
                    >
                      <td class="col-name">{w.name}</td>
                      <td>{w.R ?? '—'}</td>
                      <td>{w.FP ?? '—'}</td>
                      <td>{w.RS ?? '—'}</td>
                      <td>{w.AP ?? '—'}</td>
                      <td>{w.D ?? '—'}</td>
                      <td class="col-rules"
                        >{[...(w.specialRules ?? []), ...(w.traits ?? [])].join(
                          ', ',
                        ) || '—'}</td
                      >
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}

          {#if meleeWeapons.length > 0}
            <h4 class="subsection-title">Melee Weapons</h4>
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
                  </tr>
                </thead>
                <tbody>
                  {#each meleeWeapons as w (w.name)}
                    <tr
                      id="wpn-{slug(w.name)}"
                      class:ref-flash={flashId === `wpn-${slug(w.name)}`}
                    >
                      <td class="col-name">{w.name}</td>
                      <td>{w.IM ?? '—'}</td>
                      <td>{w.AM ?? '—'}</td>
                      <td>{w.SM ?? '—'}</td>
                      <td>{w.AP ?? '—'}</td>
                      <td>{w.D ?? '—'}</td>
                      <td class="col-rules"
                        >{[...(w.specialRules ?? []), ...(w.traits ?? [])].join(
                          ', ',
                        ) || '—'}</td
                      >
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}

          {#if selectedWargear.length > 0}
            <h4 class="subsection-title">Equipment</h4>
            <ul class="wargear-list">
              {#each selectedWargear as item (item.name)}
                <li
                  class="wargear-item"
                  id="eq-{slug(item.name)}"
                  class:ref-flash={flashId === `eq-${slug(item.name)}`}
                >
                  <span class="wargear-name">{item.name}</span>
                  <span class="wargear-summary">{item.summary}</span>
                  <p class="wargear-desc">{item.description}</p>
                </li>
              {/each}
            </ul>
          {/if}

          {#if rangedWeapons.length === 0 && meleeWeapons.length === 0 && selectedWargear.length === 0}
            <p class="empty-note">
              No detailed wargear data available for assigned units.
            </p>
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

  .report-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    padding: 0.15em 0.5em;
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

  .subsection-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-text-muted);
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
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .unit-block-name {
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

  /* Flash highlight applied to a jump target after it is scrolled into view */
  .ref-flash {
    animation: ref-flash-anim 1.5s ease-out;
  }

  @keyframes ref-flash-anim {
    0%,
    35% {
      background: rgba(0, 200, 255, 0.28);
    }
    100% {
      background: transparent;
    }
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

</style>
