import type { WargearDetail } from './types';

export const wargear: WargearDetail[] = [
  {
    name: 'Vexilla',
    summary: 'A vexilla adds a bonus to Combat Resolution scores.',
    description:
      'When resolving a Combat in the Resolution Sub-Phase of the Assault Phase, score 1 Combat Resolution point for each Unit in that Combat that has any Models that have a vexilla.',
  },
  {
    name: 'Nuncio-vox',
    summary: 'Nuncio-vox allow Units to remove Statuses in the Start Phase.',
    description:
      'If a Unit that includes one or more Models with a nuncio-vox, and there are one or more friendly Models on the Battlefield with the Command Sub-Type, then the Controlling Player may activate the nuncio-vox during the Start Phase of their Turn as the Active Player. When activated, the Controlling Player may make a Check to remove a single Tactical Status from all Models in the Unit that includes the nuncio-vox. This Check is made using the Characteristics of any one friendly Model on the Battlefield with the Command Sub-Type, Chosen by the Controlling Player (using Cool, unless attempting to remove Routed, in which case Leadership is used). A nuncio-vox can only be activated once per Turn, and each Friendly Model on the Battlefield with the Command Sub-Type may only be used once per Start Phase as part of this Special Rule.',
  },
  {
    name: 'Augury scanner',
    summary: 'Augury scanners allow attacks to ignore Shrouded Damage Mitigation Tests.',
    description:
      'When a Shooting Attack made by a Unit that includes any Models with an augury scanner inflicts any Hits (excluding Hits from attacks made as Snap Shots), Shrouded Damage Mitigation Rolls cannot be made against those Hits.',
  },
];
