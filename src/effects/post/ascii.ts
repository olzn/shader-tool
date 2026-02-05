import type { EffectBlock } from '../../types';

export const asciiEffect: EffectBlock = {
  id: 'ascii',
  name: 'ASCII',
  description: 'ASCII-art appearance using density-based character shapes',
  category: 'post',
  order: 260,
  requiredUtils: [],
  params: [
    {
      id: 'cellSize',
      label: 'Cell Size',
      type: 'float',
      defaultValue: 8,
      min: 4,
      max: 20,
      step: 1,
      uniformName: '',
      glslDefault: '8.0',
      group: 'effects',
    },
    {
      id: 'intensity',
      label: 'Intensity',
      type: 'float',
      defaultValue: 1.0,
      min: 0,
      max: 1,
      step: 0.05,
      uniformName: '',
      glslDefault: '1.0',
      group: 'effects',
    },
  ],
  glslBody: `{
  float _cs = $cellSize;
  vec2 _cuv = fract(gl_FragCoord.xy / _cs) - 0.5;
  float _luma = dot(color, vec3(0.299, 0.587, 0.114));

  float _c = length(_cuv);
  float _d = max(abs(_cuv.x), abs(_cuv.y));

  float _char = 0.0;
  // Dot: luma > 0.1
  _char = max(_char, step(0.1, _luma) * (1.0 - smoothstep(0.0, 0.12, _c)));
  // Dash: luma > 0.3
  _char = max(_char, step(0.3, _luma) * (1.0 - smoothstep(0.06, 0.08, abs(_cuv.y))) * (1.0 - smoothstep(0.2, 0.25, abs(_cuv.x))));
  // Cross: luma > 0.5
  float _cross = min(1.0 - smoothstep(0.06, 0.08, abs(_cuv.x)), 1.0) + min(1.0 - smoothstep(0.06, 0.08, abs(_cuv.y)), 1.0);
  _char = max(_char, step(0.5, _luma) * clamp(_cross, 0.0, 1.0));
  // Block: luma > 0.75
  _char = max(_char, step(0.75, _luma) * (1.0 - smoothstep(0.35, 0.4, _d)));

  color = mix(color, color * _char, $intensity);
}`,
};
