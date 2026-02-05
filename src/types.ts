export type ParamControlType = 'float' | 'color' | 'vec2' | 'int' | 'bool';

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
}

export interface ShaderTemplate {
  id: string;
  name: string;
  description: string;
  vertexSource: string;
  fragmentSource: string;
  params: ShaderParam[];
  exportFunctionName: string;
  usesTexture: boolean;
  exportAsync: boolean;
  vertexType: 'simple' | 'uv';
}

export interface ShaderProject {
  id: string;
  name: string;
  templateId: string | null;
  vertexSource: string;
  fragmentSource: string;
  params: ShaderParam[];
  paramValues: Record<string, UniformValue>;
  exportFunctionName: string;
  usesTexture: boolean;
  vertexType: 'simple' | 'uv';
  exportAsync: boolean;
}

export interface CompileError {
  type: 'vertex' | 'fragment' | 'link';
  message: string;
  line?: number;
}

export interface SavedShader {
  id: string;
  name: string;
  savedAt: number;
  templateId: string | null;
  vertexSource: string;
  fragmentSource: string;
  params: ShaderParam[];
  paramValues: Record<string, UniformValue>;
  exportFunctionName: string;
  usesTexture: boolean;
  vertexType: 'simple' | 'uv';
  exportAsync: boolean;
}

export interface AppState {
  activeTemplateId: string | null;
  shaderName: string;
  vertexSource: string;
  fragmentSource: string;
  compiledFragmentSource: string;
  params: ShaderParam[];
  paramValues: Record<string, UniformValue>;
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
