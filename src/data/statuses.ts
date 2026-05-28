// Combat statuses a squad can carry during play, as described in the Library's
// Mechanics → Statuses entry. Shared by the Battle Report's status tracker and
// the Mechanics section so both stay in sync.
export interface UnitStatus {
  id: string;
  name: string;
  description: string;
}

// Routed clears all other statuses when applied (it already implies them all).
export const ROUTED_ID = 'routed';

export const STATUSES: UnitStatus[] = [
  {
    id: 'pinned',
    name: 'Pinned',
    description: "Can't Move, Rush or Charge. Can't Pursue or Disengage.",
  },
  {
    id: 'suppressed',
    name: 'Suppressed',
    description: 'Attacks as Snap Shots only.',
  },
  {
    id: 'stunned',
    name: 'Stunned',
    description: "Can't declare Reactions.",
  },
  {
    id: ROUTED_ID,
    name: 'Routed',
    description:
      'Must fall back during Movement. All other status penalties apply.',
  },
];
