import { units, weaponLists } from '../data';
import type {
  ArmyList,
  ArmyDetachment,
  DetachmentSlot,
  DetachmentSlotType,
  DetachmentType,
  SlottedUnit,
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
  slots: SlotSpec[];
}

// Data-driven registry of every detachment and its battlefield-role slots.
export const DETACHMENT_DEFINITIONS: DetachmentDefinition[] = [
  {
    type: 'Crusade Primary',
    primary: true,
    slots: [
      { slotType: 'High Command', count: 1 },
      { slotType: 'Command', count: 3 },
      { slotType: 'Troops', count: 4 },
      { slotType: 'Transport', count: 4 },
    ],
  },
  {
    type: 'Warlord',
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
  { type: 'Combat Retinue', slots: [{ slotType: 'Retinue', count: 3 }] },
  { type: 'Officer Cadre', slots: [{ slotType: 'Command', count: 2 }] },
  { type: 'Army Vanguard', slots: [{ slotType: 'Elites', count: 3 }] },
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

// ── Points calculation ────────────────────────────────────────────────────────

export function calcSlottedUnitPoints(slottedUnit: SlottedUnit): number {
  const profile = units.find((u) => u.name === slottedUnit.unitName);
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
      if (slot.unit) total += calcSlottedUnitPoints(slot.unit);
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
