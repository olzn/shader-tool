import type { EffectBlock } from '../../types';

export const diffuseBlurEffect: EffectBlock = {
  id: 'diffuse-blur',
  name: 'Diffuse Blur',
  description: 'Noise-based UV displacement for a frosted look',
  category: 'uv-transform',
  order: 20,
  requiredUtils: ['hash'],
  params: [
    {
      id: 'amount',
      label: 'Amount',
      type: 'float',
      defaultValue: 0.02,
      min: 0,
      max: 0.1,
      step: 0.002,
      uniformName: '',
      glslDefault: '0.02',
      group: 'transform',
    },
    {
      id: 'scale',
      label: 'Scale',
      type: 'float',
      defaultValue: 20,
      min: 1,
      max: 50,
      step: 1,
      uniformName: '',
      glslDefault: '20.0',
      group: 'transform',
    },
    {
      id: 'speed',
      label: 'Speed',
      type: 'float',
      defaultValue: 0.5,
      min: 0,
      max: 2,
      step: 0.05,
      uniformName: '',
      glslDefault: '0.5',
      group: 'transform',
    },
  ],
  glslBody: `{
  vec2 _seed = uv * $scale + t * $speed;
  vec2 _offset = vec2(
    hash(_seed) - 0.5,
    hash(_seed + vec2(37.0, 93.0)) - 0.5
  );
  uv += _offset * $amount;
  st += _offset * $amount * vec2(aspect, 1.0);
}`,
};
