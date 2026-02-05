import type { AppState } from './types';

type Listener = (state: AppState, prev: AppState) => void;

const AUTOSAVE_KEY = 'shader-tool-autosave';
const AUTOSAVE_INTERVAL = 10_000;

class Store {
  private state: AppState;
  private listeners = new Set<Listener>();
  private autosaveTimer: number | null = null;

  constructor(initial: AppState) {
    this.state = { ...initial };
    this.startAutosave();
  }

  getState(): Readonly<AppState> {
    return this.state;
  }

  setState(partial: Partial<AppState>): void {
    const prev = this.state;
    this.state = { ...prev, ...partial };
    for (const fn of this.listeners) {
      fn(this.state, prev);
    }
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
    this.listeners.clear();
  }
}

export { Store, AUTOSAVE_KEY };
