import type { ShaderTemplate } from '../types';

export const sunflareTemplate: ShaderTemplate = {
  id: 'sunflare',
  name: 'SunFlare',
  description: 'Noise-warped displacement with organic motion',
  exportFunctionName: 'renderSunFlare',
  vertexType: 'simple',
  usesTexture: false,
  exportAsync: false,
  vertexSource: `attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`,
  fragmentSource: `precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.y = 1.0 - uv.y;
  float t = u_time;

  float aspect = u_resolution.x / u_resolution.y;
  vec2 st = uv * vec2(aspect, 1.0);

  // Animated wave displacement for the bottom half
  float mask = smoothstep(/*@float:maskStart*/ 0.45 /*@*/, 1.0, uv.y);
  float intensity = mask * mask;

  // Animated drift offsets
  vec2 drift1 = vec2(sin(t * /*@float:driftSpeed1*/ 0.07 /*@*/) * 0.5, cos(t * 0.05) * 0.4);
  vec2 drift2 = vec2(cos(t * 0.06) * 0.4, sin(t * /*@float:driftSpeed2*/ 0.08 /*@*/) * 0.5);
  float drift3 = sin(t * 0.04) * 0.6;

  // Domain-warped noise — multiple layers for organic, random motion
  vec2 q = vec2(
    fbm(st * /*@float:noiseScale*/ 1.2 /*@*/ + drift1),
    fbm(st * /*@float:noiseScale*/ 1.2 /*@*/ + vec2(5.2, 1.3) + drift1.yx)
  );
  vec2 r = vec2(
    fbm(st * /*@float:noiseScale*/ 1.2 /*@*/ + /*@float:warpIntensity*/ 4.0 /*@*/ * q + vec2(1.7, 9.2) + drift2),
    fbm(st * /*@float:noiseScale*/ 1.2 /*@*/ + /*@float:warpIntensity*/ 4.0 /*@*/ * q + vec2(8.3, 2.8) + drift2.yx)
  );
  float warpNoise1 = fbm(st * 1.0 + /*@float:warpIntensity*/ 4.0 /*@*/ * r + drift3);
  float warpNoise2 = fbm(st * 1.5 + vec2(3.7, 7.1) + drift2.yx + drift3);

  // Gentle underlying wave, heavily broken up by noise
  float waveSpeed = t * /*@float:waveSpeed*/ 0.15 /*@*/;
  float wave = sin(st.x * 4.0 - waveSpeed + warpNoise1 * 4.0);

  // Displacement — mostly noise-driven with a hint of wave direction
  float displaceAmount = intensity * /*@float:displacement*/ 0.30 /*@*/;
  float yDisplace =
    (warpNoise1 - 0.5) * displaceAmount * 0.6 + wave * displaceAmount * 0.25;
  float xDisplace =
    (warpNoise2 - 0.5) * displaceAmount * 0.5;

  float gradY = uv.y + yDisplace;
  gradY = clamp(gradY, 0.0, 1.0);

  // 50/50 gradient: purple top, orange bottom
  vec3 purple = /*@color:colorA*/ vec3(0.263, 0.173, 0.863) /*@*/;
  vec3 orange = /*@color:colorB*/ vec3(1.0, 0.443, 0.188) /*@*/;

  float gradientPos = mix(uv.y, gradY, mask);
  float gradMix = smoothstep(/*@float:gradLow*/ 0.6 /*@*/, /*@float:gradHigh*/ 0.9 /*@*/, gradientPos);
  vec3 color = mix(purple, orange, gradMix);

  // Brightness pulse in the orange zone
  float brightPulse = 0.5 + 0.3 * warpNoise1 + 0.2 * wave;
  float brightnessBoost = 1.0 + intensity * /*@float:brightness*/ 0.3 /*@*/ * brightPulse;
  color *= mix(1.0, brightnessBoost, mask);

  // Warm breathing
  float breath = smoothstep(0.3, 0.7, warpNoise1);
  color += intensity * /*@color:breathColor*/ vec3(0.10, 0.04, 0.0) /*@*/ * breath;

  // Film grain only in animated region
  float grain = hash(gl_FragCoord.xy + fract(t * 60.0) * 100.0);
  color += intensity * (grain - 0.5) * /*@float:grainIntensity*/ 0.04 /*@*/;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`,
  params: [
    {
      id: 'colorA',
      label: 'Color A',
      type: 'color',
      defaultValue: '#432cdc',
      uniformName: 'u_colorA',
      glslDefault: 'vec3(0.263, 0.173, 0.863)',
      group: 'Colors',
    },
    {
      id: 'colorB',
      label: 'Color B',
      type: 'color',
      defaultValue: '#ff7130',
      uniformName: 'u_colorB',
      glslDefault: 'vec3(1.0, 0.443, 0.188)',
      group: 'Colors',
    },
    {
      id: 'breathColor',
      label: 'Glow Tint',
      type: 'color',
      defaultValue: '#1a0a00',
      uniformName: 'u_breathColor',
      glslDefault: 'vec3(0.10, 0.04, 0.0)',
      group: 'Colors',
    },
    {
      id: 'maskStart',
      label: 'Mask Start',
      type: 'float',
      defaultValue: 0.45,
      min: 0,
      max: 1.0,
      step: 0.01,
      uniformName: 'u_maskStart',
      glslDefault: '0.45',
      group: 'Mask',
    },
    {
      id: 'noiseScale',
      label: 'Noise Scale',
      type: 'float',
      defaultValue: 1.2,
      min: 0.1,
      max: 4.0,
      step: 0.01,
      uniformName: 'u_noiseScale',
      glslDefault: '1.2',
      group: 'Noise',
    },
    {
      id: 'warpIntensity',
      label: 'Warp Intensity',
      type: 'float',
      defaultValue: 4.0,
      min: 0,
      max: 10.0,
      step: 0.1,
      uniformName: 'u_warpIntensity',
      glslDefault: '4.0',
      group: 'Noise',
    },
    {
      id: 'driftSpeed1',
      label: 'Drift Speed X',
      type: 'float',
      defaultValue: 0.07,
      min: 0,
      max: 0.3,
      step: 0.001,
      uniformName: 'u_driftSpeed1',
      glslDefault: '0.07',
      group: 'Animation',
    },
    {
      id: 'driftSpeed2',
      label: 'Drift Speed Y',
      type: 'float',
      defaultValue: 0.08,
      min: 0,
      max: 0.3,
      step: 0.001,
      uniformName: 'u_driftSpeed2',
      glslDefault: '0.08',
      group: 'Animation',
    },
    {
      id: 'waveSpeed',
      label: 'Wave Speed',
      type: 'float',
      defaultValue: 0.15,
      min: 0,
      max: 0.5,
      step: 0.01,
      uniformName: 'u_waveSpeed',
      glslDefault: '0.15',
      group: 'Animation',
    },
    {
      id: 'displacement',
      label: 'Displacement',
      type: 'float',
      defaultValue: 0.30,
      min: 0,
      max: 0.8,
      step: 0.01,
      uniformName: 'u_displacement',
      glslDefault: '0.30',
      group: 'Effects',
    },
    {
      id: 'brightness',
      label: 'Brightness Boost',
      type: 'float',
      defaultValue: 0.3,
      min: 0,
      max: 1.0,
      step: 0.01,
      uniformName: 'u_brightness',
      glslDefault: '0.3',
      group: 'Effects',
    },
    {
      id: 'gradLow',
      label: 'Gradient Low',
      type: 'float',
      defaultValue: 0.6,
      min: 0,
      max: 1.0,
      step: 0.01,
      uniformName: 'u_gradLow',
      glslDefault: '0.6',
      group: 'Blending',
    },
    {
      id: 'gradHigh',
      label: 'Gradient High',
      type: 'float',
      defaultValue: 0.9,
      min: 0,
      max: 1.0,
      step: 0.01,
      uniformName: 'u_gradHigh',
      glslDefault: '0.9',
      group: 'Blending',
    },
    {
      id: 'grainIntensity',
      label: 'Film Grain',
      type: 'float',
      defaultValue: 0.04,
      min: 0,
      max: 0.2,
      step: 0.005,
      uniformName: 'u_grainIntensity',
      glslDefault: '0.04',
      group: 'Effects',
    },
  ],
};
