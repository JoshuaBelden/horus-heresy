import type { Faction } from './types';

// Army-wide special rules attached to a Faction. These surface as clickable
// links in the army header (each opens the matching Library rule). Names must
// match entries in `specialRules` so `lookupRule` / `openRule` resolve them.
const FACTION_RULES: Partial<Record<Faction, string[]>> = {
  'Dark Angels': [
    'The Angels of Death',
    'Sword of the Order',
    'Blades of the First Legion',
    'Vengeance of the First Legion',
  ],
};

export function getFactionRules(faction: Faction): string[] {
  return FACTION_RULES[faction] ?? [];
}
