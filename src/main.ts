import type { AppState, UniformValue, CompileError } from './types';
import { Store } from './state';
import { Renderer } from './renderer';
import { preprocessAnnotated, detectUniforms } from './compiler';
import { syncUniforms, defaultParamValues } from './uniforms';
import { templates, getTemplate, swirlTemplate } from './templates/index';
import { createLayout } from './ui/layout';
import { createSidebar } from './ui/sidebar';
import { createTimeControls } from './ui/time-controls';
import { createCodeEditor } from './ui/code-editor';
import { createExportPanel } from './ui/export-panel';
import { loadSavedShaders, saveShader, deleteSavedShader, savedShaderToState } from './persistence';
import { bakeShader } from './export/bake';
import { generateTS } from './export/generate-ts';
import { generateHTML } from './export/generate-html';

// --- Initialize with default template ---
const defaultTemplate = swirlTemplate;
const defaultValues = defaultParamValues(defaultTemplate.params);

const initialState: AppState = {
  activeTemplateId: defaultTemplate.id,
  shaderName: defaultTemplate.name,
  vertexSource: defaultTemplate.vertexSource,
  fragmentSource: defaultTemplate.fragmentSource,
  compiledFragmentSource: '',
  params: defaultTemplate.params,
  paramValues: defaultValues,
  editorOpen: false,
  editorHeight: 250,
  playing: true,
  timeScale: 1,
  compileErrors: [],
  exportFunctionName: defaultTemplate.exportFunctionName,
  usesTexture: defaultTemplate.usesTexture,
  vertexType: defaultTemplate.vertexType,
  exportAsync: defaultTemplate.exportAsync,
};

// Try to restore autosave
const autosave = Store.loadAutosave();
if (autosave) {
  Object.assign(initialState, autosave);
}

const store = new Store(initialState);

// --- Create layout ---
const app = document.getElementById('app')!;
const layout = createLayout(app);

// --- Renderer ---
const renderer = new Renderer(layout.preview);

// --- Error overlay on preview (visible when editor is closed) ---
const previewErrorOverlay = document.createElement('div');
previewErrorOverlay.className = 'preview-error';
previewErrorOverlay.style.display = 'none';
layout.preview.appendChild(previewErrorOverlay);

// --- Compile and render current shader ---
function compileCurrentShader(): void {
  const state = store.getState();
  const { fragmentSource, params } = state;

  // Check if source has annotations
  const hasAnnotations = /\/\*@\w+:\w+\*\//.test(fragmentSource);

  let compiledFragment: string;
  let activeParams = params;

  if (hasAnnotations) {
    const result = preprocessAnnotated(fragmentSource, params);
    compiledFragment = result.glsl;
    activeParams = result.params;
  } else {
    compiledFragment = fragmentSource;
    // Auto-detect uniforms from raw GLSL
    const detected = detectUniforms(fragmentSource);
    if (detected.length > 0 && params.length === 0) {
      activeParams = detected;
    }
  }

  const errors = renderer.compile(state.vertexSource, compiledFragment);

  if (errors) {
    store.setState({
      compileErrors: errors,
      compiledFragmentSource: compiledFragment,
    });
  } else {
    // Sync params if they changed
    const paramValues = { ...state.paramValues };
    for (const p of activeParams) {
      if (!(p.id in paramValues)) {
        paramValues[p.id] = p.defaultValue;
      }
    }

    store.setState({
      compileErrors: [],
      compiledFragmentSource: compiledFragment,
      params: activeParams,
      paramValues,
    });

    syncUniforms(renderer, activeParams, paramValues);
  }
}

// Initial compile
compileCurrentShader();

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

// --- Code editor ---
let codeEditor: ReturnType<typeof createCodeEditor> | null = null;

function initEditor(): ReturnType<typeof createCodeEditor> {
  const state = store.getState();
  const editor = createCodeEditor(layout.editorContainer, {
    initialSource: state.fragmentSource,
    onChange(source) {
      store.setState({ fragmentSource: source });
      compileCurrentShader();
    },
  });
  return editor;
}

// Lazy init editor
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
    editor.setSource(store.getState().fragmentSource);
    editor.setErrors(store.getState().compileErrors);
  } else {
    layout.editorContainer.classList.add('collapsed');
  }
}

// --- Per-template param value cache ---
const templateValueCache: Record<string, Record<string, import('./types').UniformValue>> = {};

// --- Sidebar ---
const sidebar = createSidebar(layout.sidebar, {
  templates,
  activeTemplateId: store.getState().activeTemplateId,
  params: store.getState().params,
  paramValues: store.getState().paramValues,
  savedShaders: loadSavedShaders(),
  onTemplateSelect(id) {
    const tmpl = getTemplate(id);
    if (!tmpl) return;

    // Save current param values before switching
    const currentState = store.getState();
    if (currentState.activeTemplateId) {
      templateValueCache[currentState.activeTemplateId] = { ...currentState.paramValues };
    }

    // Restore cached values or use defaults
    const cached = templateValueCache[tmpl.id];
    const values = cached ?? defaultParamValues(tmpl.params);

    store.setState({
      activeTemplateId: tmpl.id,
      shaderName: tmpl.name,
      vertexSource: tmpl.vertexSource,
      fragmentSource: tmpl.fragmentSource,
      params: tmpl.params,
      paramValues: values,
      exportFunctionName: tmpl.exportFunctionName,
      usesTexture: tmpl.usesTexture,
      vertexType: tmpl.vertexType,
      exportAsync: tmpl.exportAsync,
    });
    nameInput.value = tmpl.name;
    compileCurrentShader();
    sidebar.updateParams(tmpl.params, values);
    sidebar.updateActiveTemplate(tmpl.id);
    exportPanel.updateFunctionName(tmpl.exportFunctionName);
    if (codeEditor) {
      codeEditor.setSource(tmpl.fragmentSource);
    }
  },
  onParamChange(paramId, value) {
    const state = store.getState();
    const newValues = { ...state.paramValues, [paramId]: value };
    store.setState({ paramValues: newValues });
    syncUniforms(renderer, state.params, newValues);
  },
  onSave: handleSave,
  onLoadSaved(id) {
    const saved = loadSavedShaders().find(s => s.id === id);
    if (!saved) return;
    const partial = savedShaderToState(saved);
    store.setState(partial);
    compileCurrentShader();
    const state = store.getState();
    nameInput.value = state.shaderName;
    sidebar.updateParams(state.params, state.paramValues);
    sidebar.updateActiveTemplate(state.activeTemplateId);
    exportPanel.updateFunctionName(state.exportFunctionName);
    if (codeEditor) {
      codeEditor.setSource(state.fragmentSource);
    }
  },
  onDeleteSaved(id) {
    deleteSavedShader(id);
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

  // Bake the compiled fragment source
  const bakedFragment = bakeShader(
    state.compiledFragmentSource,
    state.params,
    state.paramValues
  );

  if (format === 'ts') {
    const content = generateTS({
      functionName: state.exportFunctionName,
      vertexSource: state.vertexSource,
      fragmentSource: bakedFragment,
      usesTexture: state.usesTexture,
      exportAsync: state.exportAsync,
    });
    downloadFile(content, `${state.exportFunctionName}.ts`, 'text/typescript');
  } else {
    const content = generateHTML({
      functionName: state.exportFunctionName,
      vertexSource: state.vertexSource,
      fragmentSource: bakedFragment,
      usesTexture: state.usesTexture,
      exportAsync: state.exportAsync,
      title: state.shaderName,
    });
    downloadFile(content, `test.html`, 'text/html');
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
  // Sync uniforms on param changes
  if (state.paramValues !== prev.paramValues) {
    syncUniforms(renderer, state.params, state.paramValues);
  }

  // Update error overlays
  if (state.compileErrors !== prev.compileErrors) {
    if (codeEditor) {
      codeEditor.setErrors(state.compileErrors);
    }
    // Show errors on preview overlay
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
  // Ctrl+E: toggle editor
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
    e.preventDefault();
    toggleEditor();
  }
  // Ctrl+S: save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    handleSave();
  }
  // Space: play/pause (only when not typing in an input or code editor)
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
