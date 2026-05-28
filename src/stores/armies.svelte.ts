import { units, weaponLists } from '../data';
import type {
  ArmyList,
  ArmyDetachment,
  DetachmentSlot,
  DetachmentSlotType,
  DetachmentType,
  Faction,
  SlottedUnit,
  UnitOption,
  UnitProfile,
} from '../data/types';

const STORAGE_KEY = 'hh-army-lists';

// ── Factory helpers ───────────────────────────────────────────────────────────

function makeSlot(slotType: DetachmentSlotType, idx: number): DetachmentSlot {
  return {
    id: `${slotType.toLowerCase().replace(/\s+/g, '-')}-${idx}`,
    slotType,
    unit: null,
  };
}

export interface SlotSpec {
  slotType: DetachmentSlotType;
  count: number;
}

export interface DetachmentDefinition {
  type: DetachmentType;
  primary?: boolean;
  // When set, the detachment is only offered for armies of this Faction.
  faction?: Faction;
  // How many Prime Slots of each Battlefield Role this detachment grants. The
  // player chooses which filled slots of that role to designate as Prime, up to
  // this quota (and may choose none). `slot.prime` records the player's choice.
  primeSlots?: Partial<Record<DetachmentSlotType, number>>;
  slots: SlotSpec[];
}

// Data-driven registry of every detachment and its battlefield-role slots.
// `primeSlots` is the per-role Prime quota; the player chooses which filled
// slots to designate (best-effort reading of the Crusade FO Chart, p284).
export const DETACHMENT_DEFINITIONS: DetachmentDefinition[] = [
  {
    type: 'Crusade Primary',
    primary: true,
    primeSlots: { Command: 1, Troops: 1 },
    slots: [
      { slotType: 'High Command', count: 1 },
      { slotType: 'Command', count: 3 },
      { slotType: 'Troops', count: 4 },
      { slotType: 'Transport', count: 4 },
    ],
  },
  {
    type: 'Warlord',
    primeSlots: { Warlord: 1 },
    slots: [
      { slotType: 'Warlord', count: 1 },
      { slotType: 'Retinue', count: 1 },
      { slotType: 'Heavy Transport', count: 1 },
    ],
  },
  { type: 'Heavy Support', slots: [{ slotType: 'War-Engine', count: 1 }] },
  { type: 'Lord of War', slots: [{ slotType: 'Lord of War', count: 2 }] },
  {
    type: 'Allied Detachment',
    primeSlots: { Command: 1 },
    slots: [
      { slotType: 'Command', count: 2 },
      { slotType: 'Troops', count: 4 },
    ],
  },
  {
    type: 'Armoured Fist',
    slots: [
      { slotType: 'Transport', count: 4 },
      { slotType: 'Armour', count: 4 },
    ],
  },
  {
    type: 'Tactical Support',
    slots: [
      { slotType: 'Troops', count: 2 },
      { slotType: 'Support', count: 2 },
    ],
  },
  { type: 'Armoured Support', slots: [{ slotType: 'Armour', count: 4 }] },
  { type: 'Combat Pioneer', slots: [{ slotType: 'Recon', count: 2 }] },
  { type: 'Shock Assault', slots: [{ slotType: 'Heavy Assault', count: 2 }] },
  { type: 'First Strike', slots: [{ slotType: 'Fast Attack', count: 2 }] },
  {
    type: 'Combat Retinue',
    primeSlots: { Retinue: 1 },
    slots: [{ slotType: 'Retinue', count: 3 }],
  },
  {
    type: 'Officer Cadre',
    primeSlots: { Command: 2 },
    slots: [{ slotType: 'Command', count: 2 }],
  },
  {
    type: 'Army Vanguard',
    primeSlots: { Elites: 1 },
    slots: [{ slotType: 'Elites', count: 3 }],
  },

  // ── Dark Angels Auxiliary Detachments ────────────────────────────────────
  // Slot compositions are a best-effort reading of the rulebook icons (p127–128)
  // and are PENDING CONFIRMATION. Restrictions noted in the book (Recon→Outrider
  // Squadron, Elites→Seeker Squad, Support→Dreadwing Interceptor/Rapier Battery)
  // are not enforced (the app does not restrict slots by unit name).
  {
    type: 'Ironwing Gauntlet',
    faction: 'Dark Angels',
    slots: [{ slotType: 'Armour', count: 4 }],
  },
  {
    type: 'Dreadwing Cadre',
    faction: 'Dark Angels',
    slots: [{ slotType: 'Support', count: 3 }],
  },
  {
    type: 'Stormwing Muster',
    faction: 'Dark Angels',
    slots: [
      { slotType: 'Troops', count: 2 },
      { slotType: 'Transport', count: 2 },
    ],
  },
  {
    type: 'Ravenwing Lance',
    faction: 'Dark Angels',
    slots: [
      { slotType: 'Recon', count: 2 },
      { slotType: 'Fast Attack', count: 2 },
    ],
  },
  {
    type: 'Deathwing Conclave',
    faction: 'Dark Angels',
    primeSlots: { Command: 1 },
    slots: [
      { slotType: 'Command', count: 1 },
      { slotType: 'Elites', count: 2 },
    ],
  },
  {
    type: 'Firewing Echelon',
    faction: 'Dark Angels',
    slots: [{ slotType: 'Elites', count: 4 }],
  },
];

export function createDetachment(type: DetachmentType): ArmyDetachment {
  const def = DETACHMENT_DEFINITIONS.find((d) => d.type === type);
  if (!def) throw new Error(`Unknown detachment type: ${type}`);
  const slots: DetachmentSlot[] = [];
  for (const spec of def.slots) {
    for (let i = 1; i <= spec.count; i++) {
      slots.push(makeSlot(spec.slotType, i));
    }
  }
  return { type, slots };
}

export function createCrusadeDetachment(): ArmyDetachment {
  return createDetachment('Crusade Primary');
}

// Per-role Prime Slot quota for a detachment type (how many slots of each role
// the player may designate as Prime).
export function primeQuota(
  type: DetachmentType,
): Partial<Record<DetachmentSlotType, number>> {
  return DETACHMENT_DEFINITIONS.find((d) => d.type === type)?.primeSlots ?? {};
}

// ── Unit profile resolution ─────────────────────────────────────────────────────

// Blades of the First Legion (Dark Angels): a Model with the Command, Champion
// or Sergeant Sub-Type may exchange a power sword for a Calibanite Warblade
// (+5), and Command/Champion Models may exchange a power fist for a Terranic
// greatsword (free). Only offered when the unit's base wargear includes that
// weapon (i.e. the Model actually starts with one).
function darkAngelsBladeOptions(profile: UnitProfile): UnitOption[] {
  const hasPowerSword = profile.wargear.includes('Power sword');
  const hasPowerFist = profile.wargear.includes('Power fist');
  if (!hasPowerSword && !hasPowerFist) return [];

  const opts: UnitOption[] = [];
  for (const m of profile.models) {
    const subs = m.subtypes ?? [];
    const isCommandChampion =
      subs.includes('Command') || subs.includes('Champion');
    const swordEligible = isCommandChampion || subs.includes('Sergeant');
    if (hasPowerSword && swordEligible) {
      opts.push({
        title: 'Blades of the First Legion',
        description: `${m.name} may exchange its power sword for a Calibanite Warblade.`,
        appliesTo: 'per-model',
        modelName: m.name,
        choices: [
          {
            description: 'Calibanite Warblade',
            pointsPerModel: 5,
            weaponName: 'Calibanite Warblade',
          },
        ],
      });
    }
    if (hasPowerFist && isCommandChampion) {
      opts.push({
        title: 'Blades of the First Legion',
        description: `${m.name} may exchange its power fist for a Terranic greatsword.`,
        appliesTo: 'per-model',
        modelName: m.name,
        choices: [
          {
            description: 'Terranic greatsword',
            pointsPerModel: 0,
            weaponName: 'Terranic greatsword',
          },
        ],
      });
    }
  }
  return opts;
}

// Resolves a unit profile by name, applying any faction-specific option
// augmentation (e.g. Dark Angels Blades of the First Legion). All slotted-unit
// consumers must use this so appended option indices stay consistent.
export function resolveUnitProfile(
  unitName: string,
  faction?: Faction,
): UnitProfile | undefined {
  const base = units.find((u) => u.name === unitName);
  if (!base || faction !== 'Dark Angels') return base;
  const extra = darkAngelsBladeOptions(base);
  return extra.length ? { ...base, options: [...base.options, ...extra] } : base;
}

// ── Points calculation ────────────────────────────────────────────────────────

export function calcSlottedUnitPoints(
  slottedUnit: SlottedUnit,
  faction?: Faction,
): number {
  const profile = resolveUnitProfile(slottedUnit.unitName, faction);
  if (!profile) return 0;
  let total = profile.points;

  for (const sc of slottedUnit.selectedChoices) {
    const opt = profile.options[sc.optionIndex];
    if (!opt) continue;

    if (opt.appliesTo === 'model-count') {
      total += (sc.count ?? 0) * (opt.pointsPerModel ?? 0);
    } else if (opt.weaponListNames) {
      const allEntries = opt.weaponListNames.flatMap(
        (name) => weaponLists.find((l) => l.name === name)?.entries ?? []
      );
      total += allEntries[sc.choiceIndex]?.points ?? 0;
    } else {
      const choice = opt.choices?.[sc.choiceIndex];
      if (choice?.points) total += choice.points;
    }
  }

  for (const group of slottedUnit.modelGroups ?? []) {
    if (group.choiceIndex === null) continue;
    const opt = profile.options[group.optionIndex];
    const choice = opt?.choices?.[group.choiceIndex];
    if (choice?.pointsPerModel) total += group.count * choice.pointsPerModel;
  }

  return total;
}

export function calcArmyPoints(army: ArmyList): number {
  let total = 0;
  for (const det of army.detachments) {
    for (const slot of det.slots) {
      if (slot.unit) total += calcSlottedUnitPoints(slot.unit, army.faction);
    }
  }
  return total;
}

// ── Persistence ───────────────────────────────────────────────────────────────

function load(): ArmyList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ArmyList[]) : [];
  } catch {
    return [];
  }
}

function persist(armies: ArmyList[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(armies));
}

// ── Store ─────────────────────────────────────────────────────────────────────

class ArmiesStore {
  list = $state<ArmyList[]>(load());

  create(army: ArmyList): void {
    this.list = [...this.list, army];
    persist(this.list);
  }

  update(army: ArmyList): void {
    this.list = this.list.map((a) => (a.id === army.id ? army : a));
    persist(this.list);
  }

  remove(id: string): void {
    this.list = this.list.filter((a) => a.id !== id);
    persist(this.list);
  }
}

export const armiesStore = new ArmiesStore();
