/**
 * Creates the top-level layout shell: header + sidebar + main area (preview + editor).
 */
export function createLayout(root: HTMLElement): {
  header: HTMLElement;
  headerLeft: HTMLElement;
  headerCenter: HTMLElement;
  headerRight: HTMLElement;
  sidebar: HTMLElement;
  preview: HTMLElement;
  editorContainer: HTMLElement;
  mainArea: HTMLElement;
} {
  root.innerHTML = '';

  // Header
  const header = el('div', 'header');
  const headerLeft = el('div', 'header-left');
  const headerCenter = el('div', 'header-center');
  const headerRight = el('div', 'header-right');

  const logo = el('div', 'header-logo');
  logo.innerHTML = '<span>&#9670;</span>shadertool';
  headerLeft.appendChild(logo);

  header.append(headerLeft, headerCenter, headerRight);

  // Sidebar
  const sidebar = el('div', 'sidebar');

  // Main area
  const mainArea = el('div', 'main-area');
  const preview = el('div', 'preview-container');
  const editorContainer = el('div', 'editor-container');
  editorContainer.classList.add('collapsed');
  editorContainer.style.height = '250px';

  mainArea.append(preview, editorContainer);

  root.append(header, sidebar, mainArea);

  return {
    header,
    headerLeft,
    headerCenter,
    headerRight,
    sidebar,
    preview,
    editorContainer,
    mainArea,
  };
}

function el(tag: string, className: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = className;
  return e;
}
