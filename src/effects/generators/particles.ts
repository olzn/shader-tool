import type { EffectBlock } from '../../types';

export const particlesEffect: EffectBlock = {
  id: 'particles',
  name: 'Floating Particles',
  description: 'Animated dots drifting in space',
  category: 'generator',
  order: 160,
  requiredUtils: ['hash'],
  params: [
    {
      id: 'density',
      label: 'Density',
      type: 'float',
      defaultValue: 8,
      min: 2,
      max: 20,
      step: 1,
      uniformName: '',
      glslDefault: '8.0',
      group: 'particles',
    },
    {
      id: 'size',
      label: 'Size',
      type: 'float',
      defaultValue: 0.12,
      min: 0.02,
      max: 0.4,
      step: 0.01,
      uniformName: '',
      glslDefault: '0.12',
      group: 'particles',
    },
    {
      id: 'speed',
      label: 'Speed',
      type: 'float',
      defaultValue: 0.3,
      min: 0,
      max: 2,
      step: 0.05,
      uniformName: '',
      glslDefault: '0.3',
      group: 'particles',
    },
    {
      id: 'drift',
      label: 'Drift',
      type: 'float',
      defaultValue: 0.25,
      min: 0,
      max: 0.5,
      step: 0.01,
      uniformName: '',
      glslDefault: '0.25',
      group: 'particles',
    },
    {
      id: 'softness',
      label: 'Softness',
      type: 'float',
      defaultValue: 0.05,
      min: 0.01,
      max: 0.3,
      step: 0.01,
      uniformName: '',
      glslDefault: '0.05',
      group: 'particles',
    },
  ],
  glslBody: `{
  vec2 _p = st * $density;
  float _minDist = 1.0;
  vec2 _cell = floor(_p);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 _neighbor = _cell + vec2(float(x), float(y));
      float _h1 = hash(_neighbor);
      float _h2 = hash(_neighbor + vec2(37.0, 93.0));
      vec2 _point = _neighbor + vec2(_h1, _h2);
      _point += vec2(
        sin(t * $speed + _h1 * 6.2832) * $drift,
        cos(t * $speed * 0.7 + _h2 * 6.2832) * $drift
      );
      _minDist = min(_minDist, length(_p - _point));
    }
  }
  mixFactor = 1.0 - smoothstep($size - $softness, $size, _minDist);
}`,
};
