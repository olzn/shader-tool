import type { ShaderTemplate } from '../types';

export const blankTemplate: ShaderTemplate = {
  id: 'blank',
  name: 'Blank',
  description: 'UI-driven starter — gradient, noise, waves, and post effects',
  exportFunctionName: 'renderShader',
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

// --- Utility functions ---

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
  float aspect = u_resolution.x / u_resolution.y;
  float t = u_time * /*@float:animSpeed*/ 1.0 /*@*/;

  // --- 1. Gradient base ---
  float angle = /*@float:gradAngle*/ 0.0 /*@*/;
  float ca = cos(angle);
  float sa = sin(angle);
  vec2 center = vec2(0.5);
  vec2 ruv = vec2(
    (uv.x - center.x) * ca - (uv.y - center.y) * sa,
    (uv.x - center.x) * sa + (uv.y - center.y) * ca
  );
  float gradPos = ruv.y + 0.5;

  float mid = /*@float:gradMidpoint*/ 0.5 /*@*/;
  float soft = /*@float:gradSoftness*/ 0.5 /*@*/;
  float halfSpread = max(soft * 0.5, 0.001);
  float gradMix = smoothstep(mid - halfSpread, mid + halfSpread, gradPos);

  vec3 colA = /*@color:colorA*/ vec3(0.129, 0.098, 0.380) /*@*/;
  vec3 colB = /*@color:colorB*/ vec3(0.976, 0.573, 0.318) /*@*/;
  vec3 color = mix(colA, colB, gradMix);

  // --- 2. Noise layer ---
  float noiseInt = /*@float:noiseIntensity*/ 0.0 /*@*/;
  if (noiseInt > 0.001) {
    vec2 nUV = uv * vec2(aspect, 1.0) * /*@float:noiseScale*/ 3.0 /*@*/;
    float noiseDrift = t * 0.05;
    float n = fbm(nUV + vec2(noiseDrift, noiseDrift * 0.7));
    float displaced = gradMix + (n - 0.5) * noiseInt;
    displaced = clamp(displaced, 0.0, 1.0);
    color = mix(colA, colB, displaced);
  }

  // --- 3. Wave layer ---
  float waveAmp = /*@float:waveAmplitude*/ 0.0 /*@*/;
  if (waveAmp > 0.001) {
    float wFreq = /*@float:waveFrequency*/ 4.0 /*@*/;
    float wSpeed = /*@float:waveSpeed*/ 0.3 /*@*/;
    float wRand = /*@float:waveRandomness*/ 0.0 /*@*/;
    vec2 wUV = uv * vec2(aspect, 1.0);
    float nWarp = wRand > 0.001 ? fbm(wUV * 2.0 + t * 0.04) * wRand : 0.0;
    float wave = sin(wUV.x * wFreq + t * wSpeed + nWarp * 6.0) * waveAmp;
    float wave2 = sin(wUV.y * wFreq * 0.7 - t * wSpeed * 0.6 + 2.0 + nWarp * 4.0) * waveAmp * 0.5;
    float waveDisplace = wave + wave2 + nWarp * waveAmp * 0.5;
    color = mix(colA, colB, clamp(gradMix + waveDisplace, 0.0, 1.0));
  }

  // --- 4. Brightness ---
  color *= 1.0 + /*@float:brightness*/ 0.0 /*@*/;

  // --- 5. Vignette ---
  float vigStr = /*@float:vignetteStrength*/ 0.0 /*@*/;
  if (vigStr > 0.001) {
    float vigSize = /*@float:vignetteSize*/ 0.7 /*@*/;
    vec2 vig = uv - 0.5;
    float d = length(vig);
    float vignette = smoothstep(vigSize, vigSize + 0.4, d);
    color *= 1.0 - vignette * vigStr;
  }

  // --- 6. Film grain ---
  float grainAmt = /*@float:grainIntensity*/ 0.0 /*@*/;
  if (grainAmt > 0.001) {
    float grain = hash(gl_FragCoord.xy + fract(t * 60.0) * 100.0);
    color += (grain - 0.5) * grainAmt;
  }

  color = clamp(color, 0.0, 1.0);
  gl_FragColor = vec4(color, 1.0);
}`,
  params: [
    {
      id: 'colorA',
      label: 'Color A',
      type: 'color',
      defaultValue: '#211961',
      uniformName: 'u_colorA',
      glslDefault: 'vec3(0.129, 0.098, 0.380)',
      group: 'Colors',
    },
    {
      id: 'colorB',
      label: 'Color B',
      type: 'color',
      defaultValue: '#f99251',
      uniformName: 'u_colorB',
      glslDefault: 'vec3(0.976, 0.573, 0.318)',
      group: 'Colors',
    },
    {
      id: 'gradAngle',
      label: 'Angle',
      type: 'float',
      defaultValue: 0.0,
      min: -3.14,
      max: 3.14,
      step: 0.01,
      uniformName: 'u_gradAngle',
      glslDefault: '0.0',
      group: 'Gradient',
    },
    {
      id: 'gradMidpoint',
      label: 'Midpoint',
      type: 'float',
      defaultValue: 0.5,
      min: 0,
      max: 1.0,
      step: 0.01,
      uniformName: 'u_gradMidpoint',
      glslDefault: '0.5',
      group: 'Gradient',
    },
    {
      id: 'gradSoftness',
      label: 'Softness',
      type: 'float',
      defaultValue: 0.5,
      min: 0.01,
      max: 1.0,
      step: 0.01,
      uniformName: 'u_gradSoftness',
      glslDefault: '0.5',
      group: 'Gradient',
    },
    {
      id: 'noiseIntensity',
      label: 'Intensity',
      type: 'float',
      defaultValue: 0.0,
      min: 0,
      max: 1.5,
      step: 0.01,
      uniformName: 'u_noiseIntensity',
      glslDefault: '0.0',
      group: 'Noise',
    },
    {
      id: 'noiseScale',
      label: 'Scale',
      type: 'float',
      defaultValue: 3.0,
      min: 0.5,
      max: 10.0,
      step: 0.1,
      uniformName: 'u_noiseScale',
      glslDefault: '3.0',
      group: 'Noise',
    },
    {
      id: 'waveAmplitude',
      label: 'Amplitude',
      type: 'float',
      defaultValue: 0.0,
      min: 0,
      max: 0.5,
      step: 0.005,
      uniformName: 'u_waveAmplitude',
      glslDefault: '0.0',
      group: 'Waves',
    },
    {
      id: 'waveFrequency',
      label: 'Frequency',
      type: 'float',
      defaultValue: 4.0,
      min: 1.0,
      max: 15.0,
      step: 0.1,
      uniformName: 'u_waveFrequency',
      glslDefault: '4.0',
      group: 'Waves',
    },
    {
      id: 'waveSpeed',
      label: 'Speed',
      type: 'float',
      defaultValue: 0.3,
      min: 0,
      max: 2.0,
      step: 0.01,
      uniformName: 'u_waveSpeed',
      glslDefault: '0.3',
      group: 'Waves',
    },
    {
      id: 'waveRandomness',
      label: 'Randomness',
      type: 'float',
      defaultValue: 0.0,
      min: 0,
      max: 1.0,
      step: 0.01,
      uniformName: 'u_waveRandomness',
      glslDefault: '0.0',
      group: 'Waves',
    },
    {
      id: 'animSpeed',
      label: 'Global Speed',
      type: 'float',
      defaultValue: 1.0,
      min: 0,
      max: 3.0,
      step: 0.01,
      uniformName: 'u_animSpeed',
      glslDefault: '1.0',
      group: 'Animation',
    },
    {
      id: 'brightness',
      label: 'Brightness',
      type: 'float',
      defaultValue: 0.0,
      min: -0.5,
      max: 0.5,
      step: 0.01,
      uniformName: 'u_brightness',
      glslDefault: '0.0',
      group: 'Effects',
    },
    {
      id: 'vignetteStrength',
      label: 'Vignette',
      type: 'float',
      defaultValue: 0.0,
      min: 0,
      max: 1.0,
      step: 0.01,
      uniformName: 'u_vignetteStrength',
      glslDefault: '0.0',
      group: 'Effects',
    },
    {
      id: 'vignetteSize',
      label: 'Vignette Size',
      type: 'float',
      defaultValue: 0.7,
      min: 0.2,
      max: 1.0,
      step: 0.01,
      uniformName: 'u_vignetteSize',
      glslDefault: '0.7',
      group: 'Effects',
    },
    {
      id: 'grainIntensity',
      label: 'Film Grain',
      type: 'float',
      defaultValue: 0.0,
      min: 0,
      max: 0.3,
      step: 0.005,
      uniformName: 'u_grainIntensity',
      glslDefault: '0.0',
      group: 'Effects',
    },
  ],
};
