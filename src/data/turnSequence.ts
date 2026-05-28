// Structured projection of the game turn sequence for the Battle Report's Turn
// Tracker. The Library's TurnsSection.svelte remains the richer human-readable
// reference; this is a compact, machine-usable form (phase ids, summaries, and
// per-phase relevance hints used to surface pertinent army info during play).

export interface SubPhase {
  id: string;
  label: string;
  description: string;
}

// How to surface "pertinent" units for a phase. All matching is substring,
// case-insensitive, against existing unit/weapon data — no new tagging yet.
export interface PhaseRelevance {
  // Surface units that carry weapons of this class (ranged in Shooting, melee
  // in Assault).
  weaponClass?: 'ranged' | 'melee';
  // Match against unit special-rule names.
  ruleKeywords?: string[];
  // Match against weapon specialRules + traits.
  weaponKeywords?: string[];
  // Match against model subtypes (e.g. Command / Champion / Paragon).
  subtypes?: string[];
  // Reaction names the reactive player can use during this phase. These link
  // into the Library "Reactions" mechanic (see search.ts).
  reactions?: string[];
}

// Rules for what the Battle Report's Unit Profiles list shows while tracking
// this phase. Default behaviour (no rule) is to hide every squad; a phase opts
// units back in and highlights the stats relevant to that phase.
export interface PhaseDisplay {
  // A unit is shown if at least one of its models has a value for one of these
  // model-stat keys (e.g. 'M').
  requireStats?: string[];
  // A unit is shown if it carries a weapon of this class.
  requireWeapons?: 'ranged' | 'melee';
  // Model-stat keys to highlight in each shown unit's stats table.
  highlightStats?: string[];
  // Weapon table to highlight in each shown unit.
  highlightWeapons?: 'ranged' | 'melee';
}
// A unit is shown when it matches any configured requirement; a phase with no
// requirements hides every squad.

export interface TurnPhase {
  id: string;
  num: number;
  name: string;
  pageRef: string;
  summary: string;
  subPhases: SubPhase[];
  relevance: PhaseRelevance;
  display: PhaseDisplay;
}

// Lightweight view models the Turn Tracker consumes. Built in the Battle Report
// from its existing unit-instance derivation so the tracker doesn't re-parse
// army data. `id` is the stable detachment-slot id.
export interface WeaponLite {
  name: string;
  specialRules: string[];
  traits: string[];
}

export interface TrackerSquad {
  id: string;
  name: string;
  rules: string[];
  ranged: WeaponLite[];
  melee: WeaponLite[];
  subtypes: string[];
}

export const turnSequence: TurnPhase[] = [
  {
    id: 'start',
    num: 1,
    name: 'Start',
    pageRef: 'p.240',
    summary:
      'Administer Effects that begin or end at the start of the turn. If instructed by an effect, the active player performs a check.',
    subPhases: [],
    relevance: {},
    display: {},
  },
  {
    id: 'movement',
    num: 2,
    name: 'Movement',
    pageRef: 'p.242',
    summary:
      'Bring in reserves, then move units up to their Movement characteristic. Routed units Fall Back.',
    subPhases: [
      {
        id: 'reserves',
        label: '2.1 Reserves',
        description:
          'On a 3+, bring in a reserve unit. Enter from your deployment edge (may shoot & charge), Deep Strike (from turn 2; may only shoot), or Outflank from a free edge.',
      },
      {
        id: 'moving',
        label: '2.2 Moving Units',
        description:
          'Move each model up to its Movement. Rush adds Initiative but forbids shooting/charging. Cannot move if entered from reserves, pinned, routed, or in combat.',
      },
      {
        id: 'routed',
        label: '2.3 Routed Units',
        description:
          'Routed units Fall Back: roll D6 + Initiative and move toward your own deployment edge. In contact with the edge, make a LD check or be removed; otherwise suppressed.',
      },
    ],
    relevance: {
      ruleKeywords: [
        'Deep Strike',
        'Outflank',
        'Scout',
        'Infiltrate',
        'Jump',
        'Fleet',
        'Bulky',
        'Implacable Advance',
        'Slow and Purposeful',
        'Vanguard',
      ],
      reactions: ['Reposition', 'Intercept'],
    },
    display: { requireStats: ['M'], highlightStats: ['M'] },
  },
  {
    id: 'shooting',
    num: 3,
    name: 'Shooting',
    pageRef: 'p.247',
    summary:
      'Eligible units shoot, resolving fire groups against targets, then take any required Morale checks.',
    subPhases: [
      {
        id: 'shooting',
        label: '3.1 Shooting',
        description:
          'Select target, check LoS & facing, declare weapons and set fire groups, then resolve: Hit tests, Wound tests, assign Wounds, Saves & mitigation, remove casualties. Rushed, locked-in-combat, or embarked units may not shoot.',
      },
      {
        id: 'morale',
        label: '3.2 Morale',
        description:
          'Check with 2D6 if a condition applies: out of coherency, hit by Suppressive/Stun, wounded by Pinning/Panic, or ≥25% casualties. Failure inflicts Suppressed, Stunned, Pinned, or Routed.',
      },
    ],
    relevance: {
      weaponClass: 'ranged',
      weaponKeywords: [
        'Pinning',
        'Blast',
        'Rending',
        'Melta',
        'Breaching',
        'Heavy',
        'Template',
        'Deflagrate',
        'Shred',
      ],
      reactions: ['Return Fire', 'Overwatch', 'Evade'],
    },
    display: {
      requireWeapons: 'ranged',
      highlightWeapons: 'ranged',
      highlightStats: ['BS'],
    },
  },
  {
    id: 'assault',
    num: 4,
    name: 'Assault',
    pageRef: 'p.252',
    summary:
      'Declare charges, resolve challenges, fight in initiative order, then determine combat resolution.',
    subPhases: [
      {
        id: 'charges',
        label: '4.1 Charges',
        description:
          'Declare target, check LoS/range (12"), make Set-up Move, Volley Attacks, then Charge Move (2D6, pick highest). Stunned/Suppressed/disembarked units make Disordered Charges. Cannot charge if in combat, rushed, pinned, or routed.',
      },
      {
        id: 'challenges',
        label: '4.2 Challenges',
        description:
          'Available to Command / Champion / Paragon sub-types. Declare challenge, face off with Gambits, Focus Roll, Strike (Fight steps), Challenge Result, then Glory Points to the winner.',
      },
      {
        id: 'fight',
        label: '4.3 Fight',
        description:
          'Resolved in Initiative order, highest to lowest. Per Initiative Step: pile-in, declare engaged, set strike group, roll to Hit, to Wound, Saves & mitigation, remove casualties, final pile-in.',
      },
      {
        id: 'resolution',
        label: '4.4 Resolution',
        description:
          'Total each side\'s Combat Resolution, declare the winner; the loser takes a Panic check (–X). A failed Panic check Routs the unit and forces a Fall Back. Each player then picks an Aftermath option.',
      },
    ],
    relevance: {
      weaponClass: 'melee',
      weaponKeywords: [
        'Shock',
        'Armourbane',
        'Rending',
        'Murderous Strike',
        'Unwieldy',
        'Breaching',
      ],
      subtypes: ['Command', 'Champion', 'Paragon'],
      reactions: ['Heroic Intervention'],
    },
    display: {
      requireWeapons: 'melee',
      highlightWeapons: 'melee',
      highlightStats: ['WS', 'S'],
    },
  },
  {
    id: 'end',
    num: 5,
    name: 'End',
    pageRef: 'p.274',
    summary:
      'Resolve end-of-turn effects, attempt to remove ongoing statuses, then score Victory Points.',
    subPhases: [
      {
        id: 'effects',
        label: '5.1 Effects',
        description:
          'Any effects that start or end at "End of the turn" happen here.',
      },
      {
        id: 'statuses',
        label: '5.2 Statuses',
        description:
          'Perform checks (Cool / LD) or Repairs (6+) to remove ongoing statuses.',
      },
      {
        id: 'victory',
        label: '5.3 Victory Points',
        description:
          'Score Mission Objectives and gain Victory Points if applicable.',
      },
    ],
    relevance: {
      ruleKeywords: ['Auto-Repair', 'Eternal Warrior'],
    },
    display: {},
  },
];
