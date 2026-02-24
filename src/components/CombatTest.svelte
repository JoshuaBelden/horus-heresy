<script lang="ts">
  import { rangedHitTest, getHitTarget } from '../combat';
  import type { AttackMode, HitResult, HitTarget } from '../combat';

  let bs     = $state(4);
  let mode   = $state<AttackMode>('standard');
  let history = $state<HitResult[]>([]);

  const target = $derived(getHitTarget(bs, mode));
  const latest = $derived(history[0] ?? null);

  const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  function formatTarget(t: HitTarget): string {
    if (t.kind === 'auto')      return 'Auto Hit';
    if (t.kind === 'fail')      return 'Auto Fail';
    if (t.kind === 'threshold') return `${t.min}+`;
    return `C${t.criticalMin}+`;
  }

  function bsLabel(v: number): string {
    return v >= 10 ? '10+' : String(v);
  }

  function roll() {
    history = [rangedHitTest(bs, mode), ...history].slice(0, 10);
  }
</script>

<div class="combat-test">
  <div class="panel-header">
    <span class="panel-eyebrow">Combat Simulator</span>
    <h2 class="panel-title">Ranged Hit Test</h2>
  </div>

  <div class="controls-card">
    <div class="control-group">
      <label class="clabel" for="bs-select">Ballistic Skill</label>
      <select id="bs-select" class="bs-select" bind:value={bs}>
        {#each [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as v}
          <option value={v}>{bsLabel(v)}</option>
        {/each}
      </select>
    </div>

    <div class="control-group">
      <span class="clabel">Attack Mode</span>
      <div class="mode-toggle">
        <button
          class="mode-btn"
          class:active={mode === 'standard'}
          onclick={() => (mode = 'standard')}
        >Standard</button>
        <button
          class="mode-btn"
          class:active={mode === 'snapshot'}
          onclick={() => (mode = 'snapshot')}
        >Snapshot</button>
      </div>
    </div>

    <div class="control-group">
      <span class="clabel">Required</span>
      <div class="target-display">
        <span class="target-value">{formatTarget(target)}</span>
        {#if target.kind === 'critical'}
          <span class="target-note">hit 2+ · crit {target.criticalMin}+</span>
        {:else if target.kind === 'auto'}
          <span class="target-note">no roll required</span>
        {:else if target.kind === 'fail'}
          <span class="target-note">cannot fire</span>
        {/if}
      </div>
    </div>
  </div>

  <button class="roll-btn" onclick={roll}>Roll D6</button>

  {#if latest}
    <div
      class="result-card"
      class:result-hit={latest.hit && !latest.critical}
      class:result-crit={latest.critical}
      class:result-miss={!latest.hit}
    >
      <span class="die-face">{DICE_FACES[latest.roll]}</span>
      <div class="result-text">
        <span class="result-roll">rolled {latest.roll}</span>
        <span class="result-label">
          {#if latest.critical}Critical Hit
          {:else if latest.hit}Hit
          {:else}Miss
          {/if}
        </span>
        {#if latest.target.kind === 'auto'}
          <span class="result-note">automatic hit — no roll required</span>
        {:else if latest.target.kind === 'fail'}
          <span class="result-note">automatic fail — cannot snapshot</span>
        {/if}
      </div>
    </div>
  {:else}
    <div class="result-empty">— roll to begin —</div>
  {/if}

  {#if history.length > 1}
    <div class="history">
      <span class="history-label">Recent</span>
      <div class="history-list">
        {#each history.slice(1) as r}
          <div
            class="history-item"
            class:h-hit={r.hit && !r.critical}
            class:h-crit={r.critical}
            class:h-miss={!r.hit}
            title={r.critical ? 'Critical Hit' : r.hit ? 'Hit' : 'Miss'}
          >
            <span class="h-die">{DICE_FACES[r.roll]}</span>
            <span class="h-label">
              {#if r.critical}★{:else if r.hit}●{:else}○{/if}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .combat-test {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 640px;
    margin: 0 auto;
    width: 100%;
  }

  /* ── Header ──────────────────────────────────── */
  .panel-header {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .panel-eyebrow {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.7rem;
    letter-spacing: 0.4em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .panel-title {
    font-family: 'Orbitron', monospace;
    font-size: 1.4rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-accent);
    text-shadow: 0 0 14px rgba(0, 200, 255, 0.4);
  }

  /* ── Controls ────────────────────────────────── */
  .controls-card {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem 2rem;
    align-items: flex-end;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    padding: 1.25rem 1.5rem;
    border-radius: 2px;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .clabel {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.65rem;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .bs-select {
    background: var(--color-bg-raised);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font-family: 'Orbitron', monospace;
    font-size: 1rem;
    padding: 0.45rem 0.85rem;
    border-radius: 2px;
    cursor: pointer;
    min-width: 80px;
    text-align: center;
  }

  .bs-select:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 6px var(--color-accent-dim);
  }

  .mode-toggle {
    display: flex;
  }

  .mode-btn {
    background: var(--color-bg-raised);
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 0.45rem 1rem;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s,
      border-color 0.15s;
  }

  .mode-btn:first-child {
    border-radius: 2px 0 0 2px;
  }

  .mode-btn:last-child {
    border-radius: 0 2px 2px 0;
    border-left: none;
  }

  .mode-btn.active {
    background: var(--color-accent-dim);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .target-display {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .target-value {
    font-family: 'Orbitron', monospace;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .target-note {
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
  }

  /* ── Roll button ─────────────────────────────── */
  .roll-btn {
    align-self: flex-start;
    background: transparent;
    border: 2px solid var(--color-accent);
    color: var(--color-accent);
    font-family: 'Orbitron', monospace;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    padding: 0.85rem 3rem;
    cursor: pointer;
    transition:
      background 0.15s,
      box-shadow 0.15s,
      transform 0.1s;
    box-shadow: 0 0 8px var(--color-accent-dim);
  }

  .roll-btn:hover {
    background: rgba(0, 200, 255, 0.08);
    box-shadow: 0 0 18px var(--color-accent-dim), 0 0 6px rgba(0, 200, 255, 0.3);
  }

  .roll-btn:active {
    transform: scale(0.97);
  }

  /* ── Result ──────────────────────────────────── */
  .result-card {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 1.5rem 1.75rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg-surface);
    border-radius: 2px;
    transition:
      border-color 0.25s,
      box-shadow 0.25s;
  }

  .result-hit {
    border-color: var(--color-accent);
    box-shadow: 0 0 16px rgba(0, 200, 255, 0.12);
  }

  .result-crit {
    border-color: var(--color-gold);
    box-shadow: 0 0 20px rgba(201, 147, 58, 0.2);
  }

  .result-miss {
    border-color: #2a1010;
  }

  .die-face {
    font-size: 3.75rem;
    line-height: 1;
    user-select: none;
  }

  .result-text {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .result-roll {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .result-label {
    font-family: 'Orbitron', monospace;
    font-size: 1.6rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    line-height: 1.1;
  }

  .result-hit .result-label {
    color: var(--color-accent);
    text-shadow: 0 0 12px rgba(0, 200, 255, 0.5);
  }

  .result-crit .result-label {
    color: var(--color-gold);
    text-shadow: 0 0 14px rgba(201, 147, 58, 0.5);
  }

  .result-miss .result-label {
    color: #604040;
  }

  .result-note {
    font-size: 0.68rem;
    letter-spacing: 0.15em;
    color: var(--color-text-muted);
    margin-top: 0.15rem;
  }

  .result-empty {
    text-align: center;
    color: var(--color-text-muted);
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.85rem;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    padding: 2rem;
    border: 1px dashed var(--color-border);
    border-radius: 2px;
  }

  /* ── History ─────────────────────────────────── */
  .history {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .history-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.62rem;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    min-width: 3rem;
  }

  .history-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .history-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
    padding: 0.3rem 0.4rem;
    background: var(--color-bg-raised);
    border: 1px solid var(--color-border);
    border-radius: 2px;
    min-width: 2.25rem;
  }

  .h-die {
    font-size: 1.2rem;
    line-height: 1;
    user-select: none;
  }

  .h-label {
    font-size: 0.6rem;
    line-height: 1;
  }

  .h-hit { border-color: var(--color-accent-dim); }
  .h-crit { border-color: var(--color-gold-dim); }

  .h-hit .h-label  { color: var(--color-accent); }
  .h-crit .h-label { color: var(--color-gold); }
  .h-miss .h-label { color: var(--color-text-muted); }
</style>
