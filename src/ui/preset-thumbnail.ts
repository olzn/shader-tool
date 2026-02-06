import type { Preset, UniformValue } from '../types';
import { compose, generateInstanceId, VERTEX_SOURCE } from '../composer';
import { getEffect } from '../effects/index';
import { hexToVec3 } from '../compiler';

const THUMB_WIDTH = 160;
const THUMB_HEIGHT = 100;
const SNAPSHOT_TIME = 1.5; // seconds into the animation to capture

/**
 * Renders a single-frame snapshot of a preset into a data URL.
 * Uses a temporary offscreen canvas + WebGL context.
 */
export function renderPresetThumbnail(preset: Preset): string | null {
  if (preset.effects.length === 0) return null;

  // Build effect chain
  const activeEffects = [];
  const paramValues: Record<string, UniformValue> = {};
  for (const { blockId } of preset.effects) {
    const block = getEffect(blockId);
    if (!block) continue;
    const instanceId = generateInstanceId();
    activeEffects.push({ instanceId, blockId, enabled: true });
    for (const param of block.params) {
      const scopedId = `${instanceId}_${param.id}`;
      const overrideKey = `${blockId}.${param.id}`;
      paramValues[scopedId] = preset.paramOverrides[overrideKey] ?? param.defaultValue;
    }
  }

  const colorCount = preset.colors?.length ?? 0;
  const result = compose(activeEffects, colorCount);

  // Create temporary canvas + WebGL
  const canvas = document.createElement('canvas');
  canvas.width = THUMB_WIDTH;
  canvas.height = THUMB_HEIGHT;
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    preserveDrawingBuffer: true, // needed for toDataURL
  });
  if (!gl) return null;

  // Compile shaders
  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, VERTEX_SOURCE);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    gl.deleteShader(vs);
    return null;
  }

  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, result.glsl);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }

  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.deleteProgram(program);
    return null;
  }

  gl.useProgram(program);

  // Fullscreen quad
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // Set uniforms
  gl.viewport(0, 0, THUMB_WIDTH, THUMB_HEIGHT);
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uRes = gl.getUniformLocation(program, 'u_resolution');
  if (uTime) gl.uniform1f(uTime, SNAPSHOT_TIME);
  if (uRes) gl.uniform2f(uRes, THUMB_WIDTH, THUMB_HEIGHT);

  // Color uniforms
  const colors = preset.colors ?? [];
  for (let i = 0; i < colors.length; i++) {
    const loc = gl.getUniformLocation(program, `u_color${i}`);
    if (loc) {
      const [r, g, b] = hexToVec3(colors[i]);
      gl.uniform3f(loc, r, g, b);
    }
  }

  // Parameter uniforms
  for (const param of result.params) {
    const loc = gl.getUniformLocation(program, param.uniformName);
    if (!loc) continue;
    const value = paramValues[param.id] ?? param.defaultValue;
    switch (param.type) {
      case 'float':
      case 'select': {
        let v = value as number;
        if (param.displayUnit === 'deg') v = v * (Math.PI / 180);
        gl.uniform1f(loc, v);
        break;
      }
      case 'int':
        gl.uniform1i(loc, value as number);
        break;
      case 'bool':
        gl.uniform1f(loc, (value as number) > 0.5 ? 1.0 : 0.0);
        break;
      case 'color': {
        const [r, g, b] = hexToVec3(value as string);
        gl.uniform3f(loc, r, g, b);
        break;
      }
      case 'vec2': {
        const v = value as [number, number];
        gl.uniform2f(loc, v[0], v[1]);
        break;
      }
    }
  }

  // Draw
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // Capture
  const dataUrl = canvas.toDataURL('image/png');

  // Cleanup
  gl.deleteBuffer(buffer);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  gl.deleteProgram(program);
  gl.getExtension('WEBGL_lose_context')?.loseContext();

  return dataUrl;
}
