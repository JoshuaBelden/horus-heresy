<script lang="ts">
  import { STATUSES } from '../data/statuses';
  import { turnTrackerStore as tt } from '../stores/turnTracker.svelte';

  const { squadId }: { squadId: string } = $props();

  let open = $state(false);
  let root = $state<HTMLElement>();

  // Active statuses resolved to their definitions, in catalogue order so tags
  // read consistently regardless of the order they were applied.
  const activeStatuses = $derived(
    STATUSES.filter((s) => tt.hasStatus(squadId, s.id)),
  );
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && open) open = false;
  }}
  onclick={(e) => {
    if (open && root && !root.contains(e.target as Node)) {
      open = false;
    }
  }}
/>

<div class="status-control" bind:this={root}>
  <div class="trigger-wrap">
    <button
      class="status-trigger"
      class:is-open={open}
      aria-expanded={open}
      onclick={() => (open = !open)}
    >
      + Status <span class="caret">▾</span>
    </button>

    {#if open}
      <div class="status-popover" role="menu">
        {#each STATUSES as s (s.id)}
          <button
            class="status-option"
            class:is-on={tt.hasStatus(squadId, s.id)}
            role="menuitemcheckbox"
            aria-checked={tt.hasStatus(squadId, s.id)}
            onclick={() => tt.toggleStatus(squadId, s.id)}
          >
            <span class="option-check">{tt.hasStatus(squadId, s.id) ? '✓' : ''}</span>
            <span class="option-text">
              <span class="option-name">{s.name}</span>
              <span class="option-desc">{s.description}</span>
            </span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  {#each activeStatuses as s (s.id)}
    <span class="status-tag">
      {s.name}
      <button
        class="status-tag-x"
        aria-label={`Clear ${s.name}`}
        title={`Clear ${s.name}`}
        onclick={() => tt.removeStatus(squadId, s.id)}>✕</button
      >
    </span>
  {/each}
</div>

<style>
  .status-control {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem 0.45rem;
  }

  /* Anchor for the absolutely-positioned popover. */
  .trigger-wrap {
    position: relative;
    flex-shrink: 0;
  }

  .status-trigger {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: none;
    border: 1px dashed var(--color-border);
    color: var(--color-text-muted);
    padding: 0.25rem 0.55rem;
    cursor: pointer;
    white-space: nowrap;
    transition:
      border-color 0.12s,
      color 0.12s;
  }

  .status-trigger:hover,
  .status-trigger.is-open {
    border-color: var(--color-danger);
    color: var(--color-danger);
  }

  .caret {
    font-size: 0.6rem;
  }

  /* ── Popover ─────────────────────────────────── */
  .status-popover {
    position: absolute;
    top: calc(100% + 0.3rem);
    left: 0;
    z-index: 60;
    width: 240px;
    background: var(--color-bg-raised);
    border: 1px solid var(--color-danger);
    box-shadow:
      0 0 16px rgba(176, 48, 48, 0.18),
      0 4px 16px rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
  }

  .status-option {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    text-align: left;
    background: none;
    border: none;
    border-bottom: 1px solid var(--color-border);
    padding: 0.5rem 0.65rem;
    cursor: pointer;
    transition: background 0.12s;
  }

  .status-option:last-child {
    border-bottom: none;
  }

  .status-option:hover {
    background: rgba(176, 48, 48, 0.08);
  }

  .option-check {
    flex-shrink: 0;
    width: 0.9rem;
    font-size: 0.75rem;
    line-height: 1.2;
    color: var(--color-danger);
  }

  .option-text {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  .option-name {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-text);
  }

  .status-option.is-on .option-name {
    color: var(--color-danger);
  }

  .option-desc {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.7rem;
    line-height: 1.35;
    color: var(--color-text-muted);
  }

  /* ── Tags ────────────────────────────────────── */
  .status-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-danger);
    border: 1px solid var(--color-danger);
    background: rgba(176, 48, 48, 0.12);
    padding: 0.12em 0.2em 0.12em 0.5em;
    line-height: 1.3;
  }

  .status-tag-x {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--color-danger);
    opacity: 0.7;
    cursor: pointer;
    font-size: 0.7rem;
    line-height: 1;
    padding: 0.1em 0.25em;
    transition:
      opacity 0.12s,
      color 0.12s;
  }

  .status-tag-x:hover {
    opacity: 1;
    color: #ff6a6a;
  }
</style>
