import { specialRules } from '../../data/specialRules';
import type { SpecialRule } from '../../data/types';

// Searchable metadata for the Mechanics tab. The matching body markup lives in
// MechanicsSection; `keywords` widen what the filter matches beyond the title.
export interface MechanicEntry {
  id: string;
  title: string;
  pageRef?: string;
  keywords: string;
}

export const mechanicEntries: MechanicEntry[] = [
  {
    id: 'seize',
    title: 'Seize the Initiative',
    pageRef: 'p.310',
    keywords: 'first turn reactive player d6 6+',
  },
  {
    id: 'reactions',
    title: 'Reactions',
    pageRef: 'p.206',
    keywords:
      'reaction points allotment reposition death or glory intercept return fire overwatch evade heroic intervention master of the legion',
  },
  {
    id: 'statuses',
    title: 'Tactical Statuses',
    pageRef: 'p.201',
    keywords: 'pinned suppressed stunned routed disordered charge',
  },
  {
    id: 'setup',
    title: 'Setup Move',
    keywords: 'initiative movement difficult dangerous terrain charge',
  },
  {
    id: 'focus',
    title: 'Focus Rolls',
    keywords: 'd6 modifiers initiative weapon heavy light wound shield standard',
  },
  {
    id: 'resolution',
    title: 'Combat Resolution',
    keywords: 'glory points outnumber vexilla company standard wargear',
  },
  {
    id: 'aftermath',
    title: 'Combat Aftermath',
    keywords: 'fall back disengage consolidate pursue gun down hold',
  },
  {
    id: 'gambits',
    title: 'Core Gambits',
    keywords:
      'seize flurry of blows test the foe guard up taunt bait grandstand finishing blow challenge',
  },
  {
    id: 'disgraced',
    title: 'Disgraced Status',
    keywords: 'ws ld halved initiative challenge refused',
  },
  {
    id: 'glory',
    title: 'Glory Points',
    keywords: 'challenge wounds combat resolution',
  },
  {
    id: 'perils',
    title: 'Perils of the Warp',
    keywords: 'psychic power doubles d3 wounds stunned invulnerable',
  },
  {
    id: 'terrain',
    title: 'Terrain Rules',
    keywords: 'light medium heavy difficult dangerous cover line of sight',
  },
];

const sortedRules = specialRules
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name));

export function filterRules(query: string): SpecialRule[] {
  const q = query.trim().toLowerCase();
  if (!q) return sortedRules;
  return sortedRules.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      (r.summary ?? '').toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q),
  );
}

export function filterMechanics(query: string): MechanicEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return mechanicEntries;
  return mechanicEntries.filter(
    (e) =>
      e.title.toLowerCase().includes(q) || e.keywords.toLowerCase().includes(q),
  );
}
