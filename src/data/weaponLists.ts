import type { WeaponList } from './types';

export const weaponLists: WeaponList[] = [
  {
    name: 'Legion Sergeant Melee Weapons',
    entries: [
      { weaponName: 'Chainsword',          points: 0 },
      { weaponName: 'Chainaxe',            points: 0 },
      { weaponName: 'Charnabal sabre',     points: 5 },
      { weaponName: 'Power sword',         points: 10 },
      { weaponName: 'Power axe',           points: 10 },
      { weaponName: 'Power maul',          points: 10 },
      { weaponName: 'Power lance',         points: 10 },
      { weaponName: 'Calibanite Warblade', points: 15 },
      { weaponName: 'Thunder hammer',      points: 15 },
      { weaponName: 'Power fist',          points: 15 },
      { weaponName: 'Lightning claw',      points: 10 },
    ],
  },
  {
    name: 'Legion Combi-weapons',
    entries: [
      { weaponName: 'Combi-bolter',        points: 5 },
      { weaponName: 'Combi-flamer',        points: 10 },
      { weaponName: 'Combi-melta',         points: 10 },
      { weaponName: 'Combi-plasma',        points: 10 },
      { weaponName: 'Combi-volkite',       points: 10 },
      { weaponName: 'Combi-grenade',       points: 10 },
      { weaponName: 'Combi-disintegrator', points: 10 },
      { weaponName: 'Combi-grav',          points: 10 },
    ],
  },
  {
    name: 'Legion Pistols',
    entries: [
      { weaponName: 'Plasma pistol',    points: 5 },
      { weaponName: 'Hand flamer',      points: 5 },
      { weaponName: 'Volkite serpenta', points: 5 },
    ],
  },
];
