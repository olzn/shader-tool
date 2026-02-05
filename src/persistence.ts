import type { SavedShader, AppState } from './types';

const STORAGE_KEY = 'shader-tool-library';

export function saveShader(state: AppState): SavedShader {
  const saved: SavedShader = {
    id: crypto.randomUUID(),
    name: state.shaderName || 'Untitled',
    savedAt: Date.now(),
    activePresetId: state.activePresetId,
    activeEffects: state.activeEffects,
    paramValues: state.paramValues,
    colors: state.colors,
    exportFunctionName: state.exportFunctionName,
    usesTexture: state.usesTexture,
    vertexType: state.vertexType,
    exportAsync: state.exportAsync,
  };

  const all = loadSavedShaders();
  all.push(saved);
  writeSaved(all);
  return saved;
}

export function loadSavedShaders(): SavedShader[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const shaders = JSON.parse(raw) as SavedShader[];
    // Migrate legacy colorA/colorB to colors[]
    for (const s of shaders) {
      const legacy = s as SavedShader & { colorA?: string; colorB?: string };
      if (!s.colors && legacy.colorA) {
        s.colors = [legacy.colorA, legacy.colorB].filter(Boolean) as string[];
        delete legacy.colorA;
        delete legacy.colorB;
      }
    }
    return shaders;
  } catch {
    return [];
  }
}

export function deleteSavedShader(id: string): void {
  const all = loadSavedShaders().filter(s => s.id !== id);
  writeSaved(all);
}

export function savedShaderToState(saved: SavedShader): Partial<AppState> {
  return {
    activePresetId: saved.activePresetId,
    shaderName: saved.name,
    activeEffects: saved.activeEffects,
    paramValues: saved.paramValues,
    colors: saved.colors,
    exportFunctionName: saved.exportFunctionName,
    usesTexture: saved.usesTexture,
    vertexType: saved.vertexType,
    exportAsync: saved.exportAsync,
  };
}

export function renameSavedShader(id: string, newName: string): void {
  const all = loadSavedShaders();
  const shader = all.find(s => s.id === id);
  if (shader) {
    shader.name = newName;
    writeSaved(all);
  }
}

export function encodeShaderUrl(saved: SavedShader): string {
  const payload = {
    n: saved.name,
    e: saved.activeEffects,
    p: saved.paramValues,
    c: saved.colors,
  };
  return btoa(JSON.stringify(payload));
}

export function decodeShaderUrl(hash: string): Partial<AppState> | null {
  try {
    const match = hash.match(/^#s=(.+)$/);
    if (!match) return null;
    const payload = JSON.parse(atob(match[1]));
    return {
      shaderName: payload.n || 'Shared Shader',
      activeEffects: payload.e || [],
      paramValues: payload.p || {},
      colors: payload.c || [],
      activePresetId: null,
    };
  } catch {
    return null;
  }
}

function writeSaved(shaders: SavedShader[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shaders));
  } catch {
    // localStorage full
  }
}
