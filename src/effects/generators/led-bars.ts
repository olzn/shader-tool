import type { EffectBlock } from '../../types';

export const ledBarsEffect: EffectBlock = {
  id: 'led-bars',
  name: 'LED Bars',
  description: 'Vertical noise bars through an LED pixel grid',
  category: 'generator',
  order: 160,
  requiredUtils: ['hash', 'noise'],
  params: [
    {
      id: 'columns',
      label: 'Columns',
      type: 'float',
      defaultValue: 48,
      min: 8,
      max: 128,
      step: 1,
      uniformName: '',
      glslDefault: '48.0',
      group: 'grid',
    },
    {
      id: 'rows',
      label: 'Rows',
      type: 'float',
      defaultValue: 30,
      min: 4,
      max: 80,
      step: 1,
      uniformName: '',
      glslDefault: '30.0',
      group: 'grid',
    },
    {
      id: 'cellGap',
      label: 'Cell Gap',
      type: 'float',
      defaultValue: 0.25,
      min: 0.0,
      max: 0.6,
      step: 0.01,
      uniformName: '',
      glslDefault: '0.25',
      group: 'grid',
    },
    {
      id: 'cellRound',
      label: 'Cell Roundness',
      type: 'float',
      defaultValue: 0.3,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      uniformName: '',
      glslDefault: '0.3',
      group: 'grid',
    },
    {
      id: 'noiseScale',
      label: 'Noise Scale',
      type: 'float',
      defaultValue: 1.5,
      min: 0.1,
      max: 8.0,
      step: 0.05,
      uniformName: '',
      glslDefault: '1.5',
      group: 'pattern',
    },
    {
      id: 'vertStretch',
      label: 'Vertical Stretch',
      type: 'float',
      defaultValue: 3.0,
      min: 0.5,
      max: 10.0,
      step: 0.1,
      uniformName: '',
      glslDefault: '3.0',
      group: 'pattern',
    },
    {
      id: 'barWidth',
      label: 'Bar Width',
      type: 'float',
      defaultValue: 0.5,
      min: 0.05,
      max: 1.0,
      step: 0.01,
      uniformName: '',
      glslDefault: '0.5',
      group: 'pattern',
    },
    {
      id: 'speed',
      label: 'Speed',
      type: 'float',
      defaultValue: 0.15,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      uniformName: '',
      glslDefault: '0.15',
      group: 'animation',
    },
    {
      id: 'brightness',
      label: 'LED Brightness',
      type: 'float',
      defaultValue: 0.9,
      min: 0.0,
      max: 1.5,
      step: 0.01,
      uniformName: '',
      glslDefault: '0.9',
      group: 'blending',
    },
    {
      id: 'bgDarkness',
      label: 'Background Dark',
      type: 'float',
      defaultValue: 0.06,
      min: 0.0,
      max: 0.3,
      step: 0.005,
      uniformName: '',
      glslDefault: '0.06',
      group: 'blending',
    },
  ],
  glslBody: `{
  // LED grid coordinates
  float _cols = $columns;
  float _rows = $rows;
  float _gap = $cellGap;

  // Compute grid cell position
  vec2 _gridUV = vec2(uv.x * _cols, uv.y * _rows);
  vec2 _cell = floor(_gridUV);
  vec2 _cellFrac = fract(_gridUV);

  // Cell mask: rectangular LED with gap and optional roundness
  vec2 _dist = abs(_cellFrac - 0.5);
  float _halfGap = _gap * 0.5;
  float _edgeH = 0.5 - _halfGap;
  // Rounded rectangle SDF
  float _round = $cellRound * _edgeH;
  vec2 _q = _dist - vec2(_edgeH - _round);
  float _sdf = length(max(_q, 0.0)) - _round;
  float _cellMask = 1.0 - smoothstep(-0.02, 0.02, _sdf);

  // Noise-driven vertical bars pattern
  float _nx = _cell.x / _cols;
  float _ny = _cell.y / _rows;
  float _n = noise(vec2(_nx * $noiseScale * 4.0, _ny * $vertStretch + t * $speed));

  // Create bar shapes: threshold noise into distinct vertical bands
  float _barIntensity = smoothstep(0.5 - $barWidth * 0.5, 0.5, _n)
                      * smoothstep(0.5 + $barWidth * 0.5, 0.5, _n) * 4.0;
  _barIntensity = max(_barIntensity, smoothstep(0.3, 0.6, _n));

  // Use column position for color ramp (left-right gradient through the bars)
  mixFactor = _nx;

  // Add subtle noise variation to the color position
  mixFactor += (_n - 0.5) * 0.3;
  mixFactor = clamp(mixFactor, 0.0, 1.0);
}`,
  postMixGlsl: `{
  // LED grid coordinates (re-derive for post-mix)
  float _pmCols = $columns;
  float _pmRows = $rows;
  float _pmGap = $cellGap;

  vec2 _pmGridUV = vec2(uv.x * _pmCols, uv.y * _pmRows);
  vec2 _pmCell = floor(_pmGridUV);
  vec2 _pmCellFrac = fract(_pmGridUV);

  // Cell mask
  vec2 _pmDist = abs(_pmCellFrac - 0.5);
  float _pmHalfGap = _pmGap * 0.5;
  float _pmEdgeH = 0.5 - _pmHalfGap;
  float _pmRound = $cellRound * _pmEdgeH;
  vec2 _pmQ = _pmDist - vec2(_pmEdgeH - _pmRound);
  float _pmSdf = length(max(_pmQ, 0.0)) - _pmRound;
  float _pmCellMask = 1.0 - smoothstep(-0.02, 0.02, _pmSdf);

  // Bar intensity
  float _pmNx = _pmCell.x / _pmCols;
  float _pmNy = _pmCell.y / _pmRows;
  float _pmN = noise(vec2(_pmNx * $noiseScale * 4.0, _pmNy * $vertStretch + t * $speed));
  float _pmBar = smoothstep(0.5 - $barWidth * 0.5, 0.5, _pmN)
               * smoothstep(0.5 + $barWidth * 0.5, 0.5, _pmN) * 4.0;
  _pmBar = max(_pmBar, smoothstep(0.3, 0.6, _pmN));

  // Apply LED mask and brightness
  float _pmLit = _pmCellMask * _pmBar * $brightness;
  color = color * _pmLit + vec3($bgDarkness) * (1.0 - _pmCellMask);
}`,
};
