import type { ActiveEffect, EffectBlock, ShaderParam, UniformValue, Preset, SavedShader } from '../types';
import { createControls } from './controls';
import { getAllEffects, getEffect, getEffectsByCategory } from '../effects/index';

const MAX_COLORS = 5;

interface SidebarOptions {
  presets: Preset[];
  activePresetId: string | null;
  activeEffects: ActiveEffect[];
  params: ShaderParam[];
  paramValues: Record<string, UniformValue>;
  colors: string[];
  savedShaders: SavedShader[];
  onPresetSelect: (id: string) => void;
  onColorChange: (index: number, value: string) => void;
  onAddColor: () => void;
  onRemoveColor: (index: number) => void;
  onParamChange: (paramId: string, value: UniformValue) => void;
  onAddEffect: (blockId: string) => void;
  onRemoveEffect: (instanceId: string) => void;
  onToggleEffect: (instanceId: string, enabled: boolean) => void;
  onSave: () => void;
  onLoadSaved: (id: string) => void;
  onDeleteSaved: (id: string) => void;
  onShareSaved: (id: string) => void;
  onRenameSaved: (id: string, newName: string) => void;
}

export function createSidebar(
  container: HTMLElement,
  options: SidebarOptions
): {
  updateEffects: (effects: ActiveEffect[], params: ShaderParam[], values: Record<string, UniformValue>) => void;
  updateColors: (colors: string[]) => void;
  updatePreset: (id: string | null) => void;
  updateSaved: (saved: SavedShader[]) => void;
  destroy: () => void;
} {
  container.innerHTML = '';

  // --- Presets section ---
  const presetsSection = createSection('Presets', false);
  const presetGrid = document.createElement('div');
  presetGrid.className = 'template-grid';

  for (const preset of options.presets) {
    const card = document.createElement('div');
    card.className = 'template-card' + (preset.id === options.activePresetId ? ' active' : '');
    card.dataset.presetId = preset.id;
    card.innerHTML = `
      <div class="template-card-name">${preset.name}</div>
      <div class="template-card-desc">${preset.description}</div>
    `;
    card.addEventListener('click', () => options.onPresetSelect(preset.id));
    presetGrid.appendChild(card);
  }

  presetsSection.content.appendChild(presetGrid);
  container.appendChild(presetsSection.element);

  // --- Colors section ---
  const colorsSection = createSection('Colors', false);
  const colorsContainer = document.createElement('div');
  colorsContainer.className = 'control-group';

  const addColorBtn = document.createElement('button');
  addColorBtn.className = 'btn add-effect-btn';
  addColorBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2v8M2 6h8"/></svg> Add Color`;
  addColorBtn.addEventListener('click', () => options.onAddColor());

  colorsSection.content.appendChild(addColorBtn);
  colorsSection.content.appendChild(colorsContainer);
  container.appendChild(colorsSection.element);

  function renderColors(colors: string[]) {
    colorsContainer.innerHTML = '';
    addColorBtn.style.display = colors.length >= MAX_COLORS ? 'none' : '';

    if (colors.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No colors added';
      colorsContainer.appendChild(empty);
      return;
    }

    for (let i = 0; i < colors.length; i++) {
      const row = createColorRow(i, colors[i], options.onColorChange, options.onRemoveColor);
      colorsContainer.appendChild(row);
    }
  }

  renderColors(options.colors);

  // --- Active Effects section ---
  const effectsSection = createSection('Effects', false);
  const effectsContainer = document.createElement('div');
  effectsContainer.className = 'effects-list';

  const addEffectBtn = document.createElement('button');
  addEffectBtn.className = 'btn add-effect-btn';
  addEffectBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2v8M2 6h8"/></svg> Add Effect`;
  addEffectBtn.addEventListener('click', () => showCatalog());

  effectsSection.content.appendChild(addEffectBtn);
  effectsSection.content.appendChild(effectsContainer);
  container.appendChild(effectsSection.element);

  // --- Saved section ---
  const savedSection = createSection('Saved', true);
  const savedContainer = document.createElement('div');

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn';
  saveBtn.style.width = '100%';
  saveBtn.style.marginBottom = '8px';
  saveBtn.textContent = 'Save Current';
  saveBtn.addEventListener('click', options.onSave);
  savedSection.content.appendChild(saveBtn);
  savedSection.content.appendChild(savedContainer);

  renderSavedList(savedContainer, options.savedShaders, options.onLoadSaved, options.onDeleteSaved, options.onShareSaved, options.onRenameSaved);
  container.appendChild(savedSection.element);

  // --- Effect catalog overlay ---
  let catalogEl: HTMLElement | null = null;

  function showCatalog() {
    if (catalogEl) {
      catalogEl.remove();
      catalogEl = null;
      return;
    }

    catalogEl = document.createElement('div');
    catalogEl.className = 'effect-catalog';

    const catalogHeader = document.createElement('div');
    catalogHeader.className = 'effect-catalog-header';
    catalogHeader.innerHTML = `<span>Add Effect</span>`;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-ghost btn-icon';
    closeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3l6 6M9 3l-6 6"/></svg>`;
    closeBtn.addEventListener('click', () => {
      catalogEl?.remove();
      catalogEl = null;
    });
    catalogHeader.appendChild(closeBtn);
    catalogEl.appendChild(catalogHeader);

    const categories = getEffectsByCategory();
    const categoryNames: Record<string, string> = {
      'uv-transform': 'UV Transform',
      'generator': 'Generators',
      'post': 'Post-Processing',
    };

    for (const [cat, effects] of Object.entries(categories)) {
      if (effects.length === 0) continue;
      const catLabel = document.createElement('div');
      catLabel.className = 'effect-catalog-category';
      catLabel.textContent = categoryNames[cat] || cat;
      catalogEl.appendChild(catLabel);

      for (const effect of effects) {
        const item = document.createElement('div');
        item.className = 'effect-catalog-item';
        item.innerHTML = `
          <div class="effect-catalog-item-name">${effect.name}</div>
          <div class="effect-catalog-item-desc">${effect.description}</div>
        `;
        item.addEventListener('click', () => {
          options.onAddEffect(effect.id);
          catalogEl?.remove();
          catalogEl = null;
        });
        catalogEl.appendChild(item);
      }
    }

    effectsSection.content.insertBefore(catalogEl, effectsContainer);
  }

  // Track per-effect controls for cleanup
  const effectControls: Map<string, ReturnType<typeof createControls>> = new Map();

  function renderEffects(effects: ActiveEffect[], params: ShaderParam[], values: Record<string, UniformValue>) {
    effectsContainer.innerHTML = '';
    for (const ctrl of effectControls.values()) ctrl.destroy();
    effectControls.clear();

    if (effects.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No effects added yet';
      effectsContainer.appendChild(empty);
      return;
    }

    for (const ae of effects) {
      const block = getEffect(ae.blockId);
      if (!block) continue;

      const item = document.createElement('div');
      item.className = 'effect-item' + (ae.enabled ? '' : ' disabled');
      item.dataset.instanceId = ae.instanceId;

      // Header row
      const header = document.createElement('div');
      header.className = 'effect-item-header';

      const leftSide = document.createElement('div');
      leftSide.className = 'effect-item-left';

      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = ae.enabled;
      toggle.className = 'effect-toggle';
      toggle.addEventListener('change', () => {
        options.onToggleEffect(ae.instanceId, toggle.checked);
      });

      const nameSpan = document.createElement('span');
      nameSpan.className = 'effect-item-name';
      nameSpan.textContent = block.name;

      leftSide.append(toggle, nameSpan);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-ghost btn-icon effect-remove-btn';
      removeBtn.title = 'Remove effect';
      removeBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3l6 6M9 3l-6 6"/></svg>`;
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        options.onRemoveEffect(ae.instanceId);
      });

      header.append(leftSide, removeBtn);

      // Controls container (collapsible)
      const controlsContainer = document.createElement('div');
      controlsContainer.className = 'effect-item-controls';

      // Get this instance's params (scoped by instanceId)
      const instanceParams = params.filter(p => p.id.startsWith(ae.instanceId + '_'));
      const instanceValues: Record<string, UniformValue> = {};
      for (const p of instanceParams) {
        instanceValues[p.id] = values[p.id] ?? p.defaultValue;
      }

      const ctrl = createControls(controlsContainer, {
        params: instanceParams,
        values: instanceValues,
        onChange: options.onParamChange,
      });
      effectControls.set(ae.instanceId, ctrl);

      // Toggle expand/collapse on name click
      let expanded = true;
      nameSpan.style.cursor = 'pointer';
      nameSpan.addEventListener('click', () => {
        expanded = !expanded;
        controlsContainer.style.display = expanded ? '' : 'none';
      });

      item.append(header, controlsContainer);
      effectsContainer.appendChild(item);
    }
  }

  // Initial render
  renderEffects(options.activeEffects, options.params, options.paramValues);

  return {
    updateEffects(effects, params, values) {
      renderEffects(effects, params, values);
    },
    updateColors(colors) {
      renderColors(colors);
    },
    updatePreset(id) {
      container.querySelectorAll('.template-card').forEach(card => {
        card.classList.toggle('active', (card as HTMLElement).dataset.presetId === id);
      });
    },
    updateSaved(saved) {
      renderSavedList(savedContainer, saved, options.onLoadSaved, options.onDeleteSaved, options.onShareSaved, options.onRenameSaved);
    },
    destroy() {
      for (const ctrl of effectControls.values()) ctrl.destroy();
      effectControls.clear();
      catalogEl?.remove();
      container.innerHTML = '';
    },
  };
}

// --- Helpers ---

function createSection(title: string, collapsed: boolean): {
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

function createColorRow(
  index: number,
  value: string,
  onChange: (index: number, value: string) => void,
  onRemove: (index: number) => void,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'control color-row';

  wrap.innerHTML = `
    <div class="color-control">
      <div class="color-swatch" data-swatch>
        <input type="color" value="${value}" data-color-picker />
      </div>
      <input type="text" class="color-hex-input" value="${value}" maxlength="7" data-hex-input />
    </div>
  `;

  const swatch = wrap.querySelector<HTMLElement>('[data-swatch]')!;
  const picker = wrap.querySelector<HTMLInputElement>('[data-color-picker]')!;
  const hexInput = wrap.querySelector<HTMLInputElement>('[data-hex-input]')!;

  swatch.style.backgroundColor = value;

  picker.addEventListener('input', () => {
    const v = picker.value;
    hexInput.value = v;
    swatch.style.backgroundColor = v;
    onChange(index, v);
  });

  hexInput.addEventListener('change', () => {
    let v = hexInput.value.trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      picker.value = v;
      swatch.style.backgroundColor = v;
      onChange(index, v);
    }
  });

  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn btn-ghost btn-icon color-remove-btn';
  removeBtn.title = 'Remove color';
  removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" stroke="currentColor"><path d="M2.75 4.75H15.25"/><path d="M6.75 4.75V2.75C6.75 2.2 7.198 1.75 7.75 1.75H10.25C10.802 1.75 11.25 2.2 11.25 2.75V4.75"/><path d="M7.23206 8.72998L10.7681 12.27"/><path d="M10.7681 8.72998L7.23206 12.27"/><path d="M13.6977 7.75L13.35 14.35C13.294 15.4201 12.416 16.25 11.353 16.25H6.64805C5.58405 16.25 4.70705 15.42 4.65105 14.35L4.30334 7.75"/></g></svg>`;
  removeBtn.addEventListener('click', () => onRemove(index));
  wrap.appendChild(removeBtn);

  return wrap;
}

function renderSavedList(
  container: HTMLElement,
  saved: SavedShader[],
  onLoad: (id: string) => void,
  onDelete: (id: string) => void,
  onShare: (id: string) => void,
  onRename: (id: string, newName: string) => void
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
    info.className = 'saved-item-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'saved-item-name';
    nameEl.textContent = shader.name;

    const dateEl = document.createElement('div');
    dateEl.className = 'saved-item-date';
    dateEl.textContent = formatDate(shader.savedAt);

    info.append(nameEl, dateEl);

    const actions = document.createElement('div');
    actions.className = 'saved-item-actions';

    // Rename button
    const renameBtn = document.createElement('button');
    renameBtn.className = 'btn btn-ghost btn-icon';
    renameBtn.title = 'Rename';
    renameBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8.5 1.5l2 2L4 10H2v-2L8.5 1.5z"/></svg>`;
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Replace name with input
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'saved-item-rename-input';
      input.value = shader.name;
      nameEl.replaceWith(input);
      input.focus();
      input.select();

      const finish = () => {
        const newName = input.value.trim();
        if (newName && newName !== shader.name) {
          onRename(shader.id, newName);
        } else {
          input.replaceWith(nameEl);
        }
      };
      input.addEventListener('blur', finish);
      input.addEventListener('keydown', (ke) => {
        if (ke.key === 'Enter') { ke.preventDefault(); input.blur(); }
        if (ke.key === 'Escape') { input.value = shader.name; input.blur(); }
      });
    });

    // Share button
    const shareBtn = document.createElement('button');
    shareBtn.className = 'btn btn-ghost btn-icon';
    shareBtn.title = 'Copy share link';
    shareBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="3" cy="6" r="1.5"/><circle cx="9" cy="2.5" r="1.5"/><circle cx="9" cy="9.5" r="1.5"/><path d="M4.3 5.2l3.4-1.9M4.3 6.8l3.4 1.9"/></svg>`;
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onShare(shader.id);
      shareBtn.title = 'Copied!';
      shareBtn.classList.add('copied');
      setTimeout(() => {
        shareBtn.title = 'Copy share link';
        shareBtn.classList.remove('copied');
      }, 1500);
    });

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-ghost btn-icon';
    deleteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3h8M4.5 3V2h3v1M3 3v7a1 1 0 001 1h4a1 1 0 001-1V3"/></svg>`;
    deleteBtn.title = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onDelete(shader.id);
    });

    actions.append(renameBtn, shareBtn, deleteBtn);
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
