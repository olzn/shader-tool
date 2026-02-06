import type { AppState } from './types';

type Listener = (state: AppState, prev: AppState) => void;

const AUTOSAVE_KEY = 'glint-studio-autosave';
const AUTOSAVE_INTERVAL = 10_000;
const MAX_HISTORY = 50;

/** Fields that are part of the undoable creative state (not UI chrome). */
const UNDOABLE_KEYS: (keyof AppState)[] = [
  'shaderName', 'activePresetId', 'activeEffects', 'paramValues',
  'colors', 'exportFunctionName',
];

function snapshotUndoable(state: AppState): Partial<AppState> {
  const snap: Record<string, unknown> = {};
  for (const k of UNDOABLE_KEYS) {
    const val = state[k];
    snap[k] = typeof val === 'object' && val !== null ? JSON.parse(JSON.stringify(val)) : val;
  }
  return snap as Partial<AppState>;
}

class Store {
  private state: AppState;
  private listeners = new Set<Listener>();
  private autosaveTimer: number | null = null;

  // Undo/redo
  private undoStack: Partial<AppState>[] = [];
  private redoStack: Partial<AppState>[] = [];
  private historyListeners = new Set<() => void>();
  private paramDebounceTimer: number | null = null;
  private pendingParamSnapshot: Partial<AppState> | null = null;

  constructor(initial: AppState) {
    this.state = { ...initial };
    this.startAutosave();
  }

  getState(): Readonly<AppState> {
    return this.state;
  }

  /** Basic setState — no history entry. Use for continuous updates like slider drag. */
  setState(partial: Partial<AppState>): void {
    const prev = this.state;
    this.state = { ...prev, ...partial };
    for (const fn of this.listeners) {
      fn(this.state, prev);
    }
  }

  /**
   * setState that pushes an undo snapshot *before* applying the change.
   * Use for discrete user actions (add effect, remove effect, preset load, etc.).
   */
  setStateWithHistory(partial: Partial<AppState>): void {
    this.flushParamDebounce();
    this.pushUndo();
    this.redoStack.length = 0;
    this.setState(partial);
    this.notifyHistory();
  }

  /**
   * For parameter tweaks (sliders). Captures a snapshot on the first call,
   * then debounces so rapid slider drags produce a single undo entry.
   */
  setStateParamChange(partial: Partial<AppState>): void {
    if (!this.pendingParamSnapshot) {
      this.pendingParamSnapshot = snapshotUndoable(this.state);
    }
    this.setState(partial);
    if (this.paramDebounceTimer !== null) {
      clearTimeout(this.paramDebounceTimer);
    }
    this.paramDebounceTimer = window.setTimeout(() => {
      this.flushParamDebounce();
    }, 600);
  }

  private flushParamDebounce(): void {
    if (this.pendingParamSnapshot) {
      this.undoStack.push(this.pendingParamSnapshot);
      if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
      this.redoStack.length = 0;
      this.pendingParamSnapshot = null;
      this.notifyHistory();
    }
    if (this.paramDebounceTimer !== null) {
      clearTimeout(this.paramDebounceTimer);
      this.paramDebounceTimer = null;
    }
  }

  private pushUndo(): void {
    this.undoStack.push(snapshotUndoable(this.state));
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
  }

  undo(): boolean {
    this.flushParamDebounce();
    const snapshot = this.undoStack.pop();
    if (!snapshot) return false;
    this.redoStack.push(snapshotUndoable(this.state));
    this.setState(snapshot);
    this.notifyHistory();
    return true;
  }

  redo(): boolean {
    const snapshot = this.redoStack.pop();
    if (!snapshot) return false;
    this.undoStack.push(snapshotUndoable(this.state));
    this.setState(snapshot);
    this.notifyHistory();
    return true;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0 || this.pendingParamSnapshot !== null;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  onHistoryChange(fn: () => void): () => void {
    this.historyListeners.add(fn);
    return () => this.historyListeners.delete(fn);
  }

  private notifyHistory(): void {
    for (const fn of this.historyListeners) fn();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private startAutosave(): void {
    this.autosaveTimer = window.setInterval(() => {
      this.saveAutosave();
    }, AUTOSAVE_INTERVAL);
  }

  saveAutosave(): void {
    try {
      const data = {
        shaderName: this.state.shaderName,
        activePresetId: this.state.activePresetId,
        activeEffects: this.state.activeEffects,
        paramValues: this.state.paramValues,
        colors: this.state.colors,
        exportFunctionName: this.state.exportFunctionName,
        usesTexture: this.state.usesTexture,
        vertexType: this.state.vertexType,
        exportAsync: this.state.exportAsync,
      };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
    } catch {
      // localStorage full or unavailable
    }
  }

  static loadAutosave(): Partial<AppState> | null {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      // Validate it has the new shape (activeEffects array)
      if (!Array.isArray(data.activeEffects)) return null;
      // Migrate from colorA/colorB to colors[]
      if (!data.colors && data.colorA) {
        data.colors = [data.colorA, data.colorB].filter(Boolean);
        delete data.colorA;
        delete data.colorB;
      }
      return data;
    } catch {
      return null;
    }
  }

  destroy(): void {
    if (this.autosaveTimer !== null) {
      clearInterval(this.autosaveTimer);
    }
    if (this.paramDebounceTimer !== null) {
      clearTimeout(this.paramDebounceTimer);
    }
    this.listeners.clear();
    this.historyListeners.clear();
  }
}

export { Store, AUTOSAVE_KEY };
