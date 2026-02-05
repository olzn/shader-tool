import type { AppState, ActiveEffect, UniformValue } from './types';
import { Store } from './state';
import { Renderer } from './renderer';
import { compose, generateInstanceId, VERTEX_SOURCE } from './composer';
import { getEffect } from './effects/index';
import { presets, getPreset } from './presets';
import { syncUniforms, syncColors } from './uniforms';
import { createLayout } from './ui/layout';
import { createSidebar } from './ui/sidebar';
import { createTimeControls } from './ui/time-controls';
import { createCodeEditor } from './ui/code-editor';
import { createExportPanel } from './ui/export-panel';
import { loadSavedShaders, saveShader, deleteSavedShader, savedShaderToState, renameSavedShader, encodeShaderUrl, decodeShaderUrl } from './persistence';
import { bakeShader } from './export/bake';
import { hexToVec3, formatFloat } from './compiler';
import { generateTS } from './export/generate-ts';
import { generateHTML } from './export/generate-html';

// --- Initialize with blank preset ---
const blankPreset = getPreset('blank')!;

const initialState: AppState = {
  shaderName: blankPreset.name,
  activePresetId: blankPreset.id,
  activeEffects: [],
  paramValues: {},
  colors: blankPreset.colors ?? [],
  compiledFragmentSource: '',
  editorOpen: false,
  editorHeight: 250,
  playing: true,
  timeScale: 1,
  compileErrors: [],
  exportFunctionName: 'renderShader',
  usesTexture: false,
  vertexType: 'simple',
  exportAsync: false,
};

// Try to restore from shared URL first, then autosave
const sharedState = decodeShaderUrl(window.location.hash);
if (sharedState) {
  Object.assign(initialState, sharedState);
  window.history.replaceState(null, '', window.location.pathname);
} else {
  const autosave = Store.loadAutosave();
  if (autosave) {
    Object.assign(initialState, autosave);
  }
}

const store = new Store(initialState);

// --- Create layout ---
const app = document.getElementById('app')!;
const layout = createLayout(app);

// --- Renderer ---
const renderer = new Renderer(layout.preview);

// --- Error overlay on preview ---
const previewErrorOverlay = document.createElement('div');
previewErrorOverlay.className = 'preview-error';
previewErrorOverlay.style.display = 'none';
layout.preview.appendChild(previewErrorOverlay);

// --- Code editor (declared early so composeAndCompile can reference it) ---
let codeEditor: ReturnType<typeof createCodeEditor> | null = null;

// --- Compose and compile ---
function composeAndCompile(): void {
  const state = store.getState();
  const result = compose(state.activeEffects, state.colors.length);

  const errors = renderer.compile(VERTEX_SOURCE, result.glsl);

  if (errors) {
    store.setState({
      compileErrors: errors,
      compiledFragmentSource: result.glsl,
    });
  } else {
    store.setState({
      compileErrors: [],
      compiledFragmentSource: result.glsl,
    });

    // Sync all uniforms
    syncColors(renderer, state.colors);
    syncUniforms(renderer, result.params, state.paramValues);
  }

  // Update code editor if open
  if (codeEditor) {
    codeEditor.setSource(result.glsl);
    codeEditor.setErrors(store.getState().compileErrors);
  }
}

// Initial compile
composeAndCompile();

// --- Shader name input ---
const nameInput = document.createElement('input');
nameInput.type = 'text';
nameInput.className = 'header-shader-name';
nameInput.value = store.getState().shaderName;
nameInput.addEventListener('change', () => {
  store.setState({ shaderName: nameInput.value.trim() || 'Untitled' });
});
layout.headerLeft.appendChild(nameInput);

// --- Time controls ---
const timeControls = createTimeControls(layout.headerCenter, {
  onPlay() {
    renderer.play();
    store.setState({ playing: true });
  },
  onPause() {
    renderer.pause();
    store.setState({ playing: false });
  },
  onReset() {
    renderer.reset();
  },
  onTimeScaleChange(scale) {
    renderer.setTimeScale(scale);
    store.setState({ timeScale: scale });
  },
});

renderer.onTimeUpdate = (time) => {
  timeControls.updateTime(time);
};

// --- Code editor toggle button ---
const codeBtn = document.createElement('button');
codeBtn.className = 'btn';
codeBtn.textContent = 'Code';
codeBtn.title = 'Toggle code editor (Ctrl+E)';
codeBtn.addEventListener('click', toggleEditor);
layout.headerRight.appendChild(codeBtn);

// --- Save button ---
const saveBtn = document.createElement('button');
saveBtn.className = 'btn btn-primary';
saveBtn.textContent = 'Save';
saveBtn.title = 'Save shader (Ctrl+S)';
saveBtn.addEventListener('click', handleSave);
layout.headerRight.appendChild(saveBtn);

// --- Code editor helpers ---
function initEditor(): ReturnType<typeof createCodeEditor> {
  const state = store.getState();
  const editor = createCodeEditor(layout.editorContainer, {
    initialSource: state.compiledFragmentSource,
  });
  return editor;
}

function ensureEditor(): ReturnType<typeof createCodeEditor> {
  if (!codeEditor) {
    codeEditor = initEditor();
  }
  return codeEditor;
}

function toggleEditor(): void {
  const state = store.getState();
  const isOpen = !state.editorOpen;
  store.setState({ editorOpen: isOpen });

  if (isOpen) {
    layout.editorContainer.classList.remove('collapsed');
    const editor = ensureEditor();
    editor.setSource(store.getState().compiledFragmentSource);
    editor.setErrors(store.getState().compileErrors);
  } else {
    layout.editorContainer.classList.add('collapsed');
  }
}

// --- Helper: load a preset ---
function loadPreset(presetId: string): void {
  const preset = getPreset(presetId);
  if (!preset) return;

  // Build active effects from preset
  const activeEffects: ActiveEffect[] = [];
  const paramValues: Record<string, UniformValue> = {};

  for (const { blockId } of preset.effects) {
    const block = getEffect(blockId);
    if (!block) continue;

    const instanceId = generateInstanceId();
    activeEffects.push({ instanceId, blockId, enabled: true });

    // Set default values, then apply overrides
    for (const param of block.params) {
      const scopedId = `${instanceId}_${param.id}`;
      const overrideKey = `${blockId}.${param.id}`;
      paramValues[scopedId] = preset.paramOverrides[overrideKey] ?? param.defaultValue;
    }
  }

  store.setState({
    activePresetId: preset.id,
    shaderName: preset.name,
    activeEffects,
    paramValues,
    colors: preset.colors ?? [],
  });

  nameInput.value = preset.name;
  composeAndCompile();

  const state = store.getState();
  const result = compose(state.activeEffects, state.colors.length);
  sidebar.updateEffects(state.activeEffects, result.params, state.paramValues);
  sidebar.updateColors(state.colors);
  sidebar.updatePreset(preset.id);

  // Re-sync uniforms after compose
  syncColors(renderer, state.colors);
  syncUniforms(renderer, result.params, state.paramValues);
}

// --- Helper: add an effect ---
function addEffect(blockId: string): void {
  const block = getEffect(blockId);
  if (!block) return;

  const state = store.getState();
  const instanceId = generateInstanceId();
  const activeEffects = [...state.activeEffects, { instanceId, blockId, enabled: true }];

  // Set defaults for new effect's params
  const paramValues = { ...state.paramValues };
  for (const param of block.params) {
    paramValues[`${instanceId}_${param.id}`] = param.defaultValue;
  }

  store.setState({ activeEffects, paramValues, activePresetId: null });
  composeAndCompile();
  refreshSidebar();
}

// --- Helper: remove an effect ---
function removeEffect(instanceId: string): void {
  const state = store.getState();
  const activeEffects = state.activeEffects.filter(ae => ae.instanceId !== instanceId);

  // Clean up param values for removed effect
  const paramValues = { ...state.paramValues };
  for (const key of Object.keys(paramValues)) {
    if (key.startsWith(instanceId + '_')) {
      delete paramValues[key];
    }
  }

  store.setState({ activeEffects, paramValues, activePresetId: null });
  composeAndCompile();
  refreshSidebar();
}

// --- Helper: toggle effect enabled ---
function toggleEffect(instanceId: string, enabled: boolean): void {
  const state = store.getState();
  const activeEffects = state.activeEffects.map(ae =>
    ae.instanceId === instanceId ? { ...ae, enabled } : ae
  );
  store.setState({ activeEffects, activePresetId: null });
  composeAndCompile();
  refreshSidebar();
}

// --- Helper: refresh sidebar after state changes ---
function refreshSidebar(): void {
  const state = store.getState();
  const result = compose(state.activeEffects, state.colors.length);
  sidebar.updateEffects(state.activeEffects, result.params, state.paramValues);
  sidebar.updateColors(state.colors);
  syncColors(renderer, state.colors);
  syncUniforms(renderer, result.params, state.paramValues);
}

// --- Sidebar ---
const sidebar = createSidebar(layout.sidebar, {
  presets,
  activePresetId: store.getState().activePresetId,
  activeEffects: store.getState().activeEffects,
  params: compose(store.getState().activeEffects).params,
  paramValues: store.getState().paramValues,
  colors: store.getState().colors,
  savedShaders: loadSavedShaders(),
  onPresetSelect(id) {
    loadPreset(id);
  },
  onColorChange(index, value) {
    const colors = [...store.getState().colors];
    colors[index] = value;
    store.setState({ colors, activePresetId: null });
    syncColors(renderer, colors);
  },
  onAddColor() {
    const colors = [...store.getState().colors, '#808080'];
    store.setState({ colors, activePresetId: null });
    composeAndCompile();
    refreshSidebar();
  },
  onRemoveColor(index) {
    const colors = store.getState().colors.filter((_, i) => i !== index);
    store.setState({ colors, activePresetId: null });
    composeAndCompile();
    refreshSidebar();
  },
  onParamChange(paramId, value) {
    const state = store.getState();
    const newValues = { ...state.paramValues, [paramId]: value };
    store.setState({ paramValues: newValues, activePresetId: null });
    const result = compose(state.activeEffects);
    syncUniforms(renderer, result.params, newValues);
  },
  onAddEffect(blockId) {
    addEffect(blockId);
  },
  onRemoveEffect(instanceId) {
    removeEffect(instanceId);
  },
  onToggleEffect(instanceId, enabled) {
    toggleEffect(instanceId, enabled);
  },
  onSave: handleSave,
  onLoadSaved(id) {
    const saved = loadSavedShaders().find(s => s.id === id);
    if (!saved) return;
    const partial = savedShaderToState(saved);
    store.setState(partial);
    composeAndCompile();
    const state = store.getState();
    nameInput.value = state.shaderName;
    refreshSidebar();
    sidebar.updatePreset(state.activePresetId);
    exportPanel.updateFunctionName(state.exportFunctionName);
  },
  onDeleteSaved(id) {
    deleteSavedShader(id);
    sidebar.updateSaved(loadSavedShaders());
  },
  onShareSaved(id) {
    const saved = loadSavedShaders().find(s => s.id === id);
    if (!saved) return;
    const encoded = encodeShaderUrl(saved);
    const url = `${window.location.origin}${window.location.pathname}#s=${encoded}`;
    navigator.clipboard.writeText(url);
  },
  onRenameSaved(id, newName) {
    renameSavedShader(id, newName);
    sidebar.updateSaved(loadSavedShaders());
  },
});

// --- Export panel ---
const exportPanel = createExportPanel(layout.sidebar, {
  functionName: store.getState().exportFunctionName,
  onFunctionNameChange(name) {
    store.setState({ exportFunctionName: name });
  },
  onExportTS() {
    doExport('ts');
  },
  onExportHTML() {
    doExport('html');
  },
});

function doExport(format: 'ts' | 'html'): void {
  const state = store.getState();
  const result = compose(state.activeEffects, state.colors.length);

  // Bake: replace effect param uniforms with literal values
  let bakedFragment = bakeShader(
    result.glsl,
    result.params,
    state.paramValues
  );

  // Bake color uniforms into literal vec3 values
  for (let i = 0; i < state.colors.length; i++) {
    const [r, g, b] = hexToVec3(state.colors[i]);
    const literal = `vec3(${formatFloat(r)}, ${formatFloat(g)}, ${formatFloat(b)})`;
    bakedFragment = bakedFragment.replace(new RegExp(`\\bu_color${i}\\b`, 'g'), literal);
    bakedFragment = bakedFragment.replace(new RegExp(`^\\s*uniform\\s+vec3\\s+u_color${i}\\s*;\\n?`, 'gm'), '');
  }

  if (format === 'ts') {
    const content = generateTS({
      functionName: state.exportFunctionName,
      vertexSource: VERTEX_SOURCE,
      fragmentSource: bakedFragment,
      usesTexture: state.usesTexture,
      exportAsync: state.exportAsync,
    });
    downloadFile(content, `${state.exportFunctionName}.ts`, 'text/typescript');
  } else {
    const content = generateHTML({
      functionName: state.exportFunctionName,
      vertexSource: VERTEX_SOURCE,
      fragmentSource: bakedFragment,
      usesTexture: state.usesTexture,
      exportAsync: state.exportAsync,
      title: state.shaderName,
    });
    downloadFile(content, `${state.shaderName || 'shader'}.html`, 'text/html');
  }
}

function handleSave(): void {
  saveShader(store.getState());
  sidebar.updateSaved(loadSavedShaders());
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- State subscriptions ---
store.subscribe((state, prev) => {
  // Update error overlays
  if (state.compileErrors !== prev.compileErrors) {
    if (codeEditor) {
      codeEditor.setErrors(state.compileErrors);
    }
    if (state.compileErrors.length > 0) {
      previewErrorOverlay.style.display = 'block';
      previewErrorOverlay.textContent = state.compileErrors
        .map(e => (e.line ? `Line ${e.line}: ${e.message}` : e.message))
        .join('\n');
    } else {
      previewErrorOverlay.style.display = 'none';
    }
  }
});

// --- Keyboard shortcuts ---
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
    e.preventDefault();
    toggleEditor();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    handleSave();
  }
  if (e.key === ' ') {
    const tag = document.activeElement?.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    const inEditor = document.activeElement?.closest('.cm-editor');
    if (!inInput && !inEditor) {
      e.preventDefault();
      if (renderer.playing) {
        renderer.pause();
        store.setState({ playing: false });
        timeControls.updatePlaying(false);
      } else {
        renderer.play();
        store.setState({ playing: true });
        timeControls.updatePlaying(true);
      }
    }
  }
});

// --- Play state sync ---
store.subscribe((state, prev) => {
  if (state.playing !== prev.playing) {
    timeControls.updatePlaying(state.playing);
  }
});
