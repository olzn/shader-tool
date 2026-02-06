interface ExportPanelOptions {
  functionName: string;
  onFunctionNameChange: (name: string) => void;
  onExportTS: () => void;
  onExportHTML: () => void;
}

export function createExportPanel(
  container: HTMLElement,
  options: ExportPanelOptions
): {
  updateFunctionName: (name: string) => void;
  element: HTMLElement;
} {
  const section = document.createElement('div');
  section.className = 'sidebar-section';

  const header = document.createElement('div');
  header.className = 'sidebar-section-header';
  header.innerHTML = `
    <span class="sidebar-section-title">Export</span>
    <svg class="sidebar-section-chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M3 4.5L6 7.5L9 4.5"/>
    </svg>
  `;
  header.addEventListener('click', () => section.classList.toggle('collapsed'));

  const content = document.createElement('div');
  content.className = 'sidebar-section-content';

  const panel = document.createElement('div');
  panel.className = 'export-panel';

  // Function name field (wrapped in control for consistent styling)
  const fnField = document.createElement('div');
  fnField.className = 'control';
  const label = document.createElement('div');
  label.className = 'control-label';
  label.innerHTML = `<span class="control-label-text">Function Name</span>`;

  const fnInput = document.createElement('input');
  fnInput.type = 'text';
  fnInput.className = 'export-fn-input';
  fnInput.value = options.functionName;
  fnInput.placeholder = 'renderShader';
  fnInput.addEventListener('change', () => {
    options.onFunctionNameChange(fnInput.value.trim() || 'renderShader');
  });

  fnField.append(label, fnInput);

  // Buttons
  const buttons = document.createElement('div');
  buttons.className = 'export-buttons';

  const tsBtn = document.createElement('button');
  tsBtn.className = 'btn';
  tsBtn.textContent = 'Export .ts';
  tsBtn.addEventListener('click', options.onExportTS);

  const htmlBtn = document.createElement('button');
  htmlBtn.className = 'btn';
  htmlBtn.textContent = 'Export .html';
  htmlBtn.addEventListener('click', options.onExportHTML);

  buttons.append(tsBtn, htmlBtn);
  panel.append(fnField, buttons);
  content.appendChild(panel);
  section.append(header, content);
  container.appendChild(section);

  return {
    element: section,
    updateFunctionName(name) {
      fnInput.value = name;
    },
  };
}
