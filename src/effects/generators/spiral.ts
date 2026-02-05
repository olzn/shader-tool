import type { EffectBlock } from '../../types';

export const spiralEffect: EffectBlock = {
  id: 'spiral',
  name: 'Spiral',
  description: 'Animated spiral pattern with adjustable arms',
  category: 'generator',
  order: 150,
  requiredUtils: [],
  params: [
    {
      id: 'arms',
      label: 'Arms',
      type: 'float',
      defaultValue: 4,
      min: 1,
      max: 12,
      step: 1,
      uniformName: '',
      glslDefault: '4.0',
      group: 'spiral',
    },
    {
      id: 'tightness',
      label: 'Tightness',
      type: 'float',
      defaultValue: 8,
      min: 1,
      max: 30,
      step: 0.5,
      uniformName: '',
      glslDefault: '8.0',
      group: 'spiral',
    },
    {
      id: 'speed',
      label: 'Speed',
      type: 'float',
      defaultValue: 0.5,
      min: 0,
      max: 3,
      step: 0.1,
      uniformName: '',
      glslDefault: '0.5',
      group: 'spiral',
    },
    {
      id: 'thickness',
      label: 'Thickness',
      type: 'float',
      defaultValue: 0.5,
      min: 0.1,
      max: 1,
      step: 0.05,
      uniformName: '',
      glslDefault: '0.5',
      group: 'spiral',
    },
  ],
  glslBody: `{
  vec2 _center = st - vec2(aspect * 0.5, 0.5);
  float _angle = atan(_center.y, _center.x);
  float _dist = length(_center);
  float _spiral = sin($arms * _angle + _dist * $tightness - t * $speed);
  mixFactor = smoothstep(-$thickness, $thickness, _spiral);
}`,
};
