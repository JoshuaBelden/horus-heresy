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
  subtypes?: string[];
  // Movement and Ballistic Skill are shared by infantry and vehicles.
  M: number;
  BS: number;
  // Infantry / Walker combat stats (omitted by vehicles).
  WS?: number;
  S?: number;
  T?: number;
  W?: number;
  I?: number;
  A?: number;
  LD?: number;
  CL?: number;
  WP?: number;
  IN?: number;
  SAV?: SaveValue;
  INV?: InvSaveValue;
  // Vehicle stats (omitted by infantry / walkers).
  armourFront?: number;
  armourSide?: number;
  armourRear?: number;
  HP?: number;
  transportCapacity?: number;
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
  title?: string; // group label, e.g. "Weapon Option 1", "Paired Weapons"
  required?: boolean; // must have a selection when active; renders "(n/1)" and gates Assign
  conflictsWith?: number[]; // option indices that are mutually exclusive with this one
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
  | 'War-Engine'
  | 'Lord of War'
  | 'Support'
  | 'Armour'
  | 'Recon'
  | 'Heavy Assault'
  | 'Fast Attack'
  | 'Elites';

export type DetachmentType =
  | 'Crusade Primary'
  | 'Warlord'
  | 'Heavy Support'
  | 'Lord of War'
  | 'Allied Detachment'
  | 'Armoured Fist'
  | 'Tactical Support'
  | 'Armoured Support'
  | 'Combat Pioneer'
  | 'Shock Assault'
  | 'First Strike'
  | 'Combat Retinue'
  | 'Officer Cadre'
  | 'Army Vanguard';

export interface SelectedChoice {
  optionIndex: number;
  choiceIndex: number;
  count?: number;
}

export interface SlottedUnit {
  unitName: string;
  // Player-given label to distinguish duplicate squads; falls back to unitName.
  nickname?: string;
  selectedChoices: SelectedChoice[];
  modelGroups?: ModelGroup[];
}

export interface DetachmentSlot {
  id: string;
  slotType: DetachmentSlotType;
  unit: SlottedUnit | null;
}

export interface ArmyDetachment {
  type: DetachmentType;
  slots: DetachmentSlot[];
}

export interface ArmyList {
  id: string;
  name: string;
  faction: Faction;
  allegiance: Allegiance;
  detachments: ArmyDetachment[];
  // Battle Report squad display order, by detachment-slot id. Squads not listed
  // (e.g. newly added) fall back to natural detachment/slot order.
  reportOrder?: string[];
  createdAt: number;
  updatedAt: number;
}
