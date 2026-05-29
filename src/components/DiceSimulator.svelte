<script lang="ts">
  const { onclose }: { onclose: () => void } = $props();

  type Criteria = 'gt' | 'gte' | 'lt' | 'lte';

  const criteriaOptions: { value: Criteria; label: string }[] = [
    { value: 'gt', label: 'Greater than' },
    { value: 'gte', label: 'Equal or greater' },
    { value: 'lt', label: 'Less than' },
    { value: 'lte', label: 'Equal or less' },
  ];

  let count = $state(5);
  let target = $state(4);
  let criteria = $state<Criteria>('gte');

  // Each die: its rolled face, and whether it's a hit. While rolling, `face`
  // cycles through random values for the tumbling effect.
  type Die = { face: number; hit: boolean };
  let dice = $state<Die[]>([]);
  let rolling = $state(false);
  let hasRolled = $state(false);

  // Pip layouts for each face (positions on a 3x3 grid).
  const pipLayouts: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  function rollOne(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  function isHit(face: number): boolean {
    switch (criteria) {
      case 'gt':
        return face > target;
      case 'gte':
        return face >= target;
      case 'lt':
        return face < target;
      case 'lte':
        return face <= target;
    }
  }

  let tumbleTimer: ReturnType<typeof setInterval> | null = null;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;

  function roll() {
    if (rolling) return;
    const n = Math.max(1, Math.min(100, Math.floor(count)));
    count = n;

    rolling = true;
    hasRolled = true;
    dice = Array.from({ length: n }, () => ({ face: rollOne(), hit: false }));

    // Tumble: cycle faces every 80ms for ~1 second.
    tumbleTimer = setInterval(() => {
      dice = dice.map(() => ({ face: rollOne(), hit: false }));
    }, 80);

    settleTimer = setTimeout(() => {
      if (tumbleTimer) clearInterval(tumbleTimer);
      tumbleTimer = null;
      dice = dice.map(() => {
        const face = rollOne();
        return { face, hit: isHit(face) };
      });
      rolling = false;
    }, 1000);
  }

  const hits = $derived(dice.filter((d) => d.hit).length);

  $effect(() => {
    return () => {
      if (tumbleTimer) clearInterval(tumbleTimer);
      if (settleTimer) clearTimeout(settleTimer);
    };
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="backdrop" onclick={onclose}>
  <div
    class="modal"
    onclick={(e) => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="modal-header">
      <span class="step-title">Dice Simulator</span>
      <button class="close-btn" onclick={onclose} aria-label="Close">×</button>
    </div>

    <div class="modal-body">
      <div class="controls">
        <label class="field">
          <span class="field-label">Number of D6</span>
          <input
            class="num-input"
            type="number"
            min="1"
            max="100"
            bind:value={count}
          />
        </label>

        <label class="field">
          <span class="field-label">Target number</span>
          <input
            class="num-input"
            type="number"
            min="1"
            max="6"
            bind:value={target}
          />
        </label>

        <label class="field">
          <span class="field-label">Criteria</span>
          <select class="select-input" bind:value={criteria}>
            {#each criteriaOptions as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </label>
      </div>

      <button class="roll-btn" onclick={roll} disabled={rolling}>
        {rolling ? 'Rolling…' : 'Roll'}
      </button>

      {#if hasRolled}
        <div class="dice-area">
          {#each dice as die, i (i)}
            <div
              class="die"
              class:rolling
              class:hit={!rolling && die.hit}
              class:miss={!rolling && !die.hit}
            >
              <div class="pips">
                {#each Array(9) as _, p}
                  <span
                    class="pip"
                    class:filled={pipLayouts[die.face].includes(p)}
                  ></span>
                {/each}
              </div>
            </div>
          {/each}
        </div>

        {#if !rolling}
          <div class="result-summary">
            <span class="result-hits">{hits}</span>
            <span class="result-label">
              {hits === 1 ? 'hit' : 'hits'} of {dice.length}
            </span>
          </div>
        {/if}
      {/if}
    </div>
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
    max-width: 480px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 0 50px rgba(0, 0, 0, 0.7);
    overflow: hidden;
  }

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

  .step-title {
    font-family: 'Orbitron', monospace;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text);
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

  .modal-body {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    overflow-y: auto;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    flex: 1;
    min-width: 120px;
  }

  .field-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .num-input,
  .select-input {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font-family: 'Orbitron', monospace;
    font-size: 0.9rem;
    font-weight: 700;
    padding: 0.5rem 0.65rem;
    outline: none;
    transition: border-color 0.12s;
  }

  .select-input {
    font-family: 'Rajdhani', sans-serif;
    font-weight: 600;
    letter-spacing: 0.03em;
    cursor: pointer;
  }

  .num-input:focus,
  .select-input:focus {
    border-color: var(--color-accent);
  }

  .roll-btn {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    background: rgba(0, 200, 255, 0.1);
    border: 1px solid var(--color-accent-dim);
    color: var(--color-accent);
    padding: 0.7rem 1.4rem;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }

  .roll-btn:hover:not(:disabled) {
    background: rgba(0, 200, 255, 0.18);
    border-color: var(--color-accent);
  }

  .roll-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  /* ── Dice ────────────────────────────────────── */
  .dice-area {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    justify-content: center;
  }

  .die {
    width: 46px;
    height: 46px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-bg);
    padding: 6px;
    box-sizing: border-box;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
  }

  .die.rolling {
    animation: tumble 0.4s linear infinite;
    border-color: var(--color-accent-dim);
  }

  @keyframes tumble {
    0% {
      transform: rotate(0deg) scale(1);
    }
    50% {
      transform: rotate(180deg) scale(0.9);
    }
    100% {
      transform: rotate(360deg) scale(1);
    }
  }

  .die.hit {
    border-color: #3fb950;
    background: rgba(63, 185, 80, 0.12);
    box-shadow: 0 0 10px rgba(63, 185, 80, 0.3);
  }

  .die.miss {
    border-color: var(--color-danger);
    background: rgba(176, 48, 48, 0.12);
  }

  .pips {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    width: 100%;
    height: 100%;
    gap: 1px;
  }

  .pip {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pip.filled::after {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-text);
  }

  .die.hit .pip.filled::after {
    background: #3fb950;
  }

  .die.miss .pip.filled::after {
    background: var(--color-danger);
  }

  /* ── Result summary ──────────────────────────── */
  .result-summary {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.5rem;
  }

  .result-hits {
    font-family: 'Orbitron', monospace;
    font-size: 1.6rem;
    font-weight: 900;
    color: #3fb950;
  }

  .result-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }
</style>
