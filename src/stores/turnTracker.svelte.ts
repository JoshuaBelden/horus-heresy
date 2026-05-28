import { turnSequence } from '../data/turnSequence';

// Session-only turn-tracker state, shared between the Turn Tracker bar and the
// Battle Report's Unit Profiles list (which marks squads as "gone" per phase).
// Not persisted: a full page reload starts a fresh turn. No history is kept.
class TurnTrackerStore {
  active = $state(false);
  turnOwner = $state<'player' | 'opponent'>('player');
  currentPhaseId = $state(turnSequence[0].id);
  currentSubId = $state<string | null>(null);
  // phaseId → squadId → has acted (your turn)
  squadGone = $state<Record<string, Record<string, boolean>>>({});
  // squadId → is under attack (opponent's turn)
  targeted = $state<Record<string, boolean>>({});

  start(): void {
    this.active = true;
  }

  stop(): void {
    this.active = false;
  }

  selectPhase(id: string): void {
    this.currentPhaseId = id;
    this.currentSubId = null;
  }

  // Clear all per-squad progress and return to the first phase.
  resetTurn(): void {
    this.squadGone = {};
    this.targeted = {};
    this.currentSubId = null;
    this.currentPhaseId = turnSequence[0].id;
  }

  hasGone(squadId: string): boolean {
    return this.squadGone[this.currentPhaseId]?.[squadId] ?? false;
  }

  toggleGone(squadId: string): void {
    const forPhase = this.squadGone[this.currentPhaseId] ?? {};
    this.squadGone[this.currentPhaseId] = {
      ...forPhase,
      [squadId]: !forPhase[squadId],
    };
  }

  isTargeted(squadId: string): boolean {
    return this.targeted[squadId] ?? false;
  }

  toggleTargeted(squadId: string): void {
    this.targeted = { ...this.targeted, [squadId]: !this.targeted[squadId] };
  }
}

export const turnTrackerStore = new TurnTrackerStore();
