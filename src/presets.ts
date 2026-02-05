import type { Preset } from './types';

export const blankPreset: Preset = {
  id: 'blank',
  name: 'Blank',
  description: 'Empty canvas',
  effects: [],
  paramOverrides: {},
  colors: [],
};

export const swirlPreset: Preset = {
  id: 'swirl',
  name: 'Swirl',
  description: 'Organic domain-warped noise flow',
  effects: [
    { blockId: 'domain-warp' },
    { blockId: 'brightness' },
    { blockId: 'vignette' },
    { blockId: 'film-grain' },
  ],
  paramOverrides: {
    // domain-warp params use blockId_paramId for matching
    'domain-warp.noiseScale': 0.8,
    'domain-warp.warpIntensity': 4.0,
    'domain-warp.rotation': 40,
    'domain-warp.driftSpeed1': 0.03,
    'domain-warp.driftSpeed2': 0.04,
    'domain-warp.mixLow': 0.25,
    'domain-warp.mixHigh': 0.75,
    'brightness.amount': 0.0,
    'vignette.strength': 0.0,
    'vignette.radius': 0.7,
    'film-grain.intensity': 0.08,
  },
  colors: ['#3c1ea8', '#ff7130'],
};

export const glowPreset: Preset = {
  id: 'glow',
  name: 'Glow',
  description: 'Sine-wave displacement with warm glow',
  effects: [
    { blockId: 'glow-waves' },
    { blockId: 'vignette' },
    { blockId: 'film-grain' },
  ],
  paramOverrides: {
    'glow-waves.maskStart': 0.45,
    'glow-waves.waveFreq': 5.0,
    'glow-waves.waveSpeed': 0.25,
    'glow-waves.displacement': 0.30,
    'glow-waves.gradLow': 0.6,
    'glow-waves.gradHigh': 0.9,
    'glow-waves.brightness': 0.3,
    'glow-waves.breathColor': '#1a0a00',
    'vignette.strength': 0.0,
    'vignette.radius': 0.7,
    'film-grain.intensity': 0.04,
  },
  colors: ['#432cdc', '#ff7130'],
};

export const presets: Preset[] = [blankPreset, swirlPreset, glowPreset];

export function getPreset(id: string): Preset | undefined {
  return presets.find(p => p.id === id);
}
