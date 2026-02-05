import type { ShaderParam, UniformValue } from './types';
import type { Renderer } from './renderer';

/**
 * Syncs parameter values from the state store to the WebGL renderer.
 */
export function syncUniforms(
  renderer: Renderer,
  params: ShaderParam[],
  values: Record<string, UniformValue>
): void {
  for (const param of params) {
    const value = values[param.id] ?? param.defaultValue;
    renderer.setUniform(param.uniformName, param.type, value);
  }
}

/**
 * Build default param values from a param list.
 */
export function defaultParamValues(params: ShaderParam[]): Record<string, UniformValue> {
  const values: Record<string, UniformValue> = {};
  for (const p of params) {
    values[p.id] = p.defaultValue;
  }
  return values;
}
