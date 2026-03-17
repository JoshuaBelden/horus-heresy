export type UnitCatalog = 'Legiones Astartes' | 'Dark Angels';

export type RangedWeaponCategory =
  | 'Artillery Cannon'
  | 'Archaeotech Pistol'
  | 'Auto Weapons'
  | 'Bolt Weapons'
  | 'Combi Weapons'
  | 'Conversion Beam Weapons'
  | 'Disintegrator Weapons'
  | 'Graviton Weapons'
  | 'Flame Weapons'
  | 'Las Weapons'
  | 'Melta Weapons'
  | 'Missile Weapons'
  | 'Particle Weapons'
  | 'Phosphex Weapons'
  | 'Plasma Weapons'
  | 'Rad Weapons'
  | 'Sonic Weapons'
  | 'Volkite Weapons'
  | 'Exotic Weapons';

export type MeleeWeaponCategory =
  | 'Chain'
  | 'Charnabal'
  | 'Force'
  | 'Power'
  | 'Paragon'
  | 'Exotic';

export interface WeaponListEntry {
  weaponName: string;
  points: number;
}

export interface WeaponList {
  name: string;
  entries: WeaponListEntry[];
}

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
  count?: number;
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
  weaponName?: string; // references a weapon in rangedWeapons or meleeWeapons
  wargearName?: string; // references an item in wargear catalog
}

export interface UnitOption {
  description: string;
  appliesTo?: 'unit' | 'per-model' | 'model-count';
  modelName?: string;
  max?: number;
  pointsPerModel?: number;
  points?: number;
  choices?: UnitOptionChoice[];
  weaponListNames?: string[];
}

export interface ModelGroup {
  optionIndex: number;
  count: number;
  choiceIndex: number | null;
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
  category?: RangedWeaponCategory;
}

export interface MeleeWeapon {
  name: string;
  IM: string; // e.g. "I", "-3", "I-1"
  AM: number | string; // attacks modifier, e.g. "A" or a fixed number
  SM: number | string; // strength modifier, e.g. "+2" or a fixed number
  AP: number | string;
  D: number;
  specialRules: string[];
  traits: string[];
  category?: MeleeWeaponCategory;
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
  count?: number;
}

export interface SlottedUnit {
  unitName: string;
  selectedChoices: SelectedChoice[];
  modelGroups?: ModelGroup[];
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
