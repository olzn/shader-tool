import type { ActiveEffect, EffectBlock, ShaderParam, UniformValue, Preset, SavedShader } from '../types';
import { createControls } from './controls';
import { getAllEffects, getEffect, getEffectsByCategory } from '../effects/index';
import { renderPresetThumbnail } from './preset-thumbnail';
import { showToast } from './toast';

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
  onReorderColors: (fromIndex: number, toIndex: number) => void;
  onParamChange: (paramId: string, value: UniformValue) => void;
  onAddEffect: (blockId: string) => void;
  onRemoveEffect: (instanceId: string) => void;
  onToggleEffect: (instanceId: string, enabled: boolean) => void;
  onReorderEffects: (fromIndex: number, toIndex: number) => void;
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
  toggleEffectEnabled: (instanceId: string, enabled: boolean) => void;
  updateColors: (colors: string[]) => void;
  updatePreset: (id: string | null) => void;
  updateSaved: (saved: SavedShader[]) => void;
  destroy: () => void;
} {
  container.innerHTML = '';

  // --- Presets section ---
  const presetsSection = createSection('Presets', false);
  const presetList = document.createElement('div');
  presetList.className = 'preset-list';

  for (const preset of options.presets) {
    const row = document.createElement('div');
    row.className = 'preset-row' + (preset.id === options.activePresetId ? ' active' : '');
    row.dataset.presetId = preset.id;

    const thumbnail = renderPresetThumbnail(preset);
    const thumbHtml = thumbnail
      ? `<div class="preset-row-thumb"><img src="${thumbnail}" /></div>`
      : `<div class="preset-row-thumb"></div>`;

    row.innerHTML = `
      ${thumbHtml}
      <div class="preset-row-info">
        <span class="preset-row-name">${preset.name}</span>
        <span class="preset-row-desc">${preset.description}</span>
      </div>
    `;
    row.addEventListener('click', () => options.onPresetSelect(preset.id));
    presetList.appendChild(row);
  }

  presetsSection.content.appendChild(presetList);
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

    let colorDragFrom = -1;

    for (let i = 0; i < colors.length; i++) {
      const row = createColorRow(i, colors[i], options.onColorChange, options.onRemoveColor);

      // Drag-and-drop: add handle and events
      const dragHandle = document.createElement('div');
      dragHandle.className = 'color-drag-handle';
      dragHandle.draggable = true;
      dragHandle.innerHTML = `<svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor"><circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/><circle cx="2" cy="7" r="1.2"/><circle cx="6" cy="7" r="1.2"/><circle cx="2" cy="12" r="1.2"/><circle cx="6" cy="12" r="1.2"/></svg>`;
      row.insertBefore(dragHandle, row.firstChild);

      dragHandle.addEventListener('dragstart', (e) => {
        colorDragFrom = i;
        row.classList.add('dragging');
        e.dataTransfer!.effectAllowed = 'move';
        e.dataTransfer!.setData('text/plain', String(i));
        e.dataTransfer!.setDragImage(row, 0, 0);
      });

      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        colorsContainer.querySelectorAll('.color-row').forEach(el => {
          el.classList.remove('drag-over-top', 'drag-over-bottom');
        });
      });

      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
        const rect = row.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        row.classList.remove('drag-over-top', 'drag-over-bottom');
        if (e.clientY < midY) {
          row.classList.add('drag-over-top');
        } else {
          row.classList.add('drag-over-bottom');
        }
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('drag-over-top', 'drag-over-bottom');
      });

      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.classList.remove('drag-over-top', 'drag-over-bottom');
        const rect = row.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        let toIndex = i;
        if (e.clientY >= midY && toIndex < colors.length - 1) {
          toIndex++;
        }
        if (colorDragFrom !== -1 && colorDragFrom !== toIndex) {
          options.onReorderColors(colorDragFrom, toIndex);
        }
        colorDragFrom = -1;
      });

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
  // Track which effects have their controls expanded (default is collapsed)
  const expandedEffects = new Set<string>();
  let previousEffectIds = new Set(options.activeEffects.map(ae => ae.instanceId));

  function renderEffects(effects: ActiveEffect[], params: ShaderParam[], values: Record<string, UniformValue>) {
    // Auto-expand newly added effects
    for (const ae of effects) {
      if (!previousEffectIds.has(ae.instanceId)) {
        expandedEffects.add(ae.instanceId);
      }
    }
    // Clean up expanded state for removed effects
    for (const id of expandedEffects) {
      if (!effects.some(ae => ae.instanceId === id)) {
        expandedEffects.delete(id);
      }
    }
    previousEffectIds = new Set(effects.map(ae => ae.instanceId));
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

    // Group effects by category while preserving flat indices for reorder
    const categoryOrder: Array<{ key: string; label: string }> = [
      { key: 'uv-transform', label: 'UV Transform' },
      { key: 'generator', label: 'Generators' },
      { key: 'post', label: 'Post-Processing' },
    ];

    // Build category ranges (start/end flat indices) for drag clamping
    const categoryRanges: Map<string, { start: number; end: number }> = new Map();
    for (let idx = 0; idx < effects.length; idx++) {
      const block = getEffect(effects[idx].blockId);
      if (!block) continue;
      const cat = block.category;
      const range = categoryRanges.get(cat);
      if (range) {
        range.end = idx;
      } else {
        categoryRanges.set(cat, { start: idx, end: idx });
      }
    }

    let dragFromIndex = -1;
    let dragFromCategory = '';

    for (const { key: catKey, label: catLabel } of categoryOrder) {
      const range = categoryRanges.get(catKey);
      if (!range) continue;

      // Category header
      const catHeader = document.createElement('div');
      catHeader.className = 'effect-category-header';
      catHeader.textContent = catLabel;
      effectsContainer.appendChild(catHeader);

      for (let idx = range.start; idx <= range.end; idx++) {
        const ae = effects[idx];
        const block = getEffect(ae.blockId);
        if (!block || block.category !== catKey) continue;

        const item = document.createElement('div');
        item.className = 'effect-item' + (ae.enabled ? '' : ' disabled');
        item.dataset.instanceId = ae.instanceId;
        item.dataset.index = String(idx);

        // Drag-and-drop: only the handle initiates drag

        item.addEventListener('dragend', () => {
          item.classList.remove('dragging');
          effectsContainer.querySelectorAll('.effect-item').forEach(el => {
            el.classList.remove('drag-over-top', 'drag-over-bottom');
          });
        });

        item.addEventListener('dragover', (e) => {
          e.preventDefault();
          // Only allow drop within same category
          const itemBlock = getEffect(ae.blockId);
          if (itemBlock && itemBlock.category !== dragFromCategory) {
            e.dataTransfer!.dropEffect = 'none';
            return;
          }
          e.dataTransfer!.dropEffect = 'move';
          const rect = item.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          item.classList.remove('drag-over-top', 'drag-over-bottom');
          if (e.clientY < midY) {
            item.classList.add('drag-over-top');
          } else {
            item.classList.add('drag-over-bottom');
          }
        });

        item.addEventListener('dragleave', () => {
          item.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        item.addEventListener('drop', (e) => {
          e.preventDefault();
          item.classList.remove('drag-over-top', 'drag-over-bottom');
          // Only allow drop within same category
          const itemBlock = getEffect(ae.blockId);
          if (!itemBlock || itemBlock.category !== dragFromCategory) {
            dragFromIndex = -1;
            return;
          }
          const rect = item.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          let toIndex = idx;
          if (e.clientY >= midY && toIndex < range.end) {
            toIndex++;
          }
          if (dragFromIndex !== -1 && dragFromIndex !== toIndex) {
            options.onReorderEffects(dragFromIndex, toIndex);
          }
          dragFromIndex = -1;
        });

        // Header row
        const header = document.createElement('div');
        header.className = 'effect-item-header';

        const leftSide = document.createElement('div');
        leftSide.className = 'effect-item-left';

        // Drag handle — only this element initiates reorder drag
        const dragHandle = document.createElement('div');
        dragHandle.className = 'effect-drag-handle';
        dragHandle.draggable = true;
        dragHandle.innerHTML = `<svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor"><circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/><circle cx="2" cy="7" r="1.2"/><circle cx="6" cy="7" r="1.2"/><circle cx="2" cy="12" r="1.2"/><circle cx="6" cy="12" r="1.2"/></svg>`;
        dragHandle.addEventListener('dragstart', (e) => {
          dragFromIndex = idx;
          dragFromCategory = catKey;
          item.classList.add('dragging');
          e.dataTransfer!.effectAllowed = 'move';
          e.dataTransfer!.setData('text/plain', String(idx));
          e.dataTransfer!.setDragImage(item, 0, 0);
        });

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

        // Chevron indicator for expand/collapse
        const chevron = document.createElement('span');
        chevron.className = 'effect-chevron';
        chevron.innerHTML = `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 4.5L6 7.5L9 4.5"/></svg>`;

        leftSide.append(dragHandle, toggle, nameSpan);

        const rightSide = document.createElement('div');
        rightSide.className = 'effect-item-right';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-ghost btn-icon effect-remove-btn';
        removeBtn.title = 'Remove effect';
        removeBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3l6 6M9 3l-6 6"/></svg>`;
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          options.onRemoveEffect(ae.instanceId);
        });

        rightSide.append(chevron, removeBtn);
        header.append(leftSide, rightSide);

        // Controls container (collapsible)
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'effect-item-controls';

        // Default to collapsed unless explicitly expanded; newly added effects start expanded
        const isExpanded = expandedEffects.has(ae.instanceId);
        if (!isExpanded) {
          controlsContainer.style.display = 'none';
          chevron.classList.add('collapsed');
        }

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

        // Expand/collapse: clicking anywhere on the header (except interactive controls)
        header.style.cursor = 'pointer';
        header.addEventListener('click', (e) => {
          // Don't toggle when clicking the toggle switch, drag handle, or remove button
          const target = e.target as HTMLElement;
          if (target.closest('.effect-toggle') || target.closest('.effect-drag-handle') || target.closest('.effect-remove-btn')) {
            return;
          }
          if (expandedEffects.has(ae.instanceId)) {
            expandedEffects.delete(ae.instanceId);
            controlsContainer.style.display = 'none';
            chevron.classList.add('collapsed');
          } else {
            expandedEffects.add(ae.instanceId);
            controlsContainer.style.display = '';
            chevron.classList.remove('collapsed');
          }
        });

        item.append(header, controlsContainer);
        effectsContainer.appendChild(item);
      }
    }
  }

  // Initial render
  renderEffects(options.activeEffects, options.params, options.paramValues);

  return {
    updateEffects(effects, params, values) {
      renderEffects(effects, params, values);
    },
    /** Lightweight update: toggle an effect's enabled visual without full re-render. */
    toggleEffectEnabled(instanceId: string, enabled: boolean) {
      const item = effectsContainer.querySelector(`[data-instance-id="${instanceId}"]`);
      if (item) {
        item.classList.toggle('disabled', !enabled);
      }
    },
    updateColors(colors) {
      renderColors(colors);
    },
    updatePreset(id) {
      container.querySelectorAll('.preset-row').forEach(row => {
        row.classList.toggle('active', (row as HTMLElement).dataset.presetId === id);
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
    <div class="control-label">
      <span class="control-label-text">Color ${index + 1}</span>
    </div>
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
  removeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3l6 6M9 3l-6 6"/></svg>`;
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

    // Copy link button
    const shareBtn = document.createElement('button');
    shareBtn.className = 'btn btn-ghost btn-icon';
    shareBtn.title = 'Copy share link';
    shareBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="1" width="7" height="8" rx="1"/><path d="M1 4v6a1 1 0 001 1h5"/></svg>`;
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onShare(shader.id);
      showToast('Link copied to clipboard');
    });

    // Delete button with inline confirmation
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-ghost btn-icon';
    deleteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3h8M4.5 3V2h3v1M3 3v7a1 1 0 001 1h4a1 1 0 001-1V3"/></svg>`;
    deleteBtn.title = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Replace actions with inline confirm
      actions.innerHTML = '';
      const confirm = document.createElement('div');
      confirm.className = 'inline-confirm';
      confirm.innerHTML = `<span class="inline-confirm-label">Delete?</span>`;
      const yesBtn = document.createElement('button');
      yesBtn.className = 'btn btn-ghost btn-icon inline-confirm-yes';
      yesBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.5 6.5l2.5 2.5 5-5"/></svg>`;
      yesBtn.addEventListener('click', (ev) => { ev.stopPropagation(); onDelete(shader.id); });
      const noBtn = document.createElement('button');
      noBtn.className = 'btn btn-ghost btn-icon inline-confirm-no';
      noBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3l6 6M9 3l-6 6"/></svg>`;
      noBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        confirm.remove();
        actions.append(renameBtn, shareBtn, deleteBtn);
      });
      confirm.append(yesBtn, noBtn);
      actions.appendChild(confirm);
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
