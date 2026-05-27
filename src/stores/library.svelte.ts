export type LibraryTab = 'rules' | 'turns' | 'mechanics' | 'tables';

const STORAGE_KEY = 'hh-library';

const MIN_WIDTH = 300;
const MAX_WIDTH = 700;

interface PersistedState {
  pinned: boolean;
  width: number;
  tab: LibraryTab;
}

function clampWidth(px: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(px)));
}

function load(): PersistedState {
  const fallback: PersistedState = { pinned: false, width: 420, tab: 'rules' };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      pinned: parsed.pinned ?? fallback.pinned,
      width: clampWidth(parsed.width ?? fallback.width),
      tab: parsed.tab ?? fallback.tab,
    };
  } catch {
    return fallback;
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────

class LibraryStore {
  open = $state(false);
  pinned = $state(false);
  width = $state(420);
  tab = $state<LibraryTab>('rules');
  query = $state('');
  // Name of a special rule to scroll to / highlight, consumed by RulesSection.
  target = $state<string | null>(null);

  constructor() {
    const s = load();
    this.pinned = s.pinned;
    this.width = s.width;
    this.tab = s.tab;
    // A pinned panel should be visible immediately on load.
    this.open = s.pinned;
  }

  private persist(): void {
    const state: PersistedState = {
      pinned: this.pinned,
      width: this.width,
      tab: this.tab,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  toggle(): void {
    this.open = !this.open;
  }

  close(): void {
    // Pinning keeps the panel docked; closing it also unpins.
    this.open = false;
    if (this.pinned) {
      this.pinned = false;
      this.persist();
    }
  }

  setPinned(value: boolean): void {
    this.pinned = value;
    if (value) this.open = true;
    this.persist();
  }

  setTab(tab: LibraryTab): void {
    // The filter is shared across tabs and persists when switching.
    this.tab = tab;
    this.persist();
  }

  setWidth(px: number): void {
    this.width = clampWidth(px);
    this.persist();
  }

  openRule(name: string): void {
    this.tab = 'rules';
    this.query = '';
    this.target = name;
    this.open = true;
    this.persist();
  }
}

export const libraryStore = new LibraryStore();
