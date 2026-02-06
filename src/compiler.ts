import type { ShaderParam, CompileError, UniformValue } from './types';

// Annotation pattern: /*@type:name*/ value /*@*/  or  /*@type:name group:GroupName*/ value /*@*/
const ANNOTATION_RE = /\/\*@(\w+):(\w+)(?:\s+group:(\w+))?\*\/\s*([\s\S]*?)\s*\/\*@\*\//g;

// Uniform declaration pattern for auto-detection
const UNIFORM_RE = /uniform\s+(float|vec[234]|int|bool)\s+(u_\w+)\s*;/g;

const RESERVED_UNIFORMS = new Set(['u_time', 'u_resolution', 'u_texture']);

export interface PreprocessResult {
  glsl: string;
  params: ShaderParam[];
}

/**
 * Preprocess annotated GLSL source:
 * - Finds /*@type:name* / ... /*@* / annotations
 * - Replaces annotated values with uniform references
 * - Injects uniform declarations
 */
export function preprocessAnnotated(
  source: string,
  existingParams: ShaderParam[]
): PreprocessResult {
  const paramMap = new Map<string, ShaderParam>();
  for (const p of existingParams) {
    paramMap.set(p.id, p);
  }

  const discoveredParams: ShaderParam[] = [];
  const seen = new Set<string>();

  // Replace annotations with uniform references
  let processed = source.replace(ANNOTATION_RE, (_match, type, name, explicitGroup, value) => {
    const uniformName = `u_${name}`;
    if (!seen.has(name)) {
      seen.add(name);
      const existing = paramMap.get(name);
      if (existing) {
        discoveredParams.push(existing);
      } else {
        discoveredParams.push(inferParam(name, type, value.trim(), uniformName, explicitGroup));
      }
    }
    return uniformName;
  });

  // Inject uniform declarations after existing uniforms
  if (discoveredParams.length > 0) {
    const declarations = discoveredParams
      .map(p => `// [glint-param] uniform ${glslType(p.type)} ${p.uniformName};`)
      .join('\n') + '\n' +
      discoveredParams
      .map(p => `uniform ${glslType(p.type)} ${p.uniformName};`)
      .join('\n');

    // Find the last existing uniform line
    const lines = processed.split('\n');
    let lastUniformIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*uniform\s+/.test(lines[i])) {
        lastUniformIdx = i;
      }
    }

    if (lastUniformIdx >= 0) {
      lines.splice(lastUniformIdx + 1, 0, declarations);
    } else {
      // No uniforms found, inject after precision
      const precisionIdx = lines.findIndex(l => /^\s*precision\s+/.test(l));
      if (precisionIdx >= 0) {
        lines.splice(precisionIdx + 1, 0, '', declarations);
      } else {
        lines.unshift(declarations);
      }
    }
    processed = lines.join('\n');
  }

  return { glsl: processed, params: discoveredParams };
}

/**
 * Auto-detect uniforms from raw GLSL (no annotations).
 * Skips reserved uniforms.
 */
export function detectUniforms(source: string): ShaderParam[] {
  const params: ShaderParam[] = [];
  let match;
  UNIFORM_RE.lastIndex = 0;
  while ((match = UNIFORM_RE.exec(source)) !== null) {
    const [, glslT, name] = match;
    if (RESERVED_UNIFORMS.has(name)) continue;
    const id = name.replace(/^u_/, '');
    params.push({
      id,
      label: formatLabel(id),
      type: mapGlslType(glslT),
      defaultValue: defaultForType(glslT),
      min: glslT === 'int' ? 0 : 0,
      max: glslT === 'int' ? 10 : 1,
      step: glslT === 'int' ? 1 : 0.01,
      uniformName: name,
      glslDefault: defaultGlslLiteral(glslT),
      group: 'custom',
    });
  }
  return params;
}

/**
 * Parse WebGL shader compile error log into structured errors.
 */
export function parseCompileErrors(
  log: string,
  type: 'vertex' | 'fragment'
): CompileError[] {
  const errors: CompileError[] = [];
  const lines = log.split('\n');
  for (const line of lines) {
    const m = line.match(/ERROR:\s*\d+:(\d+):\s*(.*)/);
    if (m) {
      errors.push({
        type,
        line: parseInt(m[1], 10),
        message: m[2].trim(),
      });
    } else if (line.trim()) {
      errors.push({ type, message: line.trim() });
    }
  }
  return errors;
}

// --- Helpers ---

function inferParam(name: string, type: string, glslValue: string, uniformName: string, explicitGroup?: string): ShaderParam {
  const paramType = type === 'color' ? 'color' : mapGlslType(type);

  let defaultValue: UniformValue;
  if (paramType === 'color') {
    defaultValue = vec3ToHex(glslValue);
  } else if (type === 'float') {
    defaultValue = parseFloat(glslValue) || 0;
  } else if (type === 'int') {
    defaultValue = parseInt(glslValue, 10) || 0;
  } else if (type === 'vec2') {
    defaultValue = parseVec(glslValue, 2) as [number, number];
  } else {
    defaultValue = parseFloat(glslValue) || 0;
  }

  const numVal = typeof defaultValue === 'number' ? defaultValue : 0;

  // Smarter auto-range: clamp to reasonable bounds
  let autoMin: number | undefined;
  let autoMax: number | undefined;
  let autoStep: number;
  if (paramType === 'color') {
    autoMin = undefined;
    autoMax = undefined;
    autoStep = 0.01;
  } else if (paramType === 'int') {
    autoMin = Math.min(0, Math.floor(numVal) - 5);
    autoMax = Math.max(10, Math.ceil(numVal) + 10);
    autoStep = 1;
  } else {
    // Float: scale range proportionally, but clamp to sane bounds
    const absVal = Math.abs(numVal);
    if (absVal < 0.001) {
      autoMin = 0;
      autoMax = 1;
    } else {
      autoMin = Math.min(0, numVal - absVal);
      autoMax = Math.max(absVal * 0.1, numVal + absVal * 2);
    }
    // Step: aim for ~200 positions across the range
    autoStep = Math.max(0.001, (autoMax - autoMin) / 200);
  }

  return {
    id: name,
    label: formatLabel(name),
    type: paramType,
    defaultValue,
    min: autoMin,
    max: autoMax,
    step: autoStep,
    uniformName,
    glslDefault: glslValue,
    group: explicitGroup?.toLowerCase() ?? inferGroup(name, paramType),
  };
}

function inferGroup(name: string, type: string): string {
  if (type === 'color') return 'colors';
  const lower = name.toLowerCase();
  if (lower.includes('speed') || lower.includes('drift') || lower.includes('time')) return 'animation';
  if (lower.includes('grain') || lower.includes('bright') || lower.includes('vignette')) return 'effects';
  if (lower.includes('warp') || lower.includes('noise') || lower.includes('scale') || lower.includes('fbm')) return 'noise';
  if (lower.includes('wave') || lower.includes('displace') || lower.includes('freq') || lower.includes('amplitude')) return 'waves';
  if (lower.includes('mix') || lower.includes('smooth') || lower.includes('grad') && (lower.includes('low') || lower.includes('high'))) return 'blending';
  if (lower.includes('mask')) return 'mask';
  if (lower.includes('rotation') || lower.includes('angle')) return 'transform';
  return 'effects';
}

function formatLabel(id: string): string {
  return id
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\s+/, '')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function glslType(paramType: string): string {
  switch (paramType) {
    case 'float': return 'float';
    case 'color': return 'vec3';
    case 'vec2': return 'vec2';
    case 'int': return 'int';
    case 'bool': return 'float'; // use float for bool in GLSL
    default: return 'float';
  }
}

function mapGlslType(glslT: string): 'float' | 'color' | 'vec2' | 'int' | 'bool' {
  switch (glslT) {
    case 'vec3': return 'color';
    case 'vec2': return 'vec2';
    case 'int': return 'int';
    case 'bool': return 'bool';
    default: return 'float';
  }
}

function defaultForType(glslT: string): UniformValue {
  switch (glslT) {
    case 'vec3': return '#888888';
    case 'vec2': return [0, 0];
    case 'int': return 0;
    case 'bool': return 0;
    default: return 0.5;
  }
}

function defaultGlslLiteral(glslT: string): string {
  switch (glslT) {
    case 'vec3': return 'vec3(0.5, 0.5, 0.5)';
    case 'vec2': return 'vec2(0.0, 0.0)';
    case 'int': return '0';
    case 'bool': return '0.0';
    default: return '0.5';
  }
}

function vec3ToHex(glsl: string): string {
  const m = glsl.match(/vec3\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/);
  if (!m) return '#888888';
  const r = Math.round(parseFloat(m[1]) * 255);
  const g = Math.round(parseFloat(m[2]) * 255);
  const b = Math.round(parseFloat(m[3]) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function parseVec(glsl: string, count: number): number[] {
  const m = glsl.match(/vec\d\s*\(([\d.,\s]+)\)/);
  if (!m) return Array(count).fill(0);
  return m[1].split(',').map(s => parseFloat(s.trim()) || 0);
}

export function hexToVec3(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return [r, g, b];
}

export function vec3ToGlsl(rgb: [number, number, number]): string {
  return `vec3(${rgb.map(v => v.toFixed(3)).join(', ')})`;
}

export function formatFloat(n: number): string {
  const s = n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '.0');
  return s;
}
