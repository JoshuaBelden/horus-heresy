import type { DetachmentSlotType, Faction, UnitProfile } from './types';

// A Prime Advantage selectable when a unit fills a Prime Slot. The `name`
// matches a specialRules entry so the full text is available in the Library.
export interface PrimeAdvantage {
  name: string;
  summary: string;
  // Selectable only on a Command Slot (not High Command).
  commandSlotOnly?: boolean;
  // May only be chosen once within the same Detachment.
  oncePerDetachment?: boolean;
  // May only be chosen once across the whole Army.
  oncePerArmy?: boolean;
  // Restricts the advantage to a Faction (army-specific advantages).
  faction?: Faction;
  // Restricts the advantage to specific unit profiles by name.
  unitNames?: string[];
  // Requires the filling unit to include a model with this sub-type.
  requiresSubtype?: string;
}

export const primeAdvantages: PrimeAdvantage[] = [
  {
    name: 'Master Sergeant',
    summary: 'A Sergeant gains +1 A/WS/LD and the Champion Sub-Type.',
    oncePerDetachment: true,
    requiresSubtype: 'Sergeant',
  },
  {
    name: 'Combat Veterans',
    summary: 'All Models in the Unit gain +1 LD/CL/IN/WP (max 10).',
  },
  {
    name: 'Paragon of Battle',
    summary: 'A Command Model gains +1 A/WS/BS.',
    requiresSubtype: 'Command',
  },
  {
    name: 'Special Assignment',
    summary: 'Command Slots only: may be filled by a High Command Unit.',
    commandSlotOnly: true,
  },
  {
    name: 'Logistical Benefit',
    summary: 'Add one extra Force Organisation Slot to the Detachment.',
    oncePerDetachment: true,
  },
  // ── Army-specific Prime Advantages ────────────────────────────────────────
  {
    name: 'Paladin of the Hekatonystika',
    summary:
      'Centurion only: WS +1, bolter → Terranic greatsword (free), gains Order Exemplars.',
    oncePerArmy: true,
    faction: 'Dark Angels',
    unitNames: ['Centurion'],
  },
];

// The six Orders of the Hekatonystika. A unit that gains Order Exemplars (via
// the Paladin Prime Advantage) selects one of these for all its Models.
export const HEKATONYSTIKA_ORDERS = [
  'Augurs of Weakness',
  'Icons of Resolve',
  'Slayers of Kings',
  'Hunters of Beasts',
  'Reapers of Hosts',
  'Breakers of Witches',
];

// Prime Advantages that grant the Order Exemplars rule (require an Order choice).
export const ORDER_EXEMPLAR_ADVANTAGES = ['Paladin of the Hekatonystika'];

export interface PrimeContext {
  slotType: DetachmentSlotType;
  // Profile of the unit filling the Prime Slot (for sub-type / name checks).
  unit: UnitProfile | undefined;
  // Whether the filling unit includes a Model with the Unique Sub-Type.
  hasUnique: boolean;
  faction: Faction;
  // Advantage names already chosen elsewhere in this Detachment (excluding this slot).
  usedInDetachment: string[];
  // Advantage names already chosen anywhere in the Army (excluding this slot).
  usedInArmy: string[];
}

function unitHasSubtype(unit: UnitProfile | undefined, subtype: string): boolean {
  return !!unit?.models.some((m) => m.subtypes?.includes(subtype));
}

// Prime Advantages selectable for a given filled Prime Slot, applying the
// rulebook constraints. A unit with the Unique Sub-Type may only take
// Logistical Benefit.
export function availablePrimeAdvantages(ctx: PrimeContext): PrimeAdvantage[] {
  const base = ctx.hasUnique
    ? primeAdvantages.filter((a) => a.name === 'Logistical Benefit')
    : primeAdvantages;

  return base.filter((a) => {
    if (a.faction && a.faction !== ctx.faction) return false;
    if (a.commandSlotOnly && ctx.slotType !== 'Command') return false;
    if (a.unitNames && (!ctx.unit || !a.unitNames.includes(ctx.unit.name)))
      return false;
    if (a.requiresSubtype && !unitHasSubtype(ctx.unit, a.requiresSubtype))
      return false;
    if (a.oncePerDetachment && ctx.usedInDetachment.includes(a.name)) return false;
    if (a.oncePerArmy && ctx.usedInArmy.includes(a.name)) return false;
    return true;
  });
}
