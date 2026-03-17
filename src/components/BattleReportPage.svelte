<script lang="ts">
  import type { UnitProfile, SpecialRule, RangedWeapon, MeleeWeapon, WargearDetail } from '../data/types';
  import { units, specialRules as specialRulesData, rangedWeapons as catalogueRanged, meleeWeapons as catalogueMelee, weaponLists, wargear as wargearCatalogue } from '../data';
  import { armiesStore, calcArmyPoints } from '../stores/armies.svelte';

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

  const uniqueProfiles = $derived(
    [...new Map(allFilledProfiles.map((p) => [p.name, p])).values()],
  );

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
                      (n) => weaponLists.find((l) => l.name === n)?.entries ?? [],
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
                const names: string[] = [];
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

  const weaponSpecialRules = $derived(
    [...new Set([...rangedWeapons, ...meleeWeapons].flatMap((w) => w.specialRules))].sort(),
  );

  const specialRules = $derived(
    [...new Set([...uniqueProfiles.flatMap((p) => p.specialRules), ...weaponSpecialRules])].sort(),
  );

  const STAT_KEYS = ['M', 'WS', 'BS', 'S', 'T', 'W', 'I', 'A', 'LD', 'SAV'];

  let activeRule = $state<SpecialRule | null>(null);

  function lookupRule(ruleName: string): SpecialRule | undefined {
    // Exact match first, then prefix match for parameterized rules like "Breaching (6)"
    return (
      specialRulesData.find((r) => r.name === ruleName) ??
      specialRulesData.find((r) => ruleName.startsWith(r.name.replace(/ \(X\)$/, '')))
    );
  }

  function openRule(ruleName: string) {
    const entry = lookupRule(ruleName);
    if (entry) activeRule = entry;
  }

  function closeRule() {
    activeRule = null;
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
          style="color: {FACTION_COLORS[army.faction] ?? '#5a7080'}; border-color: {FACTION_COLORS[army.faction] ?? '#5a7080'}55"
        >{army.faction}</span>
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
              <div class="unit-block">
                <div class="unit-block-header">
                  <span class="unit-block-name">{profile.name}</span>
                  <span class="unit-pts">{profile.points} pts</span>
                </div>
                <p class="unit-composition">{profile.composition}</p>

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
                              <td>{(model as unknown as Record<string, unknown>)[stat] ?? '—'}</td>
                            {/each}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                {/each}
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
                    <tr>
                      <td class="col-name">{w.name}</td>
                      <td>{w.R ?? '—'}</td>
                      <td>{w.FP ?? '—'}</td>
                      <td>{w.RS ?? '—'}</td>
                      <td>{w.AP ?? '—'}</td>
                      <td>{w.D ?? '—'}</td>
                      <td class="col-rules">{[...(w.specialRules ?? []), ...(w.traits ?? [])].join(', ') || '—'}</td>
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
                    <tr>
                      <td class="col-name">{w.name}</td>
                      <td>{w.IM ?? '—'}</td>
                      <td>{w.AM ?? '—'}</td>
                      <td>{w.SM ?? '—'}</td>
                      <td>{w.AP ?? '—'}</td>
                      <td>{w.D ?? '—'}</td>
                      <td class="col-rules">{[...(w.specialRules ?? []), ...(w.traits ?? [])].join(', ') || '—'}</td>
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
                <li class="wargear-item">
                  <span class="wargear-name">{item.name}</span>
                  <span class="wargear-summary">{item.summary}</span>
                  <p class="wargear-desc">{item.description}</p>
                </li>
              {/each}
            </ul>
          {/if}

          {#if rangedWeapons.length === 0 && meleeWeapons.length === 0 && selectedWargear.length === 0}
            <p class="empty-note">No detailed wargear data available for assigned units.</p>
          {/if}
        </section>

        <!-- Special Rules -->
        <section class="report-section">
          <h3 class="section-title">Special Rules</h3>
          {#if specialRules.length === 0}
            <p class="empty-note">No special rules for assigned units.</p>
          {:else}
            <ul class="rules-list">
              {#each specialRules as rule (rule)}
                {@const hasEntry = !!lookupRule(rule)}
                <li>
                  <button
                    class="rule-item"
                    class:rule-item-clickable={hasEntry}
                    onclick={() => openRule(rule)}
                    disabled={!hasEntry}
                  >{rule}</button>
                </li>
              {/each}
            </ul>
          {/if}
        </section>

      </div>

      <!-- Right: Turn Sequence -->
      <div class="turn-sequence-col">
        <div class="turn-sequence-sticky">

          <details class="ts-group">
            <summary class="section-title">Turn Sequence <span class="page-ref">p.240</span></summary>

            <!-- 1. START -->
            <details class="phase-block">
              <summary class="phase-title">1. Start Phase <span class="page-ref">p.240</span></summary>
              <ul class="phase-list">
                <li>Administer <em>Effects</em> that begin or end at the start of the turn.</li>
                <li>If triggered by the effect's rule, the active player performs a check.</li>
              </ul>
            </details>

            <!-- 2. MOVEMENT -->
            <details class="phase-block">
              <summary class="phase-title">2. Movement Phase <span class="page-ref">p.242</span></summary>
              <details class="sub-section">
                <summary class="sub-title">2.1 Reserves</summary>
                <ul class="phase-list">
                  <li>On a successful 3+, bring in a unit of reserves.</li>
                  <li><strong>Entering from Reserves:</strong> Move onto the battlefield from your deployment zone edge. May shoot & charge.</li>
                  <li><strong>Deep Strike</strong> (from turn 2): Place a model anywhere, others within 6" & coherency. May only shoot. Enemy may Intercept.</li>
                  <li><strong>Outflank:</strong> Enter from any edge not within opposing deployment zone or 7" of enemy. Embarked models may not charge.</li>
                </ul>
              </details>
              <details class="sub-section">
                <summary class="sub-title">2.2 Moving Units <span class="page-ref">p.243</span></summary>
                <ul class="phase-list">
                  <li>Move each model up to its Movement characteristic.</li>
                  <li><strong>Rush:</strong> Add Initiative to movement. Cannot shoot or charge.</li>
                  <li>Cannot move if: entered from reserves, pinned, routed, or in combat.</li>
                  <li>Models can't end within 1" of enemies or impassable terrain.</li>
                </ul>
              </details>
            </details>

            <!-- 3. SHOOTING -->
            <details class="phase-block">
              <summary class="phase-title">3. Shooting Phase <span class="page-ref">p.247</span></summary>
              <details class="sub-section">
                <summary class="sub-title">3.1 Shooting</summary>
                <p class="phase-note">Rushed, locked in combat, or embarked units may not shoot.</p>
                <ol class="phase-steps">
                  <li>Select Target</li>
                  <li>Check Target (LoS & facing)</li>
                  <li>Declare Weapon</li>
                  <li>Set Fire Groups</li>
                  <li>Resolve Fire Group — roll D6 × total Firepower</li>
                  <li>Make Hit Tests (Ranged hit table)</li>
                  <li>Wound Tests</li>
                  <li>Assign Wounds</li>
                  <li>Saving Throws & Damage Mitigation</li>
                  <li>Next Fire Group → step 5</li>
                  <li>Remove Casualties (0 wounds/HP)</li>
                </ol>
              </details>
              <details class="sub-section">
                <summary class="sub-title">3.2 Morale <span class="page-ref">p.253</span></summary>
                <p class="phase-note">Check with 2D6 if any condition below applies:</p>
                <table class="cs-table">
                  <thead><tr><th>Condition</th><th>Check</th><th>Fail</th></tr></thead>
                  <tbody>
                    <tr><td>Out of Coherency</td><td>Cool</td><td>Suppressed</td></tr>
                    <tr><td>Hit by Suppressive (X)</td><td>Cool</td><td>Suppressed</td></tr>
                    <tr><td>Hit by Stun (X)</td><td>Cool</td><td>Stunned</td></tr>
                    <tr><td>Wound from Pinning (X)</td><td>Cool</td><td>Pinned</td></tr>
                    <tr><td>Wound from Panic (X)</td><td>LD</td><td>Routed</td></tr>
                    <tr><td>≥25% casualties</td><td>LD</td><td>Routed</td></tr>
                  </tbody>
                </table>
              </details>
            </details>

            <!-- 4. ASSAULT -->
            <details class="phase-block">
              <summary class="phase-title">4. Assault Phase <span class="page-ref">p.252</span></summary>
              <details class="sub-section">
                <summary class="sub-title">4.1 Charges</summary>
                <ul class="phase-list">
                  <li>Cannot charge if: in combat, rushed, pinned, or routed.</li>
                  <li>Stunned, Suppressed, or disembarked units make <em>Disordered Charges</em>.</li>
                  <li>Any Tactical Status → Combat Initiative of 1.</li>
                </ul>
                <ol class="phase-steps">
                  <li>Declare Target</li>
                  <li>Line of Sight / Range (within 12")</li>
                  <li>Make Set-up Move</li>
                  <li>Make Volley Attacks (Assault weapons & Snap Shots only)</li>
                  <li>Make Charge Move (roll 2D6, pick highest)</li>
                </ol>
                <ul class="phase-list">
                  <li>If in base contact after Set-up, charge complete — skip 4–5.</li>
                  <li>Volley attacks never inflict statuses.</li>
                  <li>Disordered Charges: no Set-up Move or Volley Attacks.</li>
                  <li>Not in base contact after step 5 → Cool check; fail = Stunned.</li>
                </ul>
              </details>
              <details class="sub-section">
                <summary class="sub-title">4.2 Challenges</summary>
                <p class="phase-note">Available to non-routed Command / Champion / Paragon sub-types.</p>
                <ol class="phase-steps">
                  <li>Declare Challenge (active player first)</li>
                  <li>Face-off — select a Gambit (1st round: active player first)</li>
                  <li>Weapon Selection — reactive player selects Gambit</li>
                  <li>Focus Roll — winner gains +1 A & Challenge advantage</li>
                  <li>Strike — perform Fight sub-phase steps 3.3–3.7</li>
                  <li>Challenge Result — repeat 2–5 or go to Glory step</li>
                  <li>Glory Points — winner gains extra Combat Resolution points</li>
                </ol>
              </details>
              <details class="sub-section">
                <summary class="sub-title">4.3 Fight</summary>
                <p class="phase-note">Resolved in initiative order, highest to lowest.</p>
                <ol class="phase-steps">
                  <li>Determine Combat</li>
                  <li>Declare Weapons (both sides)</li>
                  <li>Combat Initiative — for each Initiative Step:
                    <ol class="phase-steps phase-steps-inner">
                      <li>Pile-in Move (up to model's Initiative)</li>
                      <li>Declare Engaged (base-to-base or ≤2")</li>
                      <li>Set Strike Group</li>
                      <li>Roll to Hit</li>
                      <li>Roll to Wound</li>
                      <li>Saving Throws & Damage Mitigation</li>
                      <li>Remove Casualties</li>
                      <li>Final Pile-in Moves</li>
                    </ol>
                  </li>
                  <li>Combat Resolution</li>
                </ol>
              </details>
              <details class="sub-section">
                <summary class="sub-title">4.4 Resolution</summary>
                <ol class="phase-steps">
                  <li>Combat Resolution — summarize each side's total</li>
                  <li>Declare Winner — highest total Combat Resolution</li>
                  <li>Panic Check — loser rolls LD with –X modifier</li>
                  <li>Aftermath — each player selects an Aftermath option</li>
                </ol>
                <p class="phase-note">Failed Panic check → unit is Routed & must Fall Back.</p>
              </details>
            </details>

            <!-- 5. END PHASE -->
            <details class="phase-block">
              <summary class="phase-title">5. End Phase <span class="page-ref">p.274</span></summary>
              <details class="sub-section">
                <summary class="sub-title">5.1 Effects</summary>
                <p class="phase-note">Any effects that start or end at "End of the turn" happen here.</p>
              </details>
              <details class="sub-section">
                <summary class="sub-title">5.2 Statuses</summary>
                <p class="phase-note">Perform checks (Cool/LD) or Repairs (6+) to remove ongoing statuses.</p>
              </details>
              <details class="sub-section">
                <summary class="sub-title">5.3 Victory Points</summary>
                <p class="phase-note">Score Mission Objectives and gain Victory Points if applicable.</p>
              </details>
            </details>
          </details>

          <!-- ─── GAME MECHANICS ─── -->
          <details class="ts-group">
            <summary class="section-title">Game Mechanics</summary>

            <!-- Seize the Initiative -->
            <details class="phase-block">
              <summary class="phase-title">Seize the Initiative <span class="page-ref">p.310</span></summary>
              <p class="phase-note">Before the first turn, the reactive player may roll a D6. On a 6+, they take the first player turn instead.</p>
            </details>

            <!-- Reactions -->
            <details class="phase-block">
              <summary class="phase-title">Reactions <span class="page-ref">p.204</span></summary>
              <ul class="phase-list">
                <li>Base Allotment: 1 Reaction per game turn.</li>
                <li>&gt;1500 pts: +1 Reaction Point. Master of the Legion: +1.</li>
                <li>&gt;3500 pts: +2 Reaction Points (+1 for Master of the Legion).</li>
                <li>Cannot react if: Stunned, Routed, in Combat, or already reacted.</li>
              </ul>
            </details>

            <!-- Core & Advanced Reactions -->
            <details class="phase-block">
              <summary class="phase-title">Core & Advanced Reactions <span class="page-ref">p.206</span></summary>
              <div class="reaction-list">
                <div class="reaction-item">
                  <span class="reaction-name">Reposition</span><span class="reaction-cost">Cost 1</span>
                  <p class="reaction-trigger">After an enemy unit ends its move within 12" of this unit. Move up to this unit's Initiative in any direction.</p>
                </div>
                <div class="reaction-item">
                  <span class="reaction-name">Death or Glory</span><span class="reaction-cost">Cost 1</span>
                  <p class="reaction-trigger">Enemy vehicle moves through unit and stops in base contact. Select one ranged or melee weapon, attack as normal. If the vehicle is not removed, the reacting model is removed.</p>
                </div>
                <div class="reaction-item">
                  <span class="reaction-name">Intercept</span><span class="reaction-cost">Cost 1</span>
                  <p class="reaction-trigger">Enemy unit deploys from reserves. Perform Snap Shot attacks (vehicles: defensive weapons only).</p>
                </div>
                <div class="reaction-item">
                  <span class="reaction-name">Heroic Intervention</span><span class="reaction-cost">Cost 1</span>
                  <p class="reaction-trigger">After an enemy unit makes a Shooting attack against this unit (before step 11). The reacting unit may perform a shooting attack back.</p>
                </div>
                <div class="reaction-item">
                  <span class="reaction-name">Overwatch</span><span class="reaction-cost">Cost 1</span>
                  <p class="reaction-trigger">Enemy unit performs a Charge move against this unit. Make a normal Shooting attack instead of a Volley attack.</p>
                </div>
                <div class="reaction-item">
                  <span class="reaction-name">Evade</span><span class="reaction-cost">Cost 1</span>
                  <p class="reaction-trigger">Cavalry unit gets charged. After step 4, move up to the reacting unit's Initiative.</p>
                </div>
              </div>
            </details>

            <!-- Ranged Hit Test Table -->
            <details class="phase-block">
              <summary class="phase-title">Ranged Hit Test Table <span class="page-ref">p.194</span></summary>
              <div class="table-scroll">
                <table class="cs-table cs-table-sm">
                  <thead>
                    <tr><th>BS</th><th>≥10</th><th>9</th><th>8</th><th>7</th><th>6</th><th>5</th><th>4</th><th>3</th><th>2</th><th>1</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Hit</td><td>A*</td><td>C3+</td><td>C4+</td><td>C5+</td><td>C6+</td><td>2+</td><td>3+</td><td>4+</td><td>5+</td><td>6+</td></tr>
                    <tr><td>Snap</td><td>2+</td><td>3+</td><td>4+</td><td>4+</td><td>4+</td><td>5+</td><td>5+</td><td>6+</td><td>6+</td><td>F*</td></tr>
                  </tbody>
                </table>
              </div>
              <ul class="phase-list">
                <li>A* = Automatic Critical Hit. F* = Automatic miss.</li>
                <li>CX+: Normal hits on 2+. Critical Hit on value X.</li>
                <li>Critical Hit: +1 Damage and auto-wounds.</li>
              </ul>
            </details>

            <!-- Tactical Statuses -->
            <details class="phase-block">
              <summary class="phase-title">Tactical Statuses <span class="page-ref">p.201</span></summary>
              <p class="phase-note">All statuses impose: Disordered Charges, Combat Initiative 1, cannot hold objectives, no Stationary benefits.</p>
              <div class="status-grid">
                <div class="status-item"><span class="status-name">Pinned</span><span class="status-desc">Can't move or Charge. Can't Rush or Disengage.</span></div>
                <div class="status-item"><span class="status-name">Suppressed</span><span class="status-desc">Attacks as Snap Shots only.</span></div>
                <div class="status-item"><span class="status-name">Stunned</span><span class="status-desc">Can't declare Reactions.</span></div>
                <div class="status-item"><span class="status-name">Routed</span><span class="status-desc">Must fall back during Movement. All other status penalties apply.</span></div>
              </div>
            </details>

            <!-- Vehicle Damage Table -->
            <details class="phase-block">
              <summary class="phase-title">Vehicle Damage Table <span class="page-ref">p.221</span></summary>
              <p class="phase-note">Vehicles suffering Glancing hits roll on this table:</p>
              <table class="cs-table">
                <tbody>
                  <tr><td>1–2</td><td>Impaired Sensors → Stunned</td></tr>
                  <tr><td>3–4</td><td>Impaired Motors → Pinned</td></tr>
                  <tr><td>5–6</td><td>Weapons Damaged → Suppressed</td></tr>
                </tbody>
              </table>
              <p class="phase-note">Already has that status → lose a Hull Point instead (no saves).</p>
            </details>

            <!-- Setup Move -->
            <details class="phase-block">
              <summary class="phase-title">Setup Move</summary>
              <p class="phase-note">Add model's Initiative to its Movement. Use total (I+M):</p>
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
            </details>

            <!-- Focus Rolls -->
            <details class="phase-block">
              <summary class="phase-title">Focus Rolls</summary>
              <p class="phase-note">Roll a D6, add modifiers:</p>
              <ul class="phase-list">
                <li>+/– Model's current Initiative</li>
                <li>+/– Weapon Initiative modifier</li>
                <li>+/– Type: Heavy (–1), Light (+1)</li>
                <li>+1 Shield / Company Standard</li>
                <li>+1 per 5 friendly models in unit</li>
              </ul>
            </details>

            <!-- Combat Resolution -->
            <details class="phase-block">
              <summary class="phase-title">Combat Resolution</summary>
              <ul class="phase-list">
                <li>+1 For outnumbering</li>
                <li>+1 For each enemy removed</li>
                <li>+1 For each Vexilla</li>
                <li>+1 For each Company Standard</li>
                <li>+/– Other Wargear / Special Rules</li>
              </ul>
            </details>

            <!-- Combat Aftermath -->
            <details class="phase-block">
              <summary class="phase-title">Combat Aftermath</summary>
              <div class="aftermath-grid">
                <div class="aftermath-item"><span class="aftermath-name">Fall Back</span><span class="aftermath-desc">Gains Routed status. Perform 2.3 Routed Units move.</span></div>
                <div class="aftermath-item"><span class="aftermath-name">Disengage</span><span class="aftermath-desc">Normal move away from combat (only if lost). Affected by terrain.</span></div>
                <div class="aftermath-item"><span class="aftermath-name">Consolidate</span><span class="aftermath-desc">Move up to base Initiative. Ignore Difficult terrain.</span></div>
                <div class="aftermath-item"><span class="aftermath-name">Pursue</span><span class="aftermath-desc">Move D6 + Initiative toward falling-back enemy. If contact, successful charge.</span></div>
                <div class="aftermath-item"><span class="aftermath-name">Gun Down</span><span class="aftermath-desc">Immediately make a Volley attack targeting the unit that is Falling Back.</span></div>
              </div>
            </details>

            <!-- Core Gambits -->
            <details class="phase-block">
              <summary class="phase-title">Core Gambits</summary>
              <div class="gambit-list">
                <div class="gambit-item"><span class="gambit-name">Seize the Initiative</span> — Roll an extra Focus D6, discard lowest.</div>
                <div class="gambit-item"><span class="gambit-name">Flurry of Blows</span> — +D3 attacks. Attacks only do 1 Damage.</div>
                <div class="gambit-item"><span class="gambit-name">Test the Foe</span> — Gain Challenge advantage next round.</div>
                <div class="gambit-item"><span class="gambit-name">Guard Up</span> — +1 WS, but only 1 attack. Missed attacks grant +1 to next Focus Roll.</div>
                <div class="gambit-item"><span class="gambit-name">Taunt & Bait</span> — Reduce WS & A to match opponent.</div>
                <div class="gambit-item"><span class="gambit-name">Consolidate</span> — +1 Combat Resolution if you win.</div>
                <div class="gambit-item"><span class="gambit-name">Grandstand</span> — Extra Focus D6, discard highest. +1 A per 5 models in unit.</div>
                <div class="gambit-item"><span class="gambit-name">Finishing Blow</span> — Extra Focus D6, discard highest. +1 Str & D to all hits.</div>
              </div>
            </details>

            <!-- Disgraced Status -->
            <details class="phase-block">
              <summary class="phase-title">Disgraced Status</summary>
              <ul class="phase-list">
                <li>Model's WS & LD halved.</li>
                <li>Unit's Initiative reduced to 1.</li>
              </ul>
            </details>

            <!-- Glory Points -->
            <details class="phase-block">
              <summary class="phase-title">Glory Points</summary>
              <p class="phase-note">The challenger who inflicted the most wounds wins. Winner gains Combat Resolution points equal to wounds inflicted. If the enemy is slain, gain points equal to its full Wounds characteristic instead.</p>
            </details>

            <!-- Perils of the Warp -->
            <details class="phase-block">
              <summary class="phase-title">Perils of the Warp</summary>
              <p class="phase-note">Rolling doubles to manifest a psychic power: Roll D3:</p>
              <ul class="phase-list">
                <li><strong>1:</strong> Suffer 13 (–WP) wounds. Invulnerable saves only.</li>
                <li><strong>2–5:</strong> Unit gains Stunned status.</li>
              </ul>
            </details>

            <!-- Terrain Rules -->
            <details class="phase-block">
              <summary class="phase-title">Terrain Rules</summary>
              <table class="cs-table">
                <tbody>
                  <tr><td><strong>Light</strong></td><td>6+ Cover.</td></tr>
                  <tr><td><strong>Medium</strong></td><td>5+ Cover. 3" Line of Sight.</td></tr>
                  <tr><td><strong>Heavy</strong></td><td>4+ Cover. Blocks Line of Sight.</td></tr>
                  <tr><td><strong>Difficult</strong></td><td>Reduce Movement by –2".</td></tr>
                  <tr><td><strong>Dangerous</strong></td><td>Dangerous Test: on a 1, suffer AP2 D1 wound.</td></tr>
                </tbody>
              </table>
            </details>

          </details>

        </div>
      </div>
    </div>
  </div>
{/if}

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') closeRule(); }} />

{#if activeRule}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="rule-backdrop" onclick={closeRule}>
    <div class="rule-modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
      <div class="rule-modal-header">
        <span class="rule-modal-name">{activeRule.name}</span>
        <button class="rule-modal-close" onclick={closeRule}>×</button>
      </div>
      <div class="rule-modal-body">
        {#if activeRule.summary}
          <p class="rule-summary">{activeRule.summary}</p>
        {/if}
        <p class="rule-description">{activeRule.description}</p>
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
    transition: border-color 0.12s, color 0.12s;
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
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1.5rem;
    align-items: start;
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

  .unit-composition {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-style: italic;
    margin: 0;
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

  /* ── Special Rules List ──────────────────────── */
  .rules-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 0.75rem;
  }

  .rule-item {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: var(--color-accent);
    border: 1px solid var(--color-accent-dim);
    padding: 0.2em 0.6em;
    background: rgba(0, 200, 255, 0.04);
    cursor: default;
  }

  .rule-item-clickable {
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }

  .rule-item-clickable:hover {
    background: rgba(0, 200, 255, 0.12);
    border-color: var(--color-accent);
  }

  .rule-item:disabled {
    opacity: 0.5;
  }

  /* ── Rule Description Modal ──────────────────── */
  .rule-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.72);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 300;
    padding: 1rem;
  }

  .rule-modal {
    background: var(--color-bg-raised);
    border: 1px solid var(--color-accent-dim);
    width: 100%;
    max-width: 560px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 200, 255, 0.08);
  }

  .rule-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .rule-modal-name {
    font-family: 'Orbitron', monospace;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-accent);
  }

  .rule-modal-close {
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: 1.4rem;
    cursor: pointer;
    line-height: 1;
    padding: 0 0.25rem;
  }

  .rule-modal-close:hover {
    color: var(--color-text);
  }

  .rule-modal-body {
    padding: 1.25rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .rule-summary {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
    line-height: 1.5;
    border-left: 2px solid var(--color-accent-dim);
    padding-left: 0.75rem;
  }

  .rule-description {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.86rem;
    color: var(--color-text-muted);
    margin: 0;
    line-height: 1.6;
    white-space: pre-line;
  }

  /* ── Turn Sequence Column ────────────────────── */
  .turn-sequence-col {
    position: sticky;
    top: 1rem;
  }

  .turn-sequence-sticky {
    border: 1px solid var(--color-border);
    background: var(--color-bg-raised);
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: calc(100vh - 6rem);
    overflow-y: auto;
  }

  /* ── details / summary base ──────────────────── */
  details {
    display: block;
  }

  summary {
    cursor: pointer;
    list-style: none;
    user-select: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  /* ── Top-level group (Turn Sequence / Game Mechanics) ── */
  .ts-group {
    border: 1px solid var(--color-border);
  }

  .ts-group > summary.section-title {
    padding: 0.6rem 0.85rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    border-bottom: none;
    transition: background 0.12s;
  }

  .ts-group[open] > summary.section-title {
    border-bottom: 1px solid var(--color-border);
  }

  .ts-group > summary.section-title::after {
    content: '▶';
    font-size: 0.5rem;
    color: var(--color-text-muted);
    transition: transform 0.15s;
    flex-shrink: 0;
  }

  .ts-group[open] > summary.section-title::after {
    transform: rotate(90deg);
  }

  .ts-group > summary.section-title:hover {
    background: rgba(0, 200, 255, 0.04);
  }

  /* inner phase blocks inside ts-group */
  .ts-group > details.phase-block,
  .ts-group details.phase-block {
    margin: 0;
  }

  /* ── Phase blocks ────────────────────────────── */
  .phase-block {
    border-left: 2px solid var(--color-border);
    margin: 0.35rem 0.75rem;
  }

  .phase-block > summary.phase-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    padding: 0.3rem 0.6rem;
    transition: background 0.12s;
  }

  .phase-block > summary.phase-title::after {
    content: '▶';
    font-size: 0.45rem;
    color: var(--color-text-muted);
    transition: transform 0.15s;
    flex-shrink: 0;
  }

  .phase-block[open] > summary.phase-title::after {
    transform: rotate(90deg);
  }

  .phase-block > summary.phase-title:hover {
    background: rgba(201, 147, 58, 0.06);
  }

  /* content padding inside open phase blocks */
  .phase-block > *:not(summary) {
    margin: 0.35rem 0.6rem 0.5rem;
  }

  .phase-title {
    font-family: 'Orbitron', monospace;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-gold);
    margin: 0;
  }

  /* ── Sub-sections ────────────────────────────── */
  .sub-section {
    border-left: 1px solid var(--color-border);
    margin: 0.25rem 0;
  }

  .sub-section > summary.sub-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    padding: 0.25rem 0.5rem;
    transition: background 0.12s;
  }

  .sub-section > summary.sub-title::after {
    content: '▶';
    font-size: 0.4rem;
    color: var(--color-text-muted);
    transition: transform 0.15s;
    flex-shrink: 0;
  }

  .sub-section[open] > summary.sub-title::after {
    transform: rotate(90deg);
  }

  .sub-section > summary.sub-title:hover {
    background: rgba(0, 200, 255, 0.04);
  }

  /* content padding inside open sub-sections */
  .sub-section > *:not(summary) {
    margin: 0.25rem 0.5rem 0.4rem;
  }

  .sub-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .phase-note {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.82rem;
    color: var(--color-text-muted);
    font-style: italic;
    margin: 0;
  }

  .page-ref {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.6rem;
    font-weight: 400;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    opacity: 0.7;
    margin-left: 0.3em;
    text-transform: none;
  }


  .phase-list {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.78rem;
    color: var(--color-text);
    margin: 0;
    padding-left: 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    line-height: 1.4;
  }

  .phase-list li {
    list-style: disc;
  }

  .phase-steps {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.78rem;
    color: var(--color-text);
    margin: 0;
    padding-left: 1.3rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    line-height: 1.4;
  }

  .phase-steps-inner {
    font-size: 0.73rem;
    margin-top: 0.2rem;
    color: var(--color-text-muted);
  }

  /* ── Cheat Sheet Tables ───────────────────────── */
  .cs-table {
    border-collapse: collapse;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.72rem;
    width: 100%;
  }

  .cs-table th,
  .cs-table td {
    padding: 0.2rem 0.45rem;
    border: 1px solid var(--color-border);
    text-align: left;
  }

  .cs-table th {
    font-family: 'Orbitron', monospace;
    font-size: 0.58rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    background: rgba(0, 0, 0, 0.25);
    text-align: center;
  }

  .cs-table td {
    color: var(--color-text);
  }

  .cs-table-sm th,
  .cs-table-sm td {
    padding: 0.18rem 0.3rem;
    font-size: 0.66rem;
    text-align: center;
  }

  .table-scroll {
    overflow-x: auto;
  }

  /* ── Reactions ───────────────────────────────── */
  .reaction-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .reaction-item {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--color-border);
    background: rgba(0, 0, 0, 0.15);
  }

  .reaction-name {
    font-family: 'Orbitron', monospace;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-accent);
  }

  .reaction-cost {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.62rem;
    font-weight: 600;
    color: var(--color-gold);
    margin-left: 0.4rem;
  }

  .reaction-trigger {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.74rem;
    color: var(--color-text-muted);
    margin: 0;
    line-height: 1.4;
  }

  /* ── Status Grid ──────────────────────────────── */
  .status-grid {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .status-item {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
  }

  .status-name {
    font-family: 'Orbitron', monospace;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-gold);
    white-space: nowrap;
    flex-shrink: 0;
    min-width: 5.5rem;
  }

  .status-desc {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.74rem;
    color: var(--color-text-muted);
    line-height: 1.35;
  }

  /* ── Aftermath Grid ───────────────────────────── */
  .aftermath-grid {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .aftermath-item {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
  }

  .aftermath-name {
    font-family: 'Orbitron', monospace;
    font-size: 0.57rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-accent);
    white-space: nowrap;
    flex-shrink: 0;
    min-width: 5.5rem;
  }

  .aftermath-desc {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.74rem;
    color: var(--color-text-muted);
    line-height: 1.35;
  }

  /* ── Gambits ──────────────────────────────────── */
  .gambit-list {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .gambit-item {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.76rem;
    color: var(--color-text-muted);
    line-height: 1.35;
  }

  .gambit-name {
    font-family: 'Orbitron', monospace;
    font-size: 0.57rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text);
  }
</style>
