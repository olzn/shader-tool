import type { EffectBlock } from '../../types';

export const dotGridEffect: EffectBlock = {
  id: 'dot-grid',
  name: 'Dot Grid',
  description: 'Halftone-style dot pattern driven by luminance',
  category: 'post',
  order: 250,
  requiredUtils: [],
  params: [
    {
      id: 'gridSize',
      label: 'Grid Size',
      type: 'float',
      defaultValue: 12,
      min: 4,
      max: 40,
      step: 1,
      uniformName: '',
      glslDefault: '12.0',
      group: 'effects',
    },
    {
      id: 'dotScale',
      label: 'Dot Scale',
      type: 'float',
      defaultValue: 0.45,
      min: 0.2,
      max: 0.6,
      step: 0.01,
      uniformName: '',
      glslDefault: '0.45',
      group: 'effects',
    },
    {
      id: 'invert',
      label: 'Invert',
      type: 'bool',
      defaultValue: 0,
      min: 0,
      max: 1,
      step: 1,
      uniformName: '',
      glslDefault: '0.0',
      group: 'effects',
    },
  ],
  glslBody: `{
  vec2 _cellUV = fract(gl_FragCoord.xy / $gridSize) - 0.5;
  float _luma = dot(color, vec3(0.299, 0.587, 0.114));
  float _radius = _luma * $dotScale;
  float _d = length(_cellUV);
  float _dot = smoothstep(_radius + 0.02, _radius - 0.02, _d);
  float _mask = mix(_dot, 1.0 - _dot, $invert);
  color *= _mask;
}`,
};
