import { ROUTED_ID } from '../data/statuses';
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
  // squadId → list of active status ids (Pinned, Suppressed, …). Persists across
  // "New Turn" — statuses linger until cleared, unlike per-turn gone/targeted state.
  statuses = $state<Record<string, string[]>>({});

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

  getStatuses(squadId: string): string[] {
    return this.statuses[squadId] ?? [];
  }

  hasStatus(squadId: string, id: string): boolean {
    return this.getStatuses(squadId).includes(id);
  }

  toggleStatus(squadId: string, id: string): void {
    const cur = this.getStatuses(squadId);
    let next: string[];
    if (cur.includes(id)) next = cur.filter((s) => s !== id);
    else if (id === ROUTED_ID) next = [ROUTED_ID]; // Routed clears all others.
    else next = [...cur, id];
    this.statuses = { ...this.statuses, [squadId]: next };
  }

  removeStatus(squadId: string, id: string): void {
    this.statuses = {
      ...this.statuses,
      [squadId]: this.getStatuses(squadId).filter((s) => s !== id),
    };
  }
}

export const turnTrackerStore = new TurnTrackerStore();
