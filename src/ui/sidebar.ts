import type { ShaderTemplate, ShaderParam, UniformValue, SavedShader } from '../types';
import { createControls } from './controls';
import { Renderer } from '../renderer';
import { preprocessAnnotated } from '../compiler';
import { syncUniforms, defaultParamValues } from '../uniforms';

interface SidebarOptions {
  templates: ShaderTemplate[];
  activeTemplateId: string | null;
  params: ShaderParam[];
  paramValues: Record<string, UniformValue>;
  savedShaders: SavedShader[];
  onTemplateSelect: (id: string) => void;
  onParamChange: (paramId: string, value: UniformValue) => void;
  onSave: () => void;
  onLoadSaved: (id: string) => void;
  onDeleteSaved: (id: string) => void;
}

export function createSidebar(
  container: HTMLElement,
  options: SidebarOptions
): {
  updateParams: (params: ShaderParam[], values: Record<string, UniformValue>) => void;
  updateSaved: (saved: SavedShader[]) => void;
  updateActiveTemplate: (id: string | null) => void;
  destroy: () => void;
} {
  container.innerHTML = '';

  // --- Templates section ---
  const templatesSection = createSidebarSection('Templates', false);
  const templateGrid = document.createElement('div');
  templateGrid.className = 'template-grid';

  const previewRenderers: Renderer[] = [];

  for (const tmpl of options.templates) {
    const card = document.createElement('div');
    card.className = 'template-card' + (tmpl.id === options.activeTemplateId ? ' active' : '');
    card.dataset.templateId = tmpl.id;
    card.innerHTML = `
      <div class="template-card-preview"></div>
      <div class="template-card-name">${tmpl.name}</div>
      <div class="template-card-desc">${tmpl.description}</div>
    `;
    card.addEventListener('click', () => options.onTemplateSelect(tmpl.id));
    templateGrid.appendChild(card);

    // Mount live WebGL preview
    const previewEl = card.querySelector('.template-card-preview') as HTMLElement;
    const renderer = new Renderer(previewEl);
    const { glsl } = preprocessAnnotated(tmpl.fragmentSource, tmpl.params);
    const errors = renderer.compile(tmpl.vertexSource, glsl);
    if (!errors) {
      const values = defaultParamValues(tmpl.params);
      syncUniforms(renderer, tmpl.params, values);
    }
    previewRenderers.push(renderer);
  }

  templatesSection.content.appendChild(templateGrid);
  container.appendChild(templatesSection.element);

  // --- Parameters section ---
  const paramsSection = createSidebarSection('Parameters', false);
  const controlsContainer = document.createElement('div');
  paramsSection.content.appendChild(controlsContainer);
  container.appendChild(paramsSection.element);

  const controls = createControls(controlsContainer, {
    params: options.params,
    values: options.paramValues,
    onChange: options.onParamChange,
  });

  // --- Saved section ---
  const savedSection = createSidebarSection('Saved', false);
  const savedContainer = document.createElement('div');
  savedSection.content.appendChild(savedContainer);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn';
  saveBtn.style.width = '100%';
  saveBtn.style.marginBottom = '8px';
  saveBtn.textContent = 'Save Current';
  saveBtn.addEventListener('click', options.onSave);
  savedSection.content.insertBefore(saveBtn, savedContainer);

  renderSavedList(savedContainer, options.savedShaders, options.onLoadSaved, options.onDeleteSaved);
  container.appendChild(savedSection.element);

  return {
    updateParams(params, values) {
      controls.update(params, values);
    },
    updateSaved(saved) {
      renderSavedList(savedContainer, saved, options.onLoadSaved, options.onDeleteSaved);
    },
    updateActiveTemplate(id) {
      container.querySelectorAll('.template-card').forEach(card => {
        card.classList.toggle('active', (card as HTMLElement).dataset.templateId === id);
      });
    },
    destroy() {
      previewRenderers.forEach(r => r.destroy());
      previewRenderers.length = 0;
      controls.destroy();
      container.innerHTML = '';
    },
  };
}

function createSidebarSection(title: string, collapsed: boolean): {
  element: HTMLElement;
  content: HTMLElement;
} {
  const section = document.createElement('div');
  section.className = 'sidebar-section' + (collapsed ? ' collapsed' : '');

  const header = document.createElement('div');
  header.className = 'sidebar-section-header';
  header.innerHTML = `
    <span class="sidebar-section-title">${title}</span>
    <svg class="sidebar-section-chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M3 4.5L6 7.5L9 4.5"/>
    </svg>
  `;
  header.addEventListener('click', () => section.classList.toggle('collapsed'));

  const content = document.createElement('div');
  content.className = 'sidebar-section-content';

  section.append(header, content);
  return { element: section, content };
}

function renderSavedList(
  container: HTMLElement,
  saved: SavedShader[],
  onLoad: (id: string) => void,
  onDelete: (id: string) => void
): void {
  container.innerHTML = '';
  if (saved.length === 0) {
    container.innerHTML = '<div class="empty-state">No saved shaders yet</div>';
    return;
  }

  const list = document.createElement('div');
  list.className = 'saved-list';

  for (const shader of saved.sort((a, b) => b.savedAt - a.savedAt)) {
    const item = document.createElement('div');
    item.className = 'saved-item';

    const info = document.createElement('div');
    info.innerHTML = `
      <div class="saved-item-name">${shader.name}</div>
      <div class="saved-item-date">${formatDate(shader.savedAt)}</div>
    `;

    const actions = document.createElement('div');
    actions.className = 'saved-item-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-ghost btn-icon';
    deleteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3h8M4.5 3V2h3v1M3 3v7a1 1 0 001 1h4a1 1 0 001-1V3"/></svg>`;
    deleteBtn.title = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onDelete(shader.id);
    });

    actions.appendChild(deleteBtn);
    item.append(info, actions);
    item.addEventListener('click', () => onLoad(shader.id));
    list.appendChild(item);
  }

  container.appendChild(list);
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${mins}`;
}
