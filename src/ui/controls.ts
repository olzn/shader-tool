import type { ShaderParam, UniformValue } from '../types';

interface ControlsOptions {
  params: ShaderParam[];
  values: Record<string, UniformValue>;
  onChange: (paramId: string, value: UniformValue) => void;
}

/**
 * Renders parameter controls into the container, grouped by param.group.
 * Returns an update function.
 */
export function createControls(
  container: HTMLElement,
  options: ControlsOptions
): {
  update: (params: ShaderParam[], values: Record<string, UniformValue>) => void;
  destroy: () => void;
} {
  let currentParams = options.params;
  let currentValues = { ...options.values };
  let onChange = options.onChange;

  function render() {
    container.innerHTML = '';

    if (currentParams.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No parameters. Add uniforms in the code editor.';
      container.appendChild(empty);
      return;
    }

    // Group params
    const groups = new Map<string, ShaderParam[]>();
    for (const p of currentParams) {
      const g = p.group || 'Parameters';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(p);
    }

    for (const [groupName, params] of groups) {
      const section = createSection(groupName, params, currentValues, onChange);
      container.appendChild(section);
    }
  }

  render();

  return {
    update(params, values) {
      const paramsChanged = params !== currentParams || params.length !== currentParams.length;
      currentParams = params;
      currentValues = { ...values };
      if (paramsChanged) {
        render();
      } else {
        // Just update values in-place
        updateValues(container, values);
      }
    },
    destroy() {
      container.innerHTML = '';
    },
  };
}

function createSection(
  name: string,
  params: ShaderParam[],
  values: Record<string, UniformValue>,
  onChange: (id: string, value: UniformValue) => void
): HTMLElement {
  const section = document.createElement('div');
  section.className = 'sidebar-section';

  const header = document.createElement('div');
  header.className = 'sidebar-section-header';
  header.innerHTML = `
    <span class="sidebar-section-title">${name}</span>
    <svg class="sidebar-section-chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M3 4.5L6 7.5L9 4.5"/>
    </svg>
  `;
  header.addEventListener('click', () => {
    section.classList.toggle('collapsed');
  });

  const content = document.createElement('div');
  content.className = 'sidebar-section-content';

  const group = document.createElement('div');
  group.className = 'control-group';

  for (const param of params) {
    const control = createControl(param, values[param.id] ?? param.defaultValue, onChange);
    group.appendChild(control);
  }

  content.appendChild(group);
  section.append(header, content);
  return section;
}

function createControl(
  param: ShaderParam,
  value: UniformValue,
  onChange: (id: string, value: UniformValue) => void
): HTMLElement {
  switch (param.type) {
    case 'color':
      return createColorControl(param, value as string, onChange);
    case 'vec2':
      return createVec2Control(param, value as [number, number], onChange);
    case 'bool':
      return createBoolControl(param, value as number, onChange);
    default:
      return createSliderControl(param, value as number, onChange);
  }
}

function createSliderControl(
  param: ShaderParam,
  value: number,
  onChange: (id: string, value: UniformValue) => void
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'control';
  wrap.dataset.paramId = param.id;

  const min = param.min ?? 0;
  const max = param.max ?? 1;
  const step = param.step ?? 0.01;

  wrap.innerHTML = `
    <div class="control-label">
      <span class="control-label-text">${param.label}</span>
      <div style="display:flex;align-items:center;gap:4px">
        <span class="control-value" data-value-display>${formatValue(value, param)}</span>
        <button class="control-reset" title="Reset to default">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M2 6a4 4 0 1 1 1.17 2.83"/>
            <path d="M2 9V6h3"/>
          </svg>
        </button>
      </div>
    </div>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-slider />
  `;

  const slider = wrap.querySelector<HTMLInputElement>('[data-slider]')!;
  const display = wrap.querySelector<HTMLElement>('[data-value-display]')!;
  const resetBtn = wrap.querySelector<HTMLButtonElement>('.control-reset')!;

  slider.addEventListener('input', () => {
    const v = parseFloat(slider.value);
    display.textContent = formatValue(v, param);
    onChange(param.id, v);
  });

  resetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    slider.value = String(param.defaultValue);
    display.textContent = formatValue(param.defaultValue as number, param);
    onChange(param.id, param.defaultValue);
  });

  return wrap;
}

function createColorControl(
  param: ShaderParam,
  value: string,
  onChange: (id: string, value: UniformValue) => void
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'control';
  wrap.dataset.paramId = param.id;

  wrap.innerHTML = `
    <div class="control-label">
      <span class="control-label-text">${param.label}</span>
      <button class="control-reset" title="Reset to default">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M2 6a4 4 0 1 1 1.17 2.83"/>
          <path d="M2 9V6h3"/>
        </svg>
      </button>
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
  const resetBtn = wrap.querySelector<HTMLButtonElement>('.control-reset')!;

  swatch.style.backgroundColor = value;

  picker.addEventListener('input', () => {
    const v = picker.value;
    hexInput.value = v;
    swatch.style.backgroundColor = v;
    onChange(param.id, v);
  });

  hexInput.addEventListener('change', () => {
    let v = hexInput.value.trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      picker.value = v;
      swatch.style.backgroundColor = v;
      onChange(param.id, v);
    }
  });

  resetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const v = param.defaultValue as string;
    picker.value = v;
    hexInput.value = v;
    swatch.style.backgroundColor = v;
    onChange(param.id, v);
  });

  return wrap;
}

function createVec2Control(
  param: ShaderParam,
  value: [number, number],
  onChange: (id: string, value: UniformValue) => void
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'control';
  wrap.dataset.paramId = param.id;

  const min = param.min ?? 0;
  const max = param.max ?? 1;
  const step = param.step ?? 0.01;

  wrap.innerHTML = `
    <div class="control-label">
      <span class="control-label-text">${param.label}</span>
      <button class="control-reset" title="Reset to default">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M2 6a4 4 0 1 1 1.17 2.83"/>
          <path d="M2 9V6h3"/>
        </svg>
      </button>
    </div>
    <div style="display:flex;flex-direction:column;gap:2px">
      <div class="control-row">
        <span class="control-value" style="width:12px">X</span>
        <input type="range" min="${min}" max="${max}" step="${step}" value="${value[0]}" data-vec-x />
        <span class="control-value" data-value-x>${value[0].toFixed(2)}</span>
      </div>
      <div class="control-row">
        <span class="control-value" style="width:12px">Y</span>
        <input type="range" min="${min}" max="${max}" step="${step}" value="${value[1]}" data-vec-y />
        <span class="control-value" data-value-y>${value[1].toFixed(2)}</span>
      </div>
    </div>
  `;

  const sliderX = wrap.querySelector<HTMLInputElement>('[data-vec-x]')!;
  const sliderY = wrap.querySelector<HTMLInputElement>('[data-vec-y]')!;
  const displayX = wrap.querySelector<HTMLElement>('[data-value-x]')!;
  const displayY = wrap.querySelector<HTMLElement>('[data-value-y]')!;

  const emit = () => {
    const v: [number, number] = [parseFloat(sliderX.value), parseFloat(sliderY.value)];
    displayX.textContent = v[0].toFixed(2);
    displayY.textContent = v[1].toFixed(2);
    onChange(param.id, v);
  };

  sliderX.addEventListener('input', emit);
  sliderY.addEventListener('input', emit);

  const resetBtn = wrap.querySelector<HTMLButtonElement>('.control-reset')!;
  resetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const d = param.defaultValue as [number, number];
    sliderX.value = String(d[0]);
    sliderY.value = String(d[1]);
    displayX.textContent = d[0].toFixed(2);
    displayY.textContent = d[1].toFixed(2);
    onChange(param.id, d);
  });

  return wrap;
}

function createBoolControl(
  param: ShaderParam,
  value: number,
  onChange: (id: string, value: UniformValue) => void
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'control';
  wrap.dataset.paramId = param.id;

  const checked = value > 0.5;
  wrap.innerHTML = `
    <div class="control-label">
      <span class="control-label-text">${param.label}</span>
      <label style="display:flex;align-items:center;cursor:pointer">
        <input type="checkbox" ${checked ? 'checked' : ''} data-bool-toggle style="margin:0" />
      </label>
    </div>
  `;

  const toggle = wrap.querySelector<HTMLInputElement>('[data-bool-toggle]')!;
  toggle.addEventListener('change', () => {
    onChange(param.id, toggle.checked ? 1 : 0);
  });

  return wrap;
}

function updateValues(container: HTMLElement, values: Record<string, UniformValue>): void {
  for (const [id, value] of Object.entries(values)) {
    const el = container.querySelector<HTMLElement>(`[data-param-id="${id}"]`);
    if (!el) continue;

    const slider = el.querySelector<HTMLInputElement>('[data-slider]');
    if (slider && typeof value === 'number') {
      if (document.activeElement !== slider) {
        slider.value = String(value);
      }
    }
  }
}

function formatValue(v: number, param: ShaderParam): string {
  const step = param.step ?? 0.01;
  if (step >= 1) return String(Math.round(v));
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  return v.toFixed(Math.min(decimals, 4));
}
