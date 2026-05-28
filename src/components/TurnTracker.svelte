<script lang="ts">
  import { lookupRule } from '../data/specialRules';
  import {
    turnSequence,
    type TrackerSquad,
    type TurnPhase,
  } from '../data/turnSequence';
  import { libraryStore } from '../stores/library.svelte';
  import { turnTrackerStore as tt } from '../stores/turnTracker.svelte';

  const { squads, onstop }: { squads: TrackerSquad[]; onstop: () => void } =
    $props();

  const phase = $derived(
    turnSequence.find((p) => p.id === tt.currentPhaseId) ?? turnSequence[0],
  );
  const sub = $derived(
    tt.currentSubId
      ? phase.subPhases.find((s) => s.id === tt.currentSubId)
      : null,
  );

  // Player-turn progress count (squads are marked "gone" from the Unit Profiles
  // list; the tracker just summarises the tally for the current phase).
  const goneCount = $derived(squads.filter((s) => tt.hasGone(s.id)).length);

  // ── Pertinent info (opponent's turn → targeted) ───────────────────────────
  interface Tag {
    label: string;
    kind: 'rule' | 'weapon' | 'subtype';
  }
  interface RelevantSquad {
    squadId: string;
    squadName: string;
    tags: Tag[];
  }

  function matchKeywords(values: string[], keywords: string[]): string[] {
    const found: string[] = [];
    for (const v of values) {
      const lv = v.toLowerCase();
      if (keywords.some((k) => lv.includes(k.toLowerCase()))) found.push(v);
    }
    return [...new Set(found)];
  }

  // Pertinent tags for a single squad given the phase's relevance config.
  function tagsFor(squad: TrackerSquad, p: TurnPhase): Tag[] {
    const rel = p.relevance;
    const tags: Tag[] = [];
    const seen = new Set<string>();
    const add = (label: string, kind: Tag['kind']) => {
      const key = `${kind}:${label}`;
      if (seen.has(key)) return;
      seen.add(key);
      tags.push({ label, kind });
    };

    // Unit special rules matching the phase's rule keywords.
    if (rel.ruleKeywords) {
      for (const r of matchKeywords(squad.rules, rel.ruleKeywords))
        add(r, 'rule');
    }

    // Weapons of the relevant class, and weapon rules/traits of interest.
    const weapons =
      rel.weaponClass === 'ranged'
        ? squad.ranged
        : rel.weaponClass === 'melee'
          ? squad.melee
          : [];
    if (rel.weaponClass && weapons.length > 0) {
      add(rel.weaponClass === 'ranged' ? 'Ranged' : 'Melee', 'weapon');
    }
    if (rel.weaponKeywords) {
      for (const w of weapons) {
        for (const m of matchKeywords(
          [...w.specialRules, ...w.traits],
          rel.weaponKeywords,
        ))
          add(m, 'weapon');
      }
    }

    // Model subtypes (e.g. challenge-eligible sub-types).
    if (rel.subtypes) {
      for (const m of matchKeywords(squad.subtypes, rel.subtypes))
        add(m, 'subtype');
    }

    return tags;
  }

  // Squads the player has flagged as under attack — always listed (even with no
  // pertinent tags) so the player can see what's targeted this phase.
  const targetedSquads = $derived<RelevantSquad[]>(
    squads
      .filter((s) => tt.isTargeted(s.id))
      .map((s) => ({
        squadId: s.id,
        squadName: s.name,
        tags: tagsFor(s, phase),
      })),
  );

  // ── Library links ─────────────────────────────────────────────────────────
  function openRule(name: string) {
    libraryStore.openRule(name);
  }
  function openReactions() {
    libraryStore.setTab('mechanics');
    libraryStore.query = 'reactions';
    libraryStore.open = true;
  }
</script>

<div class="tracker">
  <!-- Bar -->
  <div class="tracker-bar">
    <span class="tracker-label">Turn Tracker</span>
    <div class="view-toggle">
      <button
        class="seg"
        class:active={tt.turnOwner === 'player'}
        onclick={() => (tt.turnOwner = 'player')}>Your Turn</button
      >
      <button
        class="seg"
        class:active={tt.turnOwner === 'opponent'}
        onclick={() => (tt.turnOwner = 'opponent')}>Opponent's Turn</button
      >
    </div>
    <div class="bar-actions">
      <button class="bar-btn" onclick={() => tt.resetTurn()}>New Turn</button>
      <button class="bar-btn" onclick={onstop}>Stop Tracking</button>
    </div>
  </div>

  <!-- Phase squares -->
  <div class="phase-row">
    {#each turnSequence as p (p.id)}
      <button
        class="phase-square"
        class:active={p.id === tt.currentPhaseId}
        onclick={() => tt.selectPhase(p.id)}
      >
        <span class="phase-num">{p.num}.</span>
        <span class="phase-name">{p.name}</span>
      </button>
    {/each}
  </div>

  <!-- Sub-phases of the current phase -->
  {#if phase.subPhases.length > 0}
    <div class="sub-row">
      {#each phase.subPhases as s (s.id)}
        <button
          class="sub-chip"
          class:active={s.id === tt.currentSubId}
          onclick={() =>
            (tt.currentSubId = tt.currentSubId === s.id ? null : s.id)}
        >
          {s.label}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Description -->
  <div class="description">
    <span class="phase-ref">{phase.name} <em>{phase.pageRef}</em></span>
    <p class="desc-text">{sub ? sub.description : phase.summary}</p>
  </div>

  <!-- Context panel -->
  {#if tt.turnOwner === 'player'}
    <div class="context">
      <div class="context-head">
        <span class="context-count">{goneCount} of {squads.length} acted</span>
      </div>
    </div>
  {:else}
    <div class="context">
      {#if phase.relevance.reactions && phase.relevance.reactions.length > 0}
        <div class="reactions">
          <span class="context-title">Reactions</span>
          <div class="chip-row">
            {#each phase.relevance.reactions as r (r)}
              <button class="ref-chip ref-chip-link" onclick={openReactions}
                >{r}</button
              >
            {/each}
          </div>
        </div>
      {/if}

      <div class="reactions">
        <span class="context-title">Targeted Squads — {phase.name} Phase</span>
        {#if targetedSquads.length === 0}
          <p class="empty-note">
            Mark a squad as <em>Targeted</em> from the Unit Profiles list below when
            the enemy attacks it to see its pertinent rules for this phase.
          </p>
        {:else}
          {#each targetedSquads as rs (rs.squadId)}
            <div class="rel-squad">
              <span class="squad-name">{rs.squadName}</span>
              {#if rs.tags.length === 0}
                <span class="empty-note">No pertinent rules this phase.</span>
              {:else}
                <div class="chip-row">
                  {#each rs.tags as t (t.kind + t.label)}
                    {#if t.kind === 'rule' && lookupRule(t.label)}
                      <button
                        class="ref-chip ref-chip-link"
                        onclick={() => openRule(t.label)}>{t.label}</button
                      >
                    {:else}
                      <span
                        class="ref-chip"
                        class:tag-weapon={t.kind === 'weapon'}>{t.label}</span
                      >
                    {/if}
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .tracker {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg-raised);
    padding: 1rem 1.25rem 1.25rem;
  }

  /* ── Bar (mirrors .page-header) ──────────────── */
  .tracker-bar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding-bottom: 0.85rem;
    border-bottom: 1px solid var(--color-border);
  }

  .tracker-label {
    font-family: 'Orbitron', monospace;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-accent);
    white-space: nowrap;
  }

  .view-toggle {
    display: flex;
    border: 1px solid var(--color-border);
  }

  .view-toggle {
    flex: 1;
    max-width: 360px;
  }

  .seg {
    flex: 1;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: none;
    border: none;
    color: var(--color-text-muted);
    padding: 0.4rem 0.85rem;
    cursor: pointer;
    white-space: nowrap;
    transition:
      background 0.12s,
      color 0.12s;
  }

  .seg + .seg {
    border-left: 1px solid var(--color-border);
  }

  .seg.active {
    background: rgba(0, 200, 255, 0.1);
    color: var(--color-accent);
  }

  .bar-actions {
    display: flex;
    gap: 0.5rem;
    margin-left: auto;
  }

  .bar-btn {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.1em;
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
  }

  .bar-btn:hover {
    border-color: var(--color-accent-dim);
    color: var(--color-accent);
  }

  /* ── Phase squares ───────────────────────────── */
  .phase-row {
    display: flex;
    gap: 0.5rem;
  }

  .phase-square {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.6rem 0.4rem;
    background: rgba(0, 0, 0, 0.15);
    border: 1px solid var(--color-border);
    cursor: pointer;
    transition:
      border-color 0.12s,
      background 0.12s;
  }

  .phase-square:hover {
    border-color: var(--color-accent-dim);
  }

  .phase-square.active {
    border-color: var(--color-accent);
    background: rgba(0, 200, 255, 0.08);
    box-shadow: 0 0 8px rgba(0, 200, 255, 0.25);
  }

  .phase-num {
    font-family: 'Orbitron', monospace;
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-gold);
  }

  .phase-name {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    text-align: center;
  }

  .phase-square.active .phase-name {
    color: var(--color-accent);
  }

  /* ── Sub-phase chips ─────────────────────────── */
  .sub-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .sub-chip {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.74rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    background: rgba(0, 0, 0, 0.15);
    padding: 0.2em 0.6em;
    cursor: pointer;
    transition:
      background 0.12s,
      border-color 0.12s,
      color 0.12s;
  }

  .sub-chip:hover {
    border-color: var(--color-accent-dim);
    color: var(--color-accent);
  }

  .sub-chip.active {
    color: var(--color-accent);
    border-color: var(--color-accent);
    background: rgba(0, 200, 255, 0.12);
  }

  /* ── Description ─────────────────────────────── */
  .description {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.6rem 0.8rem;
    border-left: 2px solid var(--color-accent-dim);
    background: rgba(0, 0, 0, 0.12);
  }

  .phase-ref {
    font-family: 'Orbitron', monospace;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-accent);
  }

  .phase-ref em {
    font-style: normal;
    color: var(--color-text-muted);
    font-size: 0.62rem;
  }

  .desc-text {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.84rem;
    line-height: 1.5;
    color: var(--color-text);
    margin: 0;
  }

  /* ── Context panel ───────────────────────────── */
  .context {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }

  .context-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
  }

  .context-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .context-count {
    font-family: 'Orbitron', monospace;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-gold);
    white-space: nowrap;
  }

  .squad-name {
    font-family: 'Orbitron', monospace;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-text);
  }

  /* ── Reactions / Relevant units ──────────────── */
  .reactions {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .rel-squad {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--color-border);
    background: rgba(0, 0, 0, 0.12);
  }

  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 0.4rem;
  }

  .ref-chip {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    background: rgba(0, 0, 0, 0.15);
    padding: 0.12em 0.5em;
    line-height: 1.3;
  }

  .ref-chip.tag-weapon {
    color: var(--color-gold);
    border-color: rgba(201, 147, 58, 0.4);
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

  .empty-note {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    font-style: italic;
    margin: 0;
    line-height: 1.5;
  }

  .empty-note em {
    color: var(--color-accent);
    font-style: normal;
  }
</style>
