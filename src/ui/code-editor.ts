import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

interface CodeEditorOptions {
  initialSource: string;
  onChange: (source: string) => void;
}

export function createCodeEditor(
  container: HTMLElement,
  options: CodeEditorOptions
): {
  setSource: (source: string) => void;
  getSource: () => string;
  setErrors: (errors: Array<{ line?: number; message: string }>) => void;
  destroy: () => void;
  view: EditorView;
} {
  // Build the editor container structure
  container.innerHTML = '';

  const dragHandle = document.createElement('div');
  dragHandle.className = 'editor-drag-handle';
  setupDragHandle(dragHandle, container);

  const editorHeader = document.createElement('div');
  editorHeader.className = 'editor-header';
  editorHeader.innerHTML = `<span class="editor-header-label">Fragment Shader</span>`;

  const errorOverlay = document.createElement('div');
  errorOverlay.className = 'preview-error';
  errorOverlay.style.display = 'none';
  errorOverlay.style.position = 'relative';
  errorOverlay.style.inset = 'auto';
  errorOverlay.style.margin = '0';
  errorOverlay.style.borderRadius = '0';

  const editorContent = document.createElement('div');
  editorContent.className = 'editor-content';

  container.append(dragHandle, editorHeader, errorOverlay, editorContent);

  // Debounce
  let debounceTimer: number | null = null;
  let internalUpdate = false;

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged && !internalUpdate) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        options.onChange(update.state.doc.toString());
      }, 300);
    }
  });

  const state = EditorState.create({
    doc: options.initialSource,
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      bracketMatching(),
      javascript(), // C-like syntax for GLSL
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      oneDark,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      updateListener,
      EditorView.theme({
        '&': { height: '100%', fontSize: '12px' },
        '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font-mono)' },
        '.cm-content': { padding: '8px 0' },
        '.cm-gutters': { background: 'var(--bg-surface)', border: 'none' },
        '.cm-activeLineGutter': { background: 'var(--bg-hover)' },
      }),
    ],
  });

  const view = new EditorView({
    state,
    parent: editorContent,
  });

  return {
    view,

    setSource(source: string) {
      const current = view.state.doc.toString();
      if (current === source) return;
      internalUpdate = true;
      view.dispatch({
        changes: { from: 0, to: current.length, insert: source },
      });
      internalUpdate = false;
    },

    getSource(): string {
      return view.state.doc.toString();
    },

    setErrors(errors) {
      if (errors.length === 0) {
        errorOverlay.style.display = 'none';
        return;
      }
      errorOverlay.style.display = 'block';
      errorOverlay.textContent = errors
        .map(e => (e.line ? `Line ${e.line}: ${e.message}` : e.message))
        .join('\n');
    },

    destroy() {
      if (debounceTimer) clearTimeout(debounceTimer);
      view.destroy();
    },
  };
}

function setupDragHandle(handle: HTMLElement, editorContainer: HTMLElement): void {
  let startY = 0;
  let startHeight = 0;

  const onMouseMove = (e: MouseEvent) => {
    const delta = startY - e.clientY;
    const newHeight = Math.max(100, Math.min(600, startHeight + delta));
    editorContainer.style.height = newHeight + 'px';
  };

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startY = e.clientY;
    startHeight = editorContainer.getBoundingClientRect().height;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}
