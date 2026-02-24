<script lang="ts">
  import ArmyManager from './components/ArmyManager.svelte';
  import CombatTest from './components/CombatTest.svelte';
  import SpecialRulesList from './components/SpecialRulesList.svelte';
  import UnitList from './components/UnitList.svelte';
  import WargearList from './components/WargearList.svelte';

  let section = $state<'roster' | 'wargear' | 'combat' | 'army' | 'rules'>(
    'army',
  );
</script>

<div class="layout">
  <header class="site-header">
    <div class="header-inner">
      <div class="header-rule top-rule"></div>
      <div class="title-block">
        <span class="eyebrow">Age of Darkness</span>
        <h1 class="site-title">
          <span class="title-warhammer">Warhammer</span>
          <span class="title-hh">Horus Heresy</span>
          <span class="title-sub">Army Builder &amp; Simulator</span>
        </h1>
      </div>
      <div class="header-rule bottom-rule"></div>
    </div>
  </header>

  <nav class="section-nav">
    <button
      class="nav-btn"
      class:active={section === 'army'}
      onclick={() => (section = 'army')}>Army Builder</button
    >
    <button
      class="nav-btn"
      class:active={section === 'roster'}
      onclick={() => (section = 'roster')}>Unit Roster</button
    >
    <button
      class="nav-btn"
      class:active={section === 'wargear'}
      onclick={() => (section = 'wargear')}>Wargear</button
    >
    <button
      class="nav-btn"
      class:active={section === 'combat'}
      onclick={() => (section = 'combat')}>Combat Simulator</button
    >
    <button
      class="nav-btn"
      class:active={section === 'rules'}
      onclick={() => (section = 'rules')}>Special Rules</button
    >
  </nav>

  <main class="main-content">
    {#if section === 'army'}
      <ArmyManager />
    {:else if section === 'roster'}
      <UnitList />
    {:else if section === 'wargear'}
      <WargearList />
    {:else if section === 'rules'}
      <SpecialRulesList />
    {:else}
      <CombatTest />
    {/if}
  </main>

  <footer class="site-footer">
    <span class="footer-text"
      >The Emperor Protects &mdash; Build your forces wisely.</span
    >
  </footer>
</div>

<style>
  .layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    width: 100%;
  }

  /* ── Header ─────────────────────────────────── */
  .site-header {
    width: 100%;
    background: linear-gradient(
      180deg,
      #050709 0%,
      var(--color-bg-surface) 100%
    );
    border-bottom: 1px solid var(--color-border);
    padding: 2.5rem 1rem 2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  /* Subtle scanline texture overlay */
  .site-header::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 200, 255, 0.015) 2px,
      rgba(0, 200, 255, 0.015) 4px
    );
    pointer-events: none;
  }

  .header-inner {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .header-rule {
    width: min(600px, 90%);
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--color-accent-dim) 20%,
      var(--color-accent) 50%,
      var(--color-accent-dim) 80%,
      transparent 100%
    );
    box-shadow: 0 0 8px var(--color-accent-dim);
  }

  .title-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .eyebrow {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.4em;
    text-transform: uppercase;
    color: var(--color-gold);
    opacity: 0.85;
  }

  .site-title {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    line-height: 1;
  }

  .title-warhammer {
    font-family: 'Orbitron', monospace;
    font-size: clamp(1.1rem, 3vw, 1.6rem);
    font-weight: 700;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .title-hh {
    font-family: 'Orbitron', monospace;
    font-size: clamp(1.8rem, 6vw, 3.8rem);
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-accent);
    text-shadow:
      0 0 20px rgba(0, 200, 255, 0.6),
      0 0 50px rgba(0, 200, 255, 0.2);
  }

  .title-sub {
    font-family: 'Rajdhani', sans-serif;
    font-size: clamp(0.8rem, 2vw, 1.05rem);
    font-weight: 600;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: var(--color-gold);
    opacity: 0.75;
  }

  /* ── Nav ─────────────────────────────────────── */
  .section-nav {
    display: flex;
    justify-content: center;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-surface);
    padding: 0 1.5rem;
  }

  .nav-btn {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--color-text-muted);
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    padding: 0.85rem 1.25rem;
    cursor: pointer;
    transition:
      color 0.15s,
      border-color 0.15s;
    margin-bottom: -1px;
  }

  .nav-btn.active {
    color: var(--color-accent);
    border-bottom-color: var(--color-accent);
  }

  .nav-btn:hover:not(.active) {
    color: var(--color-text);
  }

  /* ── Main ────────────────────────────────────── */
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 2rem 1.5rem;
  }

  /* ── Footer ──────────────────────────────────── */
  .site-footer {
    width: 100%;
    padding: 1rem;
    text-align: center;
    border-top: 1px solid var(--color-border);
    background: var(--color-bg-surface);
  }

  .footer-text {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.75rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }
</style>
