import type { ActiveEffect, EffectBlock, ShaderParam } from './types';
import { getEffect } from './effects/index';
import { resolveUtils, type UtilId } from './effects/utils';

const VERTEX_SOURCE = `attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

export { VERTEX_SOURCE };

export interface ComposeResult {
  glsl: string;
  params: ShaderParam[];
}

/**
 * Compose a complete fragment shader from a list of active effects.
 * Returns the GLSL source and the resolved parameter list with
 * instance-scoped uniform names.
 */
export function compose(activeEffects: ActiveEffect[], colorCount: number = 0): ComposeResult {
  const allParams: ShaderParam[] = [];
  const requiredUtils = new Set<UtilId>();

  // Gather enabled effects sorted by category order
  const enabledEffects: Array<{ effect: ActiveEffect; block: EffectBlock }> = [];
  for (const ae of activeEffects) {
    if (!ae.enabled) continue;
    const block = getEffect(ae.blockId);
    if (!block) continue;
    enabledEffects.push({ effect: ae, block });
  }

  // Sort: uv-transform (0-99) < generator (100-199) < post (200-299)
  enabledEffects.sort((a, b) => a.block.order - b.block.order);

  // Collect required utils
  for (const { block } of enabledEffects) {
    for (const u of block.requiredUtils) {
      requiredUtils.add(u);
    }
  }

  // Build per-effect uniform declarations and resolve params
  const uniformDeclarations: string[] = [];

  for (const { effect, block } of enabledEffects) {
    for (const param of block.params) {
      const scopedId = `${effect.instanceId}_${param.id}`;
      const uniformName = `u_${scopedId}`;
      const resolvedParam: ShaderParam = {
        ...param,
        id: scopedId,
        uniformName,
      };
      allParams.push(resolvedParam);

      const glslType = paramTypeToGlsl(param.type);
      uniformDeclarations.push(`uniform ${glslType} ${uniformName};`);
    }
  }

  // Build snippet sections
  const uvTransformSnippets: string[] = [];
  const postSnippets: string[] = [];

  interface GeneratorLayer {
    snippet: string;
    postMixSnippet: string | null;
  }
  const generators: GeneratorLayer[] = [];

  for (const { effect, block } of enabledEffects) {
    const body = replaceParams(block.glslBody, effect.instanceId, block.params);

    switch (block.category) {
      case 'uv-transform':
        uvTransformSnippets.push(`  // [${block.name}]\n  ${indent(body)}`);
        break;
      case 'generator':
        generators.push({
          snippet: `  // [${block.name}]\n  ${indent(body)}`,
          postMixSnippet: block.postMixGlsl
            ? `  // [${block.name} post-mix]\n  ${indent(replaceParams(block.postMixGlsl, effect.instanceId, block.params))}`
            : null,
        });
        break;
      case 'post':
        postSnippets.push(`  // [${block.name}]\n  ${indent(body)}`);
        break;
    }
  }

  // Assemble complete shader
  const lines: string[] = [];
  lines.push('precision mediump float;');
  lines.push('uniform float u_time;');
  lines.push('uniform vec2 u_resolution;');

  // Dynamic color uniforms
  for (let i = 0; i < colorCount; i++) {
    lines.push(`uniform vec3 u_color${i};`);
  }

  if (uniformDeclarations.length > 0) {
    lines.push('');
    lines.push(...uniformDeclarations);
  }

  // Utility functions
  const utilsCode = resolveUtils([...requiredUtils]);
  if (utilsCode.trim()) {
    lines.push('');
    lines.push(utilsCode.trim());
  }

  // Color ramp function
  lines.push('');
  lines.push(generateColorRamp(colorCount));

  lines.push('');
  lines.push('void main() {');
  lines.push('  vec2 uv = gl_FragCoord.xy / u_resolution;');
  lines.push('  float aspect = u_resolution.x / u_resolution.y;');
  lines.push('  vec2 st = uv * vec2(aspect, 1.0);');
  lines.push('  float t = u_time;');
  lines.push('  vec3 color = vec3(0.0);');
  lines.push('  float mixFactor = 0.5;');

  if (uvTransformSnippets.length > 0) {
    lines.push('');
    for (const s of uvTransformSnippets) lines.push(s);
  }

  if (generators.length > 0) {
    // First generator: sets mixFactor, then compute initial color
    lines.push('');
    lines.push(generators[0].snippet);
    lines.push('');
    lines.push('  color = colorRamp(mixFactor);');
    if (generators[0].postMixSnippet) {
      lines.push('');
      lines.push(generators[0].postMixSnippet);
    }

    // Subsequent generators: layer on top of existing color
    for (let i = 1; i < generators.length; i++) {
      lines.push('');
      lines.push(`  vec3 _prevColor${i} = color;`);
      lines.push('  mixFactor = 0.5;');
      lines.push('');
      lines.push(generators[i].snippet);
      lines.push('');
      lines.push(`  float _layerBlend${i} = smoothstep(0.0, 1.0, abs(mixFactor - 0.5) * 2.0);`);
      lines.push(`  color = mix(_prevColor${i}, colorRamp(mixFactor), _layerBlend${i});`);
      if (generators[i].postMixSnippet) {
        lines.push('');
        lines.push(generators[i].postMixSnippet!);
      }
    }
  } else {
    lines.push('');
    lines.push('  color = colorRamp(mixFactor);');
  }

  if (postSnippets.length > 0) {
    lines.push('');
    for (const s of postSnippets) lines.push(s);
  }

  lines.push('');
  lines.push('  color = clamp(color, 0.0, 1.0);');
  lines.push('  gl_FragColor = vec4(color, 1.0);');
  lines.push('}');

  return {
    glsl: lines.join('\n'),
    params: allParams,
  };
}

/** Replace $paramName placeholders with instance-scoped uniform names. */
function replaceParams(
  glsl: string,
  instanceId: string,
  params: ShaderParam[]
): string {
  let result = glsl;
  for (const p of params) {
    const uniformName = `u_${instanceId}_${p.id}`;
    // Replace $paramId with the uniform name
    result = result.replace(new RegExp(`\\$${p.id}\\b`, 'g'), uniformName);
  }
  return result;
}

function indent(code: string): string {
  return code
    .split('\n')
    .map((line, i) => (i === 0 ? line : '  ' + line))
    .join('\n');
}

function paramTypeToGlsl(type: string): string {
  switch (type) {
    case 'float': return 'float';
    case 'color': return 'vec3';
    case 'vec2': return 'vec2';
    case 'int': return 'int';
    case 'bool': return 'float';
    case 'select': return 'float';
    default: return 'float';
  }
}

/** Generate the colorRamp() GLSL function based on the number of active colors. */
function generateColorRamp(colorCount: number): string {
  if (colorCount === 0) {
    return `vec3 colorRamp(float t) {
  return vec3(0.0);
}`;
  }
  if (colorCount === 1) {
    return `vec3 colorRamp(float t) {
  return u_color0;
}`;
  }
  if (colorCount === 2) {
    return `vec3 colorRamp(float t) {
  return mix(u_color0, u_color1, clamp(t, 0.0, 1.0));
}`;
  }
  // 3+ colors: chain of mix() calls across segments
  const bodyLines: string[] = [];
  bodyLines.push(`vec3 colorRamp(float t) {`);
  bodyLines.push(`  float _ct = clamp(t, 0.0, 1.0) * ${(colorCount - 1).toFixed(1)};`);
  bodyLines.push(`  vec3 c = u_color0;`);
  for (let i = 1; i < colorCount; i++) {
    bodyLines.push(`  c = mix(c, u_color${i}, clamp(_ct - ${(i - 1).toFixed(1)}, 0.0, 1.0));`);
  }
  bodyLines.push(`  return c;`);
  bodyLines.push(`}`);
  return bodyLines.join('\n');
}

/** Generate a short random instance ID (6 chars). */
export function generateInstanceId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
