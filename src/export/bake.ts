import type { ShaderParam, UniformValue } from '../types';
import { hexToVec3, formatFloat } from '../compiler';

/**
 * Bake uniform values back into the GLSL source as constants.
 * Replaces u_paramName references with literal GLSL values,
 * and removes the injected uniform declarations.
 */
export function bakeShader(
  source: string,
  params: ShaderParam[],
  values: Record<string, UniformValue>
): string {
  let baked = source;

  // Remove uniform declarations first (before replacing references,
  // otherwise the uniform names get replaced with literals and the
  // declaration regex no longer matches).
  baked = baked.replace(/^\s*\/\/ \[glint-param\] uniform .+;\n?/gm, '');
  for (const param of params) {
    const declRe = new RegExp(`^\\s*uniform\\s+\\w+\\s+${escapeRegex(param.uniformName)}\\s*;\\n?`, 'gm');
    baked = baked.replace(declRe, '');
  }

  // Replace each uniform reference with its literal value
  for (const param of params) {
    const value = values[param.id] ?? param.defaultValue;
    const literal = toGlslLiteral(param.type, value);
    const re = new RegExp(`\\b${escapeRegex(param.uniformName)}\\b`, 'g');
    baked = baked.replace(re, literal);
  }

  // Clean up double blank lines
  baked = baked.replace(/\n{3,}/g, '\n\n');

  return baked;
}

function toGlslLiteral(type: string, value: UniformValue): string {
  switch (type) {
    case 'float':
    case 'select':
      return formatFloat(value as number);
    case 'int':
      return String(Math.round(value as number));
    case 'bool':
      return (value as number) > 0.5 ? '1.0' : '0.0';
    case 'color': {
      const [r, g, b] = hexToVec3(value as string);
      return `vec3(${formatFloat(r)}, ${formatFloat(g)}, ${formatFloat(b)})`;
    }
    case 'vec2': {
      const v = value as [number, number];
      return `vec2(${formatFloat(v[0])}, ${formatFloat(v[1])})`;
    }
    default:
      return String(value);
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
