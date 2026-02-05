import type { ShaderTemplate } from '../types';

export const swirlTemplate: ShaderTemplate = {
  id: 'swirl',
  name: 'Swirl',
  description: 'Domain-warped FBM noise with two-color gradient',
  exportFunctionName: 'renderBackdrop',
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
  float aspect = u_resolution.x / u_resolution.y;
  float t = u_time;

  vec2 st = uv * vec2(aspect, 1.0);

  float ca = cos(/*@float:rotation*/ 0.7 /*@*/);
  float sa = sin(/*@float:rotation*/ 0.7 /*@*/);
  vec2 rotated = vec2(
    st.x * ca - st.y * sa,
    st.x * sa + st.y * ca
  );

  vec2 drift1 = vec2(sin(t * /*@float:driftSpeed1*/ 0.03 /*@*/) * 0.5, cos(t * /*@float:driftSpeed2*/ 0.04 /*@*/) * 0.5);
  vec2 drift2 = vec2(cos(t * 0.025) * 0.5, sin(t * 0.035) * 0.5);
  float drift3 = sin(t * 0.02) * 0.5;

  vec2 q = vec2(
    fbm(rotated * /*@float:noiseScale*/ 0.8 /*@*/ + vec2(0.0, 0.0) + drift1),
    fbm(rotated * /*@float:noiseScale*/ 0.8 /*@*/ + vec2(5.2, 1.3) + drift1.yx)
  );

  vec2 r = vec2(
    fbm(rotated * /*@float:noiseScale*/ 0.8 /*@*/ + /*@float:warpIntensity*/ 4.0 /*@*/ * q + vec2(1.7, 9.2) + drift2),
    fbm(rotated * /*@float:noiseScale*/ 0.8 /*@*/ + /*@float:warpIntensity*/ 4.0 /*@*/ * q + vec2(8.3, 2.8) + drift2.yx)
  );

  float f = fbm(rotated * /*@float:noiseScale*/ 0.8 /*@*/ + /*@float:warpIntensity*/ 4.0 /*@*/ * r + drift3);

  vec3 blue = /*@color:colorA*/ vec3(0.235, 0.118, 0.659) /*@*/;
  vec3 orange = /*@color:colorB*/ vec3(1.0, 0.443, 0.188) /*@*/;

  float mixFactor = smoothstep(/*@float:mixLow*/ 0.25 /*@*/, /*@float:mixHigh*/ 0.75 /*@*/, f);

  mixFactor += 0.15 * (q.x - 0.5);
  mixFactor = clamp(mixFactor, 0.0, 1.0);

  vec3 color = mix(blue, orange, mixFactor);

  color *= 0.85 + 0.15 * smoothstep(0.0, 0.5, f);

  float grain = hash(gl_FragCoord.xy + fract(t * 60.0) * 100.0);
  color += (grain - 0.5) * /*@float:grainIntensity*/ 0.08 /*@*/;

  color = clamp(color, 0.0, 1.0);
  gl_FragColor = vec4(color, 1.0);
}`,
  params: [
    {
      id: 'colorA',
      label: 'Color A',
      type: 'color',
      defaultValue: '#3c1ea8',
      uniformName: 'u_colorA',
      glslDefault: 'vec3(0.235, 0.118, 0.659)',
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
      id: 'rotation',
      label: 'Rotation',
      type: 'float',
      defaultValue: 0.7,
      min: 0,
      max: 6.28,
      step: 0.01,
      uniformName: 'u_rotation',
      glslDefault: '0.7',
      group: 'Transform',
    },
    {
      id: 'noiseScale',
      label: 'Noise Scale',
      type: 'float',
      defaultValue: 0.8,
      min: 0.1,
      max: 3.0,
      step: 0.01,
      uniformName: 'u_noiseScale',
      glslDefault: '0.8',
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
      defaultValue: 0.03,
      min: 0,
      max: 0.2,
      step: 0.001,
      uniformName: 'u_driftSpeed1',
      glslDefault: '0.03',
      group: 'Animation',
    },
    {
      id: 'driftSpeed2',
      label: 'Drift Speed Y',
      type: 'float',
      defaultValue: 0.04,
      min: 0,
      max: 0.2,
      step: 0.001,
      uniformName: 'u_driftSpeed2',
      glslDefault: '0.04',
      group: 'Animation',
    },
    {
      id: 'mixLow',
      label: 'Mix Low',
      type: 'float',
      defaultValue: 0.25,
      min: 0,
      max: 1.0,
      step: 0.01,
      uniformName: 'u_mixLow',
      glslDefault: '0.25',
      group: 'Blending',
    },
    {
      id: 'mixHigh',
      label: 'Mix High',
      type: 'float',
      defaultValue: 0.75,
      min: 0,
      max: 1.0,
      step: 0.01,
      uniformName: 'u_mixHigh',
      glslDefault: '0.75',
      group: 'Blending',
    },
    {
      id: 'grainIntensity',
      label: 'Film Grain',
      type: 'float',
      defaultValue: 0.08,
      min: 0,
      max: 0.3,
      step: 0.005,
      uniformName: 'u_grainIntensity',
      glslDefault: '0.08',
      group: 'Effects',
    },
  ],
};
