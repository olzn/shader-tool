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

export const retroPreset: Preset = {
  id: 'retro',
  name: 'Retro',
  description: 'CRT terminal with warped noise',
  effects: [
    { blockId: 'domain-warp' },
    { blockId: 'crt-scanlines' },
    { blockId: 'chromatic-aberration' },
    { blockId: 'film-grain' },
    { blockId: 'vignette' },
  ],
  paramOverrides: {
    'domain-warp.noiseScale': 1.2,
    'domain-warp.warpIntensity': 3.0,
    'domain-warp.rotation': 20,
    'domain-warp.driftSpeed1': 0.02,
    'domain-warp.driftSpeed2': 0.03,
    'domain-warp.mixLow': 0.2,
    'domain-warp.mixHigh': 0.8,
    'crt-scanlines.lineWidth': 500,
    'crt-scanlines.intensity': 0.25,
    'crt-scanlines.flicker': 0.04,
    'chromatic-aberration.amount': 0.012,
    'film-grain.intensity': 0.06,
    'vignette.strength': 0.7,
    'vignette.radius': 0.55,
  },
  colors: ['#0a1a0a', '#33ff66'],
};

export const cosmicPreset: Preset = {
  id: 'cosmic',
  name: 'Cosmic',
  description: 'Spiral galaxy with particles',
  effects: [
    { blockId: 'spiral' },
    { blockId: 'particles' },
    { blockId: 'brightness' },
    { blockId: 'vignette' },
    { blockId: 'film-grain' },
  ],
  paramOverrides: {
    'spiral.arms': 3,
    'spiral.tightness': 12,
    'spiral.speed': 0.2,
    'spiral.thickness': 0.6,
    'particles.density': 12,
    'particles.size': 0.08,
    'particles.speed': 0.15,
    'particles.drift': 0.3,
    'brightness.amount': 0.1,
    'vignette.strength': 0.4,
    'vignette.radius': 0.8,
    'film-grain.intensity': 0.05,
  },
  colors: ['#0a0020', '#6a3de8', '#ff6b9d'],
};

export const oceanPreset: Preset = {
  id: 'ocean',
  name: 'Ocean',
  description: 'Layered waves with soft blur',
  effects: [
    { blockId: 'wave' },
    { blockId: 'diffuse-blur' },
    { blockId: 'vignette' },
    { blockId: 'film-grain' },
  ],
  paramOverrides: {
    'wave.frequency': 6.0,
    'wave.amplitude': 0.4,
    'wave.speed': 0.3,
    'wave.angle': 10,
    'diffuse-blur.amount': 0.03,
    'diffuse-blur.scale': 30,
    'diffuse-blur.speed': 0.2,
    'vignette.strength': 0.3,
    'vignette.radius': 0.8,
    'film-grain.intensity': 0.03,
  },
  colors: ['#001f3f', '#0074d9', '#7fdbff'],
};

export const halftonePreset: Preset = {
  id: 'halftone',
  name: 'Halftone',
  description: 'Gradient through a dot-grid filter',
  effects: [
    { blockId: 'gradient' },
    { blockId: 'dot-grid' },
    { blockId: 'brightness' },
  ],
  paramOverrides: {
    'gradient.angle': 135,
    'gradient.softness': 0.8,
    'dot-grid.gridSize': 16,
    'dot-grid.dotScale': 0.45,
    'brightness.amount': 0.05,
  },
  colors: ['#ff4136', '#ffdc00'],
};

export const ledBarsPreset: Preset = {
  id: 'led-bars',
  name: 'LED Bars',
  description: 'Noise-driven bars on an LED pixel grid',
  effects: [
    { blockId: 'led-bars' },
    { blockId: 'vignette' },
  ],
  paramOverrides: {
    'led-bars.columns': 48,
    'led-bars.rows': 30,
    'led-bars.cellGap': 0.25,
    'led-bars.cellRound': 0.3,
    'led-bars.noiseScale': 1.5,
    'led-bars.vertStretch': 3.0,
    'led-bars.barWidth': 0.5,
    'led-bars.speed': 0.15,
    'led-bars.brightness': 0.9,
    'led-bars.bgDarkness': 0.06,
    'vignette.strength': 0.3,
    'vignette.radius': 0.85,
  },
  colors: ['#1a3a8a', '#ff6a20'],
};

export const plasmaPreset: Preset = {
  id: 'plasma',
  name: 'Plasma',
  description: 'Polar-warped noise with vivid neon colors',
  effects: [
    { blockId: 'polar' },
    { blockId: 'domain-warp' },
    { blockId: 'film-grain' },
    { blockId: 'vignette' },
  ],
  paramOverrides: {
    'polar.scale': 2.5,
    'polar.rotation': 0,
    'domain-warp.noiseScale': 0.6,
    'domain-warp.warpIntensity': 5.0,
    'domain-warp.rotation': 60,
    'domain-warp.driftSpeed1': 0.04,
    'domain-warp.driftSpeed2': 0.05,
    'domain-warp.mixLow': 0.15,
    'domain-warp.mixHigh': 0.85,
    'film-grain.intensity': 0.03,
    'vignette.strength': 0.4,
    'vignette.radius': 0.75,
  },
  colors: ['#ff00cc', '#00ffcc', '#4400ff'],
};

export const presets: Preset[] = [
  blankPreset, swirlPreset, glowPreset,
  retroPreset, cosmicPreset, oceanPreset, halftonePreset, ledBarsPreset, plasmaPreset,
];

export function getPreset(id: string): Preset | undefined {
  return presets.find(p => p.id === id);
}
