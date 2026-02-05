export type ParamControlType = 'float' | 'color' | 'vec2' | 'int' | 'bool' | 'select';

export type UniformValue = number | [number, number] | [number, number, number] | string;

export interface ShaderParam {
  id: string;
  label: string;
  type: ParamControlType;
  defaultValue: UniformValue;
  min?: number;
  max?: number;
  step?: number;
  uniformName: string;
  glslDefault: string;
  group: string;
  /** Display angles in degrees (converted to radians for the GPU) */
  displayUnit?: 'deg';
  /** Options for 'select' type params */
  options?: { label: string; value: number }[];
}

export interface CompileError {
  type: 'vertex' | 'fragment' | 'link';
  message: string;
  line?: number;
}

// --- Effect block system ---

export type EffectCategory = 'uv-transform' | 'generator' | 'post';

export interface EffectBlock {
  id: string;
  name: string;
  description: string;
  category: EffectCategory;
  order: number;
  requiredUtils: ('hash' | 'noise' | 'fbm')[];
  params: ShaderParam[];
  glslBody: string;
  postMixGlsl?: string;
}

export interface ActiveEffect {
  instanceId: string;
  blockId: string;
  enabled: boolean;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  effects: { blockId: string }[];
  paramOverrides: Record<string, UniformValue>;
  colors?: string[];
}

export interface AppState {
  shaderName: string;
  activePresetId: string | null;
  activeEffects: ActiveEffect[];
  paramValues: Record<string, UniformValue>;
  colors: string[];
  compiledFragmentSource: string;
  editorOpen: boolean;
  editorHeight: number;
  playing: boolean;
  timeScale: number;
  compileErrors: CompileError[];
  exportFunctionName: string;
  usesTexture: boolean;
  vertexType: 'simple' | 'uv';
  exportAsync: boolean;
}

export interface SavedShader {
  id: string;
  name: string;
  savedAt: number;
  activePresetId: string | null;
  activeEffects: ActiveEffect[];
  paramValues: Record<string, UniformValue>;
  colors: string[];
  exportFunctionName: string;
  usesTexture: boolean;
  vertexType: 'simple' | 'uv';
  exportAsync: boolean;
}
