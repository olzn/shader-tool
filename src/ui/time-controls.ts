interface TimeControlsOptions {
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onTimeScaleChange: (scale: number) => void;
}

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4];

export function createTimeControls(
  container: HTMLElement,
  options: TimeControlsOptions
): {
  updateTime: (time: number) => void;
  updatePlaying: (playing: boolean) => void;
  updateTimeScale: (scale: number) => void;
  element: HTMLElement;
} {
  const wrap = document.createElement('div');
  wrap.className = 'time-controls';

  // Play/Pause button
  const playBtn = document.createElement('button');
  playBtn.className = 'btn btn-ghost btn-icon';
  playBtn.title = 'Play/Pause (Space)';
  playBtn.setAttribute('aria-label', 'Play/Pause');
  playBtn.innerHTML = pauseIcon();

  playBtn.addEventListener('click', () => {
    const isPlaying = playBtn.dataset.playing === 'true';
    if (isPlaying) options.onPause();
    else options.onPlay();
  });
  playBtn.dataset.playing = 'true';

  // Reset button
  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn btn-ghost btn-icon';
  resetBtn.title = 'Reset time';
  resetBtn.setAttribute('aria-label', 'Reset time');
  resetBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6a4 4 0 1 1 1.17 2.83"/><path d="M2 9V6h3"/></svg>`;
  resetBtn.addEventListener('click', options.onReset);

  // Speed selector
  const speedSelect = document.createElement('select');
  speedSelect.className = 'select';
  speedSelect.title = 'Playback speed';
  for (const s of SPEED_OPTIONS) {
    const opt = document.createElement('option');
    opt.value = String(s);
    opt.textContent = `${s}x`;
    if (s === 1) opt.selected = true;
    speedSelect.appendChild(opt);
  }
  speedSelect.addEventListener('change', () => {
    options.onTimeScaleChange(parseFloat(speedSelect.value));
  });

  // Time display
  const timeDisplay = document.createElement('span');
  timeDisplay.className = 'time-display';
  timeDisplay.textContent = '0.0s';

  wrap.append(playBtn, resetBtn, speedSelect, timeDisplay);
  container.appendChild(wrap);

  return {
    element: wrap,
    updateTime(time) {
      timeDisplay.textContent = time.toFixed(1) + 's';
    },
    updatePlaying(playing) {
      playBtn.dataset.playing = String(playing);
      playBtn.innerHTML = playing ? pauseIcon() : playIcon();
    },
    updateTimeScale(scale) {
      speedSelect.value = String(scale);
    },
  };
}

function playIcon(): string {
  return `<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M3 1.5l7 4.5-7 4.5z"/></svg>`;
}

function pauseIcon(): string {
  return `<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><rect x="2" y="1.5" width="3" height="9" rx="0.5"/><rect x="7" y="1.5" width="3" height="9" rx="0.5"/></svg>`;
}
