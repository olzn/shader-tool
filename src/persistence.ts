import type { SavedShader, AppState } from './types';
import { getEffect } from './effects/index';

const STORAGE_KEY = 'glint-studio-library';

// Named colors for descriptive save names
const NAMED_COLORS: Array<{ name: string; r: number; g: number; b: number }> = [
  { name: 'Red', r: 255, g: 0, b: 0 },
  { name: 'Orange', r: 255, g: 127, b: 0 },
  { name: 'Yellow', r: 255, g: 255, b: 0 },
  { name: 'Green', r: 0, g: 180, b: 0 },
  { name: 'Cyan', r: 0, g: 220, b: 220 },
  { name: 'Blue', r: 0, g: 80, b: 255 },
  { name: 'Purple', r: 128, g: 0, b: 255 },
  { name: 'Pink', r: 255, g: 100, b: 180 },
  { name: 'White', r: 255, g: 255, b: 255 },
  { name: 'Black', r: 0, g: 0, b: 0 },
  { name: 'Gray', r: 128, g: 128, b: 128 },
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function nearestColorName(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  let best = 'Gray';
  let bestDist = Infinity;
  for (const c of NAMED_COLORS) {
    const dist = (r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = c.name;
    }
  }
  return best;
}

export function generateShaderName(state: AppState): string {
  const effects = state.activeEffects.filter(ae => ae.enabled);
  const generators = effects.filter(ae => {
    const block = getEffect(ae.blockId);
    return block && block.category === 'generator';
  });
  const postCount = effects.filter(ae => {
    const block = getEffect(ae.blockId);
    return block && block.category === 'post';
  }).length;

  // Build effect part
  let effectPart = '';
  if (generators.length === 0) {
    const uvEffects = effects.filter(ae => {
      const block = getEffect(ae.blockId);
      return block && block.category === 'uv-transform';
    });
    if (uvEffects.length > 0) {
      const block = getEffect(uvEffects[0].blockId);
      effectPart = block ? block.name : '';
    }
  } else if (generators.length === 1) {
    const block = getEffect(generators[0].blockId);
    effectPart = block ? block.name : '';
    if (postCount > 0) effectPart += ` + ${postCount} Post`;
  } else {
    const block = getEffect(generators[0].blockId);
    effectPart = block ? `${block.name} + ${generators.length - 1} more` : '';
  }

  if (!effectPart) return 'Untitled';

  // Build color part
  if (state.colors.length === 0) return effectPart;

  const colorNames = state.colors.map(nearestColorName);
  // Deduplicate adjacent same names
  const deduped = colorNames.filter((c, i) => i === 0 || c !== colorNames[i - 1]);
  const colorPart = deduped.join('-');

  return `${effectPart} · ${colorPart}`;
}

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
