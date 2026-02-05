import type { EffectBlock } from '../../types';

export const polarEffect: EffectBlock = {
  id: 'polar',
  name: 'Polar Coordinates',
  description: 'Convert UV to polar coordinates for radial patterns',
  category: 'uv-transform',
  order: 30,
  requiredUtils: [],
  params: [
    {
      id: 'scale',
      label: 'Scale',
      type: 'float',
      defaultValue: 2.0,
      min: 0.5,
      max: 5,
      step: 0.1,
      uniformName: '',
      glslDefault: '2.0',
      group: 'transform',
    },
    {
      id: 'rotation',
      label: 'Rotation',
      type: 'float',
      defaultValue: 0,
      min: 0,
      max: 360,
      step: 1,
      uniformName: '',
      glslDefault: '0.0',
      group: 'transform',
      displayUnit: 'deg',
    },
  ],
  glslBody: `{
  vec2 _center = uv - 0.5;
  float _angle = atan(_center.y, _center.x) + $rotation;
  float _dist = length(_center) * $scale;
  uv = vec2(_angle / 6.28318 + 0.5, _dist);
  st = uv * vec2(aspect, 1.0);
}`,
};
