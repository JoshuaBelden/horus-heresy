import { units } from '../data';
import type {
  ArmyList,
  ArmyDetachment,
  DetachmentSlot,
  DetachmentSlotType,
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

export function createCrusadeDetachment(): ArmyDetachment {
  return {
    type: 'Crusade Primary',
    slots: [
      makeSlot('High Command', 1),
      makeSlot('Command', 1),
      makeSlot('Command', 2),
      makeSlot('Command', 3),
      makeSlot('Troops', 1),
      makeSlot('Troops', 2),
      makeSlot('Troops', 3),
      makeSlot('Troops', 4),
      makeSlot('Transport', 1),
      makeSlot('Transport', 2),
      makeSlot('Transport', 3),
      makeSlot('Transport', 4),
    ],
  };
}

export function createWarlordDetachment(): ArmyDetachment {
  return {
    type: 'Warlord',
    slots: [
      makeSlot('Warlord', 1),
      makeSlot('Retinue', 1),
      makeSlot('Heavy Transport', 1),
    ],
  };
}

// ── Points calculation ────────────────────────────────────────────────────────

export function calcSlottedUnitPoints(slottedUnit: SlottedUnit): number {
  const profile = units.find((u) => u.name === slottedUnit.unitName);
  if (!profile) return 0;
  let total = profile.points;
  for (const sc of slottedUnit.selectedChoices) {
    const opt = profile.options[sc.optionIndex];
    const choice = opt?.choices?.[sc.choiceIndex];
    if (choice?.points) total += choice.points;
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
