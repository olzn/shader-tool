import type { ShaderTemplate } from '../types';

export const glowTemplate: ShaderTemplate = {
  id: 'glow',
  name: 'Glow',
  description: 'Sine-wave displacement with bottom-half gradient',
  exportFunctionName: 'renderGlow',
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

  // Vertical displacement — many overlapping waves with irrational ratios
  float w1 = sin(st.x * /*@float:waveFreq1*/ 5.0 /*@*/ - t * /*@float:waveSpeed*/ 0.25 /*@*/ + st.y * 0.8);
  float w2 = sin(st.x * 3.2 + t * 0.18 + 1.4) * 0.7;
  float w3 = sin(st.x * 8.0 - t * 0.30 - st.y * 1.2 + 2.8) * 0.4;
  float w4 = sin(st.x * 1.8 + t * 0.12 + st.y * 0.5 + 4.1) * 0.5;
  float w5 = sin(st.x * 6.3 - t * 0.14 + st.y * 1.7 + 0.9) * 0.35;
  float w6 = sin(st.x * 2.1 + t * 0.23 - st.y * 0.6 + 5.7) * 0.55;
  float w7 = sin(st.x * 11.0 - t * 0.08 + st.y * 2.3 + 3.1) * 0.2;
  float w8 = sin(st.x * 0.9 + t * 0.07 + st.y * 0.3 + 7.4) * 0.65;
  float wave = (w1 + w2 + w3 + w4 + w5 + w6 + w7 + w8) / 4.35;

  // Horizontal displacement — cross-axis waves for lateral drift
  float wv1 = sin(st.x * 4.0 + t * 0.20 + 0.7);
  float wv2 = sin(st.x * 6.5 - t * 0.22 + st.y * 1.0 + 3.3) * 0.6;
  float wv3 = sin(st.x * 2.5 - t * 0.15 + 5.0) * 0.5;
  float wv4 = sin(st.y * 3.7 + t * 0.11 + st.x * 1.4 + 2.1) * 0.45;
  float wv5 = sin(st.x * 9.2 + t * 0.17 - st.y * 0.8 + 6.3) * 0.25;
  float wv6 = sin(st.x * 1.3 - t * 0.09 + st.y * 2.1 + 8.5) * 0.55;
  float wave2 = (wv1 + wv2 + wv3 + wv4 + wv5 + wv6) / 3.35;

  // Displacement
  float displaceAmount = intensity * /*@float:displacement*/ 0.30 /*@*/;
  float yDisplace = wave * displaceAmount;
  float xDisplace = wave2 * displaceAmount * 0.4;

  float gradY = uv.y + yDisplace;
  gradY = clamp(gradY, 0.0, 1.0);

  // 50/50 gradient: purple top, orange bottom
  vec3 purple = /*@color:colorA*/ vec3(0.263, 0.173, 0.863) /*@*/;
  vec3 orange = /*@color:colorB*/ vec3(1.0, 0.443, 0.188) /*@*/;

  float gradientPos = mix(uv.y, gradY, mask);
  float gradMix = smoothstep(/*@float:gradLow*/ 0.6 /*@*/, /*@float:gradHigh*/ 0.9 /*@*/, gradientPos);
  vec3 color = mix(purple, orange, gradMix);

  // Brightness pulse in the orange zone
  float brightPulse = 0.5 + 0.5 * wave;
  float brightnessBoost = 1.0 + intensity * /*@float:brightness*/ 0.3 /*@*/ * brightPulse;
  color *= mix(1.0, brightnessBoost, mask);

  // Warm breathing
  float breath = smoothstep(-0.2, 0.5, wave);
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
      id: 'waveFreq1',
      label: 'Wave Frequency',
      type: 'float',
      defaultValue: 5.0,
      min: 1.0,
      max: 15.0,
      step: 0.1,
      uniformName: 'u_waveFreq1',
      glslDefault: '5.0',
      group: 'Waves',
    },
    {
      id: 'waveSpeed',
      label: 'Wave Speed',
      type: 'float',
      defaultValue: 0.25,
      min: 0,
      max: 1.0,
      step: 0.01,
      uniformName: 'u_waveSpeed',
      glslDefault: '0.25',
      group: 'Waves',
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
