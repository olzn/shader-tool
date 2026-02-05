import type { EffectBlock } from '../../types';

export const ditherEffect: EffectBlock = {
  id: 'dither',
  name: 'Dither',
  description: 'Ordered dithering with Bayer-like pattern',
  category: 'post',
  order: 270,
  requiredUtils: [],
  params: [
    {
      id: 'levels',
      label: 'Levels',
      type: 'float',
      defaultValue: 4,
      min: 2,
      max: 16,
      step: 1,
      uniformName: '',
      glslDefault: '4.0',
      group: 'effects',
    },
    {
      id: 'spread',
      label: 'Spread',
      type: 'float',
      defaultValue: 0.5,
      min: 0,
      max: 1,
      step: 0.05,
      uniformName: '',
      glslDefault: '0.5',
      group: 'effects',
    },
  ],
  glslBody: `{
  vec2 _p = mod(gl_FragCoord.xy, 4.0);
  float _x = _p.x < 2.0 ? _p.x : 3.0 - _p.x;
  float _y = _p.y < 2.0 ? _p.y : 3.0 - _p.y;
  float _bayer = (_x * 2.0 + _y) / 4.0;
  _bayer = (_bayer + mod(floor(gl_FragCoord.x / 2.0) + floor(gl_FragCoord.y / 2.0), 2.0) * 0.25) / 1.25;

  float _n = $levels;
  color = floor(color * _n + $spread * (_bayer - 0.5)) / _n;
  color = clamp(color, 0.0, 1.0);
}`,
};
