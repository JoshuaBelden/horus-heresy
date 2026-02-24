<script lang="ts">
  import { getHitTarget, hitProbability, woundProbability } from '../combat';
  import { lookupRule } from '../data/specialRules';
  import type { Gambit, ModelProfile, SpecialRule, UnitProfile } from '../data/types';

  interface Props {
    unit: UnitProfile;
    onclose: () => void;
  }

  let { unit, onclose }: Props = $props();

  const statKeys = [
    'M',
    'WS',
    'BS',
    'S',
    'T',
    'W',
    'I',
    'A',
    'LD',
    'CL',
    'WP',
    'IN',
    'SAV',
    'INV',
  ] as const;
  type StatKey = (typeof statKeys)[number];

  function getStat(model: ModelProfile, stat: StatKey): string | number {
    return (model as unknown as Record<string, unknown>)[stat] as
      | string
      | number;
  }

  function pct(n: number): string {
    return `${Math.round(n * 100)}%`;
  }

  function targetLabel(bs: number, mode: 'standard' | 'snapshot'): string {
    const t = getHitTarget(bs, mode);
    if (t.kind === 'auto') return 'Auto';
    if (t.kind === 'fail') return 'Fail';
    if (t.kind === 'threshold') return `${t.min}+`;
    return `C${t.criticalMin}+`;
  }

  const woundToughnesses = [3, 4, 5, 6, 7, 8] as const;

  function woundTargetLabel(strength: number, toughness: number): string {
    const { target } = woundProbability(strength, toughness);
    return target.kind === 'impossible' ? '—' : `${target.min}+`;
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
    };
    return map[role] ?? '#5a7080';
  }

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }

  // ── Rule popover ──────────────────────────────────────────────────────────
  interface Popover {
    rule: SpecialRule;
    x: number;
    y: number;
  }
  let popover = $state<Popover | null>(null);

  function openRule(e: MouseEvent, ruleName: string) {
    const rule = lookupRule(ruleName);
    if (!rule) return;
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - 340);
    const y = Math.min(rect.bottom + 6, window.innerHeight - 220);
    popover = { rule, x, y };
  }

  function closePopover() {
    popover = null;
  }

  function getTypeRuleName(type: string): string | null {
    if (lookupRule(type + ' Type')) return type + ' Type';
    if (lookupRule(type)) return type;
    return null;
  }

  function getSubtypeRuleName(subtype: string): string | null {
    if (lookupRule(subtype + ' Sub-Type')) return subtype + ' Sub-Type';
    if (lookupRule(subtype)) return subtype;
    return null;
  }

  function openGambit(e: MouseEvent, gambit: Gambit) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - 340);
    const y = Math.min(rect.bottom + 6, window.innerHeight - 220);
    popover = { rule: gambit, x, y };
  }
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape') {
      if (popover) {
        closePopover();
      } else {
        onclose();
      }
    }
  }}
  onclick={(e) => {
    if (popover && !(e.target as HTMLElement).closest('.rule-popover')) {
      closePopover();
    }
  }}
/>

<div class="backdrop" onclick={handleBackdrop} role="presentation">
  <div
    class="panel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <div class="panel-header">
      <div class="title-group">
        <span
          class="role-badge"
          style="color: {getRoleColor(unit.role)}; border-color: {getRoleColor(
            unit.role,
          )}44">{unit.role}</span
        >
        <h2 id="modal-title" class="unit-name">{unit.name}</h2>
      </div>
      <div class="header-actions">
        <span class="pts-tag">{unit.points} pts</span>
        <button class="close-btn" onclick={onclose} aria-label="Close">✕</button
        >
      </div>
    </div>

    <div class="panel-body">
      <p class="description">{unit.description}</p>

      <section class="section">
        <h3 class="section-label">Composition</h3>
        <p class="composition-text">{unit.composition}</p>
      </section>
      
      <section class="section">
        <h3 class="section-label">Unit Profiles</h3>
        <div class="table-scroll">
          <table class="stats-table">
            <thead>
              <tr>
                <th class="col-name">Name</th>
                <th class="col-type">Type</th>
                {#each statKeys as stat}
                  <th
                    class:col-morale={stat === 'LD' ||
                      stat === 'CL' ||
                      stat === 'WP' ||
                      stat === 'IN'}
                    class:col-morale-start={stat === 'LD'}>{stat}</th
                  >
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each unit.models as model}
                {@const typeRule = getTypeRuleName(model.type)}
                <tr>
                  <td class="col-name"
                    >{model.name}{#if model.subtype}{@const subtypeRule = getSubtypeRuleName(model.subtype)}&nbsp;({#if subtypeRule}<button class="rule-link" onclick={(e) => openRule(e, subtypeRule)}>{model.subtype}</button>{:else}{model.subtype}{/if}){/if}</td
                  >
                  <td class="col-type">{#if typeRule}<button class="rule-link type-link" onclick={(e) => openRule(e, typeRule)}>{model.type}</button>{:else}{model.type}{/if}</td>
                  {#each statKeys as stat}
                    <td
                      class:col-morale={stat === 'LD' ||
                        stat === 'CL' ||
                        stat === 'WP' ||
                        stat === 'IN'}
                      class:col-morale-start={stat === 'LD'}
                      >{getStat(model, stat)}</td
                    >
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>

      {#if unit.rangedWeapons && unit.rangedWeapons.length > 0}
        <section class="section">
          <h3 class="section-label">Ranged Weapons</h3>
          <div class="table-scroll">
            <table class="weapons-table">
              <thead>
                <tr>
                  <th class="col-wname">Ranged Weapon</th>
                  <th>R</th>
                  <th>FP</th>
                  <th>RS</th>
                  <th>AP</th>
                  <th>D</th>
                  <th class="col-traits">Special Rules</th>
                  <th class="col-traits">Traits</th>
                </tr>
              </thead>
              <tbody>
                {#each unit.rangedWeapons as weapon}
                  <tr class="weapon-row">
                    <td class="col-wname">{weapon.name}</td>
                    <td>{weapon.R}</td>
                    <td>{weapon.FP}</td>
                    <td>{weapon.RS}</td>
                    <td>{weapon.AP}</td>
                    <td>{weapon.D}</td>
                    <td>
                      {#each weapon.specialRules as rule, i}
                        {#if i > 0}<span class="rule-sep">, </span>{/if}
                        {#if lookupRule(rule)}
                          <button
                            class="rule-link"
                            onclick={(e) => openRule(e, rule)}>{rule}</button
                          >
                        {:else}
                          <span class="rule-plain">{rule}</span>
                        {/if}
                      {/each}
                      {#if weapon.specialRules.length === 0}—{/if}
                    </td>
                    <td class="col-traits">
                      {#each weapon.traits as trait, i}
                        {#if i > 0}<span class="rule-sep">, </span>{/if}
                        {#if lookupRule(trait)}
                          <button
                            class="rule-link"
                            onclick={(e) => openRule(e, trait)}>{trait}</button
                          >
                        {:else}
                          <span>{trait}</span>
                        {/if}
                      {/each}
                      {#if weapon.traits.length === 0}—{/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </section>
      {/if}

      {#if unit.meleeWeapons && unit.meleeWeapons.length > 0}
        <section class="section">
          <h3 class="section-label">Melee Weapons</h3>
          <div class="table-scroll">
            <table class="weapons-table">
              <thead>
                <tr>
                  <th class="col-wname">Melee Weapon</th>
                  <th>IM</th>
                  <th>AM</th>
                  <th>SM</th>
                  <th>AP</th>
                  <th>D</th>
                  <th class="col-traits">Special Rules</th>
                  <th class="col-traits">Traits</th>
                </tr>
              </thead>
              <tbody>
                {#each unit.meleeWeapons as weapon}
                  <tr>
                    <td class="col-wname">{weapon.name}</td>
                    <td>{weapon.IM}</td>
                    <td>{weapon.AM}</td>
                    <td>{weapon.SM}</td>
                    <td>{weapon.AP}</td>
                    <td>{weapon.D}</td>
                    <td>
                      {#each weapon.specialRules as rule, i}
                        {#if i > 0}<span class="rule-sep">, </span>{/if}
                        {#if lookupRule(rule)}
                          <button
                            class="rule-link"
                            onclick={(e) => openRule(e, rule)}>{rule}</button
                          >
                        {:else}
                          <span class="rule-plain">{rule}</span>
                        {/if}
                      {/each}
                      {#if weapon.specialRules.length === 0}—{/if}
                    </td>
                    <td class="col-traits">
                      {#each weapon.traits as trait, i}
                        {#if i > 0}<span class="rule-sep">, </span>{/if}
                        {#if lookupRule(trait)}
                          <button
                            class="rule-link"
                            onclick={(e) => openRule(e, trait)}>{trait}</button
                          >
                        {:else}
                          <span>{trait}</span>
                        {/if}
                      {/each}
                      {#if weapon.traits.length === 0}—{/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </section>
      {/if}

      <section class="section">
        <h3 class="section-label">Ranged Accuracy</h3>
        <div class="table-scroll">
          <table class="acc-table">
            <thead>
              <tr>
                <th class="col-model">Model</th>
                <th class="col-bs">BS</th>
                <th colspan="2">Standard</th>
                <th colspan="2">Snapshot</th>
              </tr>
              <tr class="sub-header">
                <th class="col-model"></th>
                <th class="col-bs"></th>
                <th>Target</th>
                <th>Hit %</th>
                <th>Target</th>
                <th>Hit %</th>
              </tr>
            </thead>
            <tbody>
              {#each unit.models as model}
                {@const std = hitProbability(model.BS, 'standard')}
                {@const snap = hitProbability(model.BS, 'snapshot')}
                <tr>
                  <td class="col-model"
                    >{model.name}{model.subtype
                      ? ` (${model.subtype})`
                      : ''}</td
                  >
                  <td class="col-bs">{model.BS}</td>
                  <td class="col-target">{targetLabel(model.BS, 'standard')}</td
                  >
                  <td class="col-pct">
                    <span class="hit-pct">{pct(std.hitChance)}</span>
                    {#if std.critChance > 0}
                      <span class="crit-pct" title="Critical Hit chance"
                        >{pct(std.critChance)} crit</span
                      >
                    {/if}
                  </td>
                  <td class="col-target">{targetLabel(model.BS, 'snapshot')}</td
                  >
                  <td class="col-pct">
                    <span class:zero-pct={snap.hitChance === 0}
                      >{pct(snap.hitChance)}</span
                    >
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>

      <section class="section">
        <h3 class="section-label">Wound Probability (vs Toughness)</h3>
        <div class="table-scroll">
          <table class="acc-table wound-table">
            <thead>
              <tr>
                <th class="col-model">Model</th>
                <th class="col-bs">S</th>
                {#each woundToughnesses as t}
                  <th>T{t}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each unit.models as model}
                <tr>
                  <td class="col-model"
                    >{model.name}{model.subtype
                      ? ` (${model.subtype})`
                      : ''}</td
                  >
                  <td class="col-bs">{model.S}</td>
                  {#each woundToughnesses as t}
                    {@const result = woundProbability(model.S, t)}
                    <td
                      class="col-wound"
                      class:wound-impossible={result.target.kind ===
                        'impossible'}
                    >
                      <div class="wound-cell">
                        <span class="wound-target"
                          >{woundTargetLabel(model.S, t)}</span
                        >
                        {#if result.target.kind !== 'impossible'}
                          <span class="wound-pct"
                            >{pct(result.woundChance)}</span
                          >
                        {/if}
                      </div>
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>

      <div class="three-col">
        <section class="section">
          <h3 class="section-label">Wargear</h3>
          <ul class="item-list">
            {#each unit.wargear as item}
              <li>{item}</li>
            {/each}
          </ul>
        </section>

        <section class="section">
          <h3 class="section-label">Special Rules</h3>
          <ul class="item-list">
            {#each unit.specialRules as rule}
              <li>
                {#if lookupRule(rule)}
                  <button class="rule-link" onclick={(e) => openRule(e, rule)}>{rule}</button>
                {:else}
                  {rule}
                {/if}
              </li>
            {/each}
          </ul>
        </section>

        <section class="section">
          <h3 class="section-label">Traits</h3>
          <ul class="item-list">
            {#each unit.traits as trait}
              <li>{trait}</li>
            {/each}
          </ul>
        </section>
      </div>

      {#if unit.gambits && unit.gambits.length > 0}
        <section class="section">
          <h3 class="section-label">Gambits</h3>
          <ul class="gambits-list">
            {#each unit.gambits as gambit}
              <li class="gambit-item">
                <button class="rule-link gambit-name" onclick={(e) => openGambit(e, gambit)}
                  >{gambit.name}</button
                >
                {#if gambit.summary}
                  <span class="gambit-summary">{gambit.summary}</span>
                {/if}
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if unit.options.length > 0}
        <section class="section">
          <h3 class="section-label">Options</h3>
          <ul class="options-list">
            {#each unit.options as option}
              <li class="option-item">
                <p class="option-desc">{option.description}</p>
                {#if option.choices}
                  <ul class="choices-list">
                    {#each option.choices as choice}
                      <li>
                        {choice.description}
                        {#if choice.pointsPerModel !== undefined}
                          <span class="pts-note"
                            >+{choice.pointsPerModel} pts/model</span
                          >
                        {:else if choice.points !== undefined}
                          <span class="pts-note">+{choice.points} pts</span>
                        {/if}
                      </li>
                    {/each}
                  </ul>
                {/if}
                {#if option.pointsPerModel !== undefined}
                  <span class="pts-note"
                    >+{option.pointsPerModel} pts/model</span
                  >
                {:else if option.points !== undefined}
                  <span class="pts-note">+{option.points} pts</span>
                {/if}
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    </div>
  </div>
</div>

{#if popover}
  <div
    class="rule-popover"
    style="left: {popover.x}px; top: {popover.y}px"
    role="tooltip"
  >
    <div class="popover-header">
      <span class="popover-name">{popover.rule.name}</span>
      <button class="popover-close" onclick={closePopover} aria-label="Close"
        >✕</button
      >
    </div>
    {#if popover.rule.summary}
      <p class="popover-summary">"{popover.rule.summary}"</p>
    {/if}
    <div class="popover-body">
      {#each popover.rule.description.split('\n\n') as para}
        <p class="popover-para">{para}</p>
      {/each}
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(5, 7, 9, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1rem;
    backdrop-filter: blur(2px);
  }

  .panel {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    box-shadow:
      0 0 40px rgba(0, 200, 255, 0.08),
      0 8px 32px rgba(0, 0, 0, 0.6);
    width: min(900px, 100%);
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Header ─────────────────────────────── */
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-raised);
    flex-shrink: 0;
  }

  .title-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .role-badge {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    border: 1px solid;
    padding: 0.2em 0.6em;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .unit-name {
    font-family: 'Orbitron', monospace;
    font-size: clamp(1rem, 2.5vw, 1.4rem);
    font-weight: 700;
    color: var(--color-accent);
    letter-spacing: 0.05em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-shrink: 0;
  }

  .pts-tag {
    font-family: 'Orbitron', monospace;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-gold);
    white-space: nowrap;
  }

  .close-btn {
    background: none;
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    cursor: pointer;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    transition:
      color 0.15s,
      border-color 0.15s;
  }

  .close-btn:hover {
    color: var(--color-text);
    border-color: var(--color-accent-dim);
  }

  /* ── Body ────────────────────────────────── */
  .panel-body {
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  .description {
    font-size: 0.9rem;
    color: var(--color-text-muted);
    line-height: 1.7;
    border-left: 2px solid var(--color-accent-dim);
    padding-left: 1rem;
    font-style: italic;
  }

  .section-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--color-gold);
    margin-bottom: 0.6rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid var(--color-border);
  }

  .composition-text {
    font-size: 0.85rem;
    color: var(--color-text);
    line-height: 1.6;
  }

  /* ── Stats Table ─────────────────────────── */
  .table-scroll {
    overflow-x: auto;
  }

  .stats-table {
    width: 100%;
    min-width: 700px;
    border-collapse: collapse;
    font-size: 0.8rem;
  }

  .stats-table th {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    background: var(--color-bg-raised);
    padding: 0.5rem 0.6rem;
    text-align: center;
    border: 1px solid var(--color-border);
    white-space: nowrap;
  }

  .stats-table th.col-name,
  .stats-table th.col-type {
    text-align: left;
  }

  .stats-table td {
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--color-border);
    text-align: center;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .stats-table td.col-name,
  .stats-table td.col-type {
    text-align: left;
    white-space: nowrap;
  }

  .stats-table td.col-name {
    color: var(--color-accent);
    font-weight: 600;
    font-size: 0.8rem;
  }

  .stats-table td.col-type {
    color: var(--color-text-muted);
    font-size: 0.75rem;
  }

  .stats-table th.col-morale {
    color: var(--color-gold);
    background: rgba(201, 147, 58, 0.06);
  }

  .stats-table th.col-morale-start,
  .stats-table td.col-morale-start {
    border-left: 2px solid rgba(201, 147, 58, 0.35);
  }

  .stats-table td.col-morale {
    color: rgba(201, 147, 58, 0.85);
    background: rgba(201, 147, 58, 0.03);
  }

  .stats-table tbody tr:hover td {
    background: rgba(0, 200, 255, 0.03);
  }

  /* ── Accuracy Table ─────────────────────── */
  .acc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
  }

  .acc-table th {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    background: var(--color-bg-raised);
    padding: 0.5rem 0.6rem;
    text-align: center;
    border: 1px solid var(--color-border);
    white-space: nowrap;
  }

  .acc-table th.col-model {
    text-align: left;
  }

  .acc-table .sub-header th {
    font-size: 0.58rem;
    color: #3a5060;
    background: var(--color-bg-surface);
    padding: 0.25rem 0.6rem;
  }

  .acc-table td {
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--color-border);
    text-align: center;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .acc-table td.col-model {
    text-align: left;
    white-space: nowrap;
    color: var(--color-accent);
    font-weight: 600;
  }

  .acc-table td.col-bs {
    color: var(--color-text-muted);
    font-family: 'Orbitron', monospace;
    font-size: 0.75rem;
  }

  .acc-table td.col-target {
    font-family: 'Orbitron', monospace;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .acc-table td.col-pct {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
  }

  .hit-pct {
    color: var(--color-accent);
    font-weight: 600;
  }

  .crit-pct {
    font-size: 0.65rem;
    color: var(--color-gold);
    letter-spacing: 0.05em;
  }

  .zero-pct {
    color: var(--color-text-muted);
    opacity: 0.5;
  }

  .acc-table tbody tr:hover td {
    background: rgba(0, 200, 255, 0.03);
  }

  /* ── Wound Table ─────────────────────────── */
  .wound-table td.col-wound {
    text-align: center;
    min-width: 3.5rem;
  }

  .wound-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
  }

  .wound-target {
    font-family: 'Orbitron', monospace;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .wound-pct {
    color: var(--color-accent);
    font-weight: 600;
    font-size: 0.8rem;
  }

  .wound-impossible .wound-target {
    opacity: 0.3;
  }

  /* ── Three Column ────────────────────────── */
  .three-col {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1.5rem;
  }

  .item-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .item-list li {
    font-size: 0.85rem;
    color: var(--color-text);
    padding-left: 0.75rem;
    position: relative;
  }

  .item-list li::before {
    content: '—';
    position: absolute;
    left: 0;
    color: var(--color-accent-dim);
    font-size: 0.7rem;
  }

  /* ── Gambits ─────────────────────────────── */
  .gambits-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .gambit-item {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg-raised);
  }

  .gambit-name {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .gambit-summary {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-style: italic;
    line-height: 1.5;
  }

  /* ── Options ─────────────────────────────── */
  .options-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .option-item {
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg-raised);
  }

  .option-desc {
    font-size: 0.85rem;
    color: var(--color-text);
    margin-bottom: 0.5rem;
    line-height: 1.5;
  }

  .choices-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding-left: 1rem;
    border-left: 2px solid var(--color-border);
  }

  .choices-list li {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .choices-list li::before {
    content: '◆';
    font-size: 0.45rem;
    color: var(--color-accent-dim);
    flex-shrink: 0;
  }

  .pts-note {
    font-family: 'Orbitron', monospace;
    font-size: 0.65rem;
    color: var(--color-gold);
    margin-left: 0.25rem;
  }

  /* ── Weapons Table ───────────────────────── */
  .weapons-table {
    width: 100%;
    min-width: 540px;
    border-collapse: collapse;
    font-size: 0.8rem;
  }

  .weapons-table th {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    background: var(--color-bg-raised);
    padding: 0.5rem 0.6rem;
    text-align: center;
    border: 1px solid var(--color-border);
    white-space: nowrap;
  }

  .weapons-table th.col-wname,
  .weapons-table th.col-traits {
    text-align: left;
  }

  .weapons-table td {
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--color-border);
    text-align: center;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .weapons-table td.col-wname {
    text-align: left;
    color: var(--color-accent);
    font-weight: 600;
    white-space: nowrap;
  }

  .weapons-table td.col-traits {
    text-align: left;
    color: var(--color-text-muted);
    font-size: 0.75rem;
  }

  .weapons-table tr.weapon-row:hover td {
    background: rgba(0, 200, 255, 0.03);
  }


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

  .type-link {
    color: var(--color-text-muted);
    text-decoration-color: rgba(100, 130, 150, 0.4);
  }

  .type-link:hover {
    color: var(--color-text);
    text-decoration-color: rgba(0, 200, 255, 0.5);
  }

  .rule-plain {
    color: var(--color-text-muted);
  }

  .rule-sep {
    color: var(--color-text-muted);
  }

  /* ── Rule Popover ────────────────────────── */
  .rule-popover {
    position: fixed;
    z-index: 200;
    width: 320px;
    max-height: 50vh;
    overflow-y: auto;
    background: var(--color-bg-raised);
    border: 1px solid var(--color-accent-dim);
    box-shadow:
      0 0 20px rgba(0, 200, 255, 0.12),
      0 4px 16px rgba(0, 0, 0, 0.6);
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .popover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .popover-name {
    font-family: 'Orbitron', monospace;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-accent);
    letter-spacing: 0.05em;
  }

  .popover-close {
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 0.75rem;
    padding: 0.1rem 0.3rem;
    flex-shrink: 0;
    transition: color 0.15s;
  }

  .popover-close:hover {
    color: var(--color-text);
  }

  .popover-summary {
    font-size: 0.75rem;
    color: var(--color-gold);
    font-style: italic;
    line-height: 1.5;
    border-left: 2px solid var(--color-gold);
    padding-left: 0.5rem;
  }

  .popover-body {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .popover-para {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    line-height: 1.6;
  }
</style>
