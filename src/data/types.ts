export type UnitCatalog = 'Legiones Astartes' | 'Dark Angels';

export type BattlefieldRole =
  | 'Warlord'
  | 'High Command'
  | 'Command'
  | 'Retinue'
  | 'Elites'
  | 'War-Engine'
  | 'Troops'
  | 'Support'
  | 'Lord of War'
  | 'Transport'
  | 'Heavy Assault'
  | 'Heavy Transport'
  | 'Armour'
  | 'Recon'
  | 'Fast Attack';

export type UnitType =
  | 'Infantry'
  | 'Cavalry'
  | 'Walker'
  | 'Vehicle'
  | 'Monstrous Creature'
  | 'Flying Vehicle'
  | 'Flying Monstrous Creature'
  | 'Paragon';

export type SaveValue = `${number}+`;
export type InvSaveValue = SaveValue | '-';

export interface ModelProfile {
  name: string;
  type: UnitType;
  subtype?: string;
  M: number;
  WS: number;
  BS: number;
  S: number;
  T: number;
  W: number;
  I: number;
  A: number;
  LD: number;
  CL: number;
  WP: number;
  IN: number;
  SAV: SaveValue;
  INV: InvSaveValue;
}

export interface UnitOptionChoice {
  description: string;
  pointsPerModel?: number;
  points?: number;
  weaponName?: string;  // references a weapon in rangedWeapons or meleeWeapons
}

export interface UnitOption {
  description: string;
  pointsPerModel?: number;
  points?: number;
  choices?: UnitOptionChoice[];
}

export interface SpecialRule {
  name: string;
  summary?: string;
  description: string;
}

export interface RangedWeapon {
  name: string;
  R: number | string;
  FP: number | string;
  RS: number;
  AP: number | string;
  D: number | string;
  specialRules: string[];
  traits: string[];
}

export interface MeleeWeapon {
  name: string;
  IM: string;  // e.g. "I", "-3", "I-1"
  AM: number | string;  // attacks modifier, e.g. "A" or a fixed number
  SM: number | string;  // strength modifier, e.g. "+2" or a fixed number
  AP: number | string;
  D: number;
  specialRules: string[];
  traits: string[];
}

export interface WargearDetail {
  name: string;
  summary: string;
  description: string;
}

export interface Gambit {
  name: string;
  summary: string;
  description: string;
}

export interface UnitProfile {
  name: string;
  catalog: UnitCatalog;
  role: BattlefieldRole;
  points: number;
  description: string;
  composition: string;
  models: ModelProfile[];
  wargear: string[];
  wargearDetails?: WargearDetail[];
  rangedWeapons?: RangedWeapon[];
  meleeWeapons?: MeleeWeapon[];
  gambits?: Gambit[];
  categories?: string[];
  specialRules: string[];
  traits: string[];
  options: UnitOption[];
}

// ── Army Builder Types ────────────────────────────────────────────────────────

export type Faction =
  | 'Dark Angels'
  | 'White Scars'
  | 'Space Wolves'
  | 'Imperial Fists'
  | 'Blood Angels'
  | 'Iron Hands'
  | 'Ultramarines'
  | 'Salamanders'
  | 'Raven Guard';

export type Allegiance = 'Loyalist' | 'Heretic';

export type DetachmentSlotType =
  | 'High Command'
  | 'Command'
  | 'Troops'
  | 'Transport'
  | 'Warlord'
  | 'Retinue'
  | 'Heavy Transport'
  | 'War-Engine';

export interface SelectedChoice {
  optionIndex: number;
  choiceIndex: number;
}

export interface SlottedUnit {
  unitName: string;
  selectedChoices: SelectedChoice[];
}

export interface DetachmentSlot {
  id: string;
  slotType: DetachmentSlotType;
  unit: SlottedUnit | null;
}

export interface ArmyDetachment {
  type: 'Crusade Primary' | 'Warlord' | 'Heavy Support';
  slots: DetachmentSlot[];
}

export interface ArmyList {
  id: string;
  name: string;
  faction: Faction;
  allegiance: Allegiance;
  detachments: ArmyDetachment[];
  createdAt: number;
  updatedAt: number;
}
