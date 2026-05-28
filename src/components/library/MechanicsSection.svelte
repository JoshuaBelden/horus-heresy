<script lang="ts">
  import { STATUSES } from '../../data/statuses';
  import { libraryStore } from '../../stores/library.svelte';
  import { filterMechanics } from './search';

  // The entry metadata (titles + search keywords) lives in `search.ts` so the
  // panel can count results; the body markup for each entry is rendered
  // verbatim below by `renderBody`.
  const filtered = $derived(filterMechanics(libraryStore.query));
</script>

{#snippet renderBody(id: string)}
  {#if id === 'seize'}
    <p class="phase-note">
      Before the first turn, the reactive player may roll a D6. On a 6+, they
      take the first player turn instead.
    </p>
  {:else if id === 'reactions'}
    <ul class="phase-list">
      <li>Base Allotment: 1 Reaction per game turn.</li>
      <li>&gt;1500 pts: +1 Reaction Point. Master of the Legion: +1.</li>
      <li>&gt;3500 pts: +2 Reaction Points (+1 for Master of the Legion).</li>
      <li>Cannot react if: Stunned, Routed, in Combat, or already reacted.</li>
    </ul>
    <div class="reaction-list">
      <div class="reaction-item">
        <span class="reaction-name">Movement: Reposition</span><span
          class="reaction-cost">Cost 1</span
        >
        <p class="reaction-trigger">
          After an enemy unit ends its move within 12" of this unit. Move up to
          this unit's Initiative in any direction.
        </p>
      </div>
      <div class="reaction-item">
        <span class="reaction-name">Movement: Death or Glory</span><span
          class="reaction-cost">Cost 1</span
        >
        <p class="reaction-trigger">
          Enemy vehicle moves through unit and stops in base contact. Select one
          ranged or melee weapon, attack as normal. If the vehicle is not
          removed, the reacting model is removed.
        </p>
      </div>
      <div class="reaction-item">
        <span class="reaction-name">Movement: Intercept</span><span
          class="reaction-cost">Cost 1</span
        >
        <p class="reaction-trigger">
          Enemy unit deploys from reserves. Perform Snap Shot attacks (vehicles:
          defensive weapons only).
        </p>
      </div>
      <div class="reaction-item">
        <span class="reaction-name">Shooting: Return Fire</span><span
          class="reaction-cost">Cost 1</span
        >
        <p class="reaction-trigger">
          After an enemy unit makes a Shooting attack against this unit.
        </p>
      </div>
      <div class="reaction-item">
        <span class="reaction-name">Assault: Overwatch</span><span
          class="reaction-cost">Cost 1</span
        >
        <p class="reaction-trigger">
          Enemy unit performs a Charge move against this unit. Make a normal
          Shooting attack instead of a Volley attack.
        </p>
      </div>
      <div class="reaction-item">
        <span class="reaction-name">Assault: Evade</span><span
          class="reaction-cost">Cost 1</span
        >
        <p class="reaction-trigger">
          Cavalry unit gets charged. After step 4, move up to the reacting
          unit's Initiative.
        </p>
      </div>
      <div class="reaction-item">
        <span class="reaction-name">Assault: Heroic Intervention</span><span
          class="reaction-cost">Cost 1</span
        >
        <p class="reaction-trigger">
          If the active player did not declare a challenge. The reactive player
          declares a challenge. If refused, "Disgraced".
        </p>
      </div>
      <div class="reaction-item">
        <span class="reaction-name"
          >Advanced (Dark Angels): Vengeance of the First Legion</span
        ><span class="reaction-cost">Cost 1</span>
        <p class="reaction-trigger">
          Once per Battle, after the last Initiative Step of a Combat including a
          DA-only unit, but before the Make Final Pile-in. Resolve that Combat a
          second time (discard CRP from the first round, keep Challenge CRP). The
          Reacting Unit's Sword of the Order weapons gain Shred (6+).
        </p>
      </div>
    </div>
  {:else if id === 'statuses'}
    <p class="phase-note">
      All statuses impose: Disordered Charges, Combat Initiative 1, cannot hold
      objectives, no Stationary benefits.
    </p>
    <div class="status-grid">
      {#each STATUSES as s (s.id)}
        <div class="status-item">
          <span class="status-name">{s.name}</span><span class="status-desc"
            >{s.description}</span
          >
        </div>
      {/each}
    </div>
  {:else if id === 'setup'}
    <p class="phase-note">
      Add model's Initiative to its Movement. Use total (I+M):
    </p>
    <table class="cs-table">
      <thead><tr><th>I + M</th><th>Setup Move</th></tr></thead>
      <tbody>
        <tr><td>1–6</td><td>1"</td></tr>
        <tr><td>7–9</td><td>2"</td></tr>
        <tr><td>10–11</td><td>3"</td></tr>
        <tr><td>12–13</td><td>4"</td></tr>
        <tr><td>14–19</td><td>5"</td></tr>
        <tr><td>20+</td><td>6"</td></tr>
      </tbody>
    </table>
    <ul class="phase-list">
      <li>Ignore Difficult terrain.</li>
      <li>Roll for Dangerous terrain.</li>
    </ul>
  {:else if id === 'focus'}
    <p class="phase-note">Roll a D6, add modifiers:</p>
    <ul class="phase-list">
      <li>+/– Model's current Initiative</li>
      <li>+/– Weapon Initiative modifier</li>
      <li>+/– Type: Heavy (–1), Light (+1)</li>
      <li>-1 Each lost wound</li>
      <li>+1 Shield / Company Standard</li>
      <li>+1 per 5 friendly models in unit</li>
    </ul>
  {:else if id === 'resolution'}
    <ul class="phase-list">
      <li>+X Glory Points</li>
      <li>+1 For outnumbering</li>
      <li>+1 For each enemy removed</li>
      <li>+1 For each Vexilla</li>
      <li>+1 For each Company Standard</li>
      <li>+/– Other Wargear / Special Rules</li>
    </ul>
  {:else if id === 'aftermath'}
    <div class="aftermath-grid">
      <div class="aftermath-item">
        <span class="aftermath-name">Fall Back</span><span class="aftermath-desc"
          >Gains Routed status. Perform 2.3 Routed Units move.</span
        >
      </div>
      <div class="aftermath-item">
        <span class="aftermath-name">Disengage</span><span class="aftermath-desc"
          >Normal move away from combat (only if lost). Affected by terrain.</span
        >
      </div>
      <div class="aftermath-item">
        <span class="aftermath-name">Consolidate</span><span
          class="aftermath-desc"
          >Move up to base Initiative. Ignore Difficult terrain.</span
        >
      </div>
      <div class="aftermath-item">
        <span class="aftermath-name">Pursue</span><span class="aftermath-desc"
          >Move D6 + Initiative toward falling-back enemy. If contact,
          successful charge.</span
        >
      </div>
      <div class="aftermath-item">
        <span class="aftermath-name">Gun Down</span><span class="aftermath-desc"
          >Immediately make a Volley attack targeting the unit that is Falling
          Back.</span
        >
      </div>
      <div class="aftermath-item">
        <span class="aftermath-name">Hold</span><span class="aftermath-desc"
          >Immediately perform a pile-in move. If in base contact, remain in
          combat</span
        >
      </div>
    </div>
  {:else if id === 'gambits'}
    <div class="gambit-list">
      <div class="gambit-item">
        <span class="gambit-name">Seize the Initiative</span> — Roll an extra
        Focus D6, discard lowest.
      </div>
      <div class="gambit-item">
        <span class="gambit-name">Flurry of Blows</span> — +D3 attacks. Attacks
        only do 1 Damage.
      </div>
      <div class="gambit-item">
        <span class="gambit-name">Test the Foe</span> — Gain Challenge advantage
        next round.
      </div>
      <div class="gambit-item">
        <span class="gambit-name">Guard Up</span> — +1 WS, but only 1 attack.
        Missed attacks grant +1 to next Focus Roll.
      </div>
      <div class="gambit-item">
        <span class="gambit-name">Taunt & Bait</span> — Reduce WS & A to match
        opponent. +1 Combat Resolution if you win.
      </div>
      <div class="gambit-item">
        <span class="gambit-name">Grandstand</span> — Extra Focus D6, discard
        highest. +1 A per 5 models in unit.
      </div>
      <div class="gambit-item">
        <span class="gambit-name">Finishing Blow</span> — Extra Focus D6, discard
        highest. +1 Str & D to all hits.
      </div>
    </div>
  {:else if id === 'disgraced'}
    <ul class="phase-list">
      <li>Model's WS & LD halved.</li>
      <li>Unit's Initiative reduced to 1.</li>
    </ul>
  {:else if id === 'glory'}
    <p class="phase-note">
      The challenger who inflicted the most wounds wins. Winner gains Combat
      Resolution points equal to wounds inflicted. If the enemy is slain, gain
      points equal to its full Wounds characteristic instead.
    </p>
  {:else if id === 'perils'}
    <p class="phase-note">
      Rolling doubles to manifest a psychic power: Roll D3:
    </p>
    <ul class="phase-list">
      <li>
        <strong>1:</strong> Suffer 13 (–WP) wounds. Invulnerable saves only.
      </li>
      <li><strong>2–5:</strong> Unit gains Stunned status.</li>
    </ul>
  {:else if id === 'terrain'}
    <table class="cs-table">
      <tbody>
        <tr><td><strong>Light</strong></td><td>6+ Cover.</td></tr>
        <tr
          ><td><strong>Medium</strong></td><td>5+ Cover. 3" Line of Sight.</td
          ></tr
        >
        <tr
          ><td><strong>Heavy</strong></td><td>4+ Cover. Blocks Line of Sight.</td
          ></tr
        >
        <tr
          ><td><strong>Difficult</strong></td><td>Reduce Movement by –2".</td></tr
        >
        <tr
          ><td><strong>Dangerous</strong></td><td
            >Dangerous Test: on a 1, suffer AP2 D1 wound.</td
          ></tr
        >
      </tbody>
    </table>
  {/if}
{/snippet}

<div class="lib-content">
  {#if filtered.length === 0}
    <p class="mechanics-empty">No mechanics match "{libraryStore.query}"</p>
  {:else}
    <details class="ts-group" open>
      <summary class="section-title">Game Mechanics</summary>
      {#each filtered as entry (entry.id)}
        <details class="phase-block">
          <summary class="phase-title"
            >{entry.title}{#if entry.pageRef}<span class="page-ref"
                >{entry.pageRef}</span
              >{/if}</summary
          >
          {@render renderBody(entry.id)}
        </details>
      {/each}
    </details>
  {/if}
</div>

<style>
  .mechanics-empty {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    padding: 1.5rem 0.5rem;
    text-align: center;
  }
</style>
