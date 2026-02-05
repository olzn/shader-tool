import type { EffectBlock } from '../../types';

// 4x5 bitmap font encoding.
// Each character is a 20-bit value packed into a float (requires highp).
// Rows are top-to-bottom, columns left-to-right.
// Encoding: r0*65536 + r1*4096 + r2*256 + r3*16 + r4
// where each row is 4 bits (0-15), bit 3 = leftmost pixel.
//
//  0: .##.  1: .#..  2: .##.  3: ####  4: #..#
//     #..#     ##..     #..#     ...#     #..#
//     #..#     .#..     ..#.     .##.     ####
//     #..#     .#..     .#..     ...#     ...#
//     .##.     ####     ####     ####     ...#
//
//  5: ####  6: .##.  7: ####  8: .##.  9: .##.
//     #...     #...     ...#     #..#     #..#
//     ###.     ###.     ..#.     .##.     .###
//     ...#     #..#     .#..     #..#     ...#
//     ###.     .##.     .#..     .##.     .##.
//
//  A: .##.  E: ####  F: ####  H: #..#  L: #...
//     #..#     #...     #...     #..#     #...
//     ####     ###.     ###.     ####     #...
//     #..#     #...     #...     #..#     #...
//     #..#     ####     #...     #..#     ####
//
//  N: #..#  P: ###.  S: .###  T: ####  X: #..#
//     ##.#     #..#     #...     .#..     #..#
//     ####     ###.     .##.     .#..     .##.
//     #.##     #...     ...#     .#..     #..#
//     #..#     #...     ###.     .#..     #..#
//
//  Z: ####  +: ....  #: .#.#  *: #..#  !: .##.
//     ...#     .#..     ####     .##.     .##.
//     .##.     ####     .#.#     ####     .##.
//     #...     .#..     ####     .##.     ....
//     ####     ....     .#.#     #..#     .##.

export const asciiEffect: EffectBlock = {
  id: 'ascii',
  name: 'ASCII',
  description: 'ASCII-art appearance with bitmap characters',
  category: 'post',
  order: 260,
  requiredUtils: [],
  params: [
    {
      id: 'mode',
      label: 'Mode',
      type: 'select',
      defaultValue: 0,
      options: [
        { label: 'Density', value: 0 },
        { label: 'Random', value: 1 },
      ],
      uniformName: '',
      glslDefault: '0.0',
      group: 'effects',
    },
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
  vec2 _cell = floor(gl_FragCoord.xy / _cs);
  vec2 _cellUv = fract(gl_FragCoord.xy / _cs);
  vec2 _cuv = _cellUv - 0.5;
  float _luma = dot(color, vec3(0.299, 0.587, 0.114));
  float _mode = $mode;
  float _char = 0.0;

  if (_mode < 0.5) {
    // Density: luminance thresholds pick progressively denser shapes
    float _c = length(_cuv);
    float _d = max(abs(_cuv.x), abs(_cuv.y));
    _char = max(_char, step(0.1, _luma) * (1.0 - smoothstep(0.0, 0.12, _c)));
    _char = max(_char, step(0.3, _luma) * (1.0 - smoothstep(0.06, 0.08, abs(_cuv.y))) * (1.0 - smoothstep(0.2, 0.25, abs(_cuv.x))));
    float _cross = min(1.0 - smoothstep(0.06, 0.08, abs(_cuv.x)), 1.0) + min(1.0 - smoothstep(0.06, 0.08, abs(_cuv.y)), 1.0);
    _char = max(_char, step(0.5, _luma) * clamp(_cross, 0.0, 1.0));
    _char = max(_char, step(0.75, _luma) * (1.0 - smoothstep(0.35, 0.4, _d)));
  } else {
    // Random: 4x5 bitmap font with animated character cycling
    // Staggered per-cell timing so characters don't all change at once
    float _seed = fract(sin(dot(_cell, vec2(43.37, 17.89))) * 12345.6789);
    float _ts = floor(t * 3.0 + _seed * 3.0);
    float _h = fract(sin(dot(_cell + vec2(_ts * 0.37, _ts * 0.73), vec2(127.1, 311.7))) * 43758.5453);
    float _ci = floor(_h * 25.0);

    // Character bitmaps (4x5, encoded as 20-bit highp floats)
    // 0-9, A E F H L N P S T X Z, + # * !
    highp float _bm = 432534.0;
    if      (_ci < 1.0)  _bm = 432534.0;
    else if (_ci < 2.0)  _bm = 312399.0;
    else if (_ci < 3.0)  _bm = 430671.0;
    else if (_ci < 4.0)  _bm = 988703.0;
    else if (_ci < 5.0)  _bm = 630545.0;
    else if (_ci < 6.0)  _bm = 1019422.0;
    else if (_ci < 7.0)  _bm = 429718.0;
    else if (_ci < 8.0)  _bm = 987716.0;
    else if (_ci < 9.0)  _bm = 431766.0;
    else if (_ci < 10.0) _bm = 431894.0;
    else if (_ci < 11.0) _bm = 434073.0;
    else if (_ci < 12.0) _bm = 1019535.0;
    else if (_ci < 13.0) _bm = 1019528.0;
    else if (_ci < 14.0) _bm = 630681.0;
    else if (_ci < 15.0) _bm = 559247.0;
    else if (_ci < 16.0) _bm = 647097.0;
    else if (_ci < 17.0) _bm = 958088.0;
    else if (_ci < 18.0) _bm = 493086.0;
    else if (_ci < 19.0) _bm = 1000516.0;
    else if (_ci < 20.0) _bm = 628377.0;
    else if (_ci < 21.0) _bm = 988815.0;
    else if (_ci < 22.0) _bm = 20288.0;
    else if (_ci < 23.0) _bm = 390645.0;
    else if (_ci < 24.0) _bm = 618345.0;
    else                  _bm = 419334.0;

    // Decode pixel from bitmap
    float _col = min(floor(_cellUv.x * 4.0), 3.0);
    float _row = min(floor((1.0 - _cellUv.y) * 5.0), 4.0);
    highp float _bi = (4.0 - _row) * 4.0 + (3.0 - _col);
    _char = step(0.5, mod(floor(_bm / exp2(_bi)), 2.0));
    _char *= step(0.02, _luma);
  }

  color = mix(color, color * _char, $intensity);
}`,
};
