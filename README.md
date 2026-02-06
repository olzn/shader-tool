# Glint Studio

A browser-based WebGL shader composer with a modular effect system, real-time preview, and export to standalone TypeScript or HTML.

**Live demo:** [https://olzn.github.io/glint-studio/](https://olzn.github.io/glint-studio/)

## Features

- **Modular effects** — Build shaders by combining self-contained effect blocks (generators, post-processing, UV transforms)
- **Real-time preview** — WebGL canvas with play/pause, reset, and adjustable time scale
- **Presets** — Blank, Swirl, Glow, Retro, Cosmic, Ocean, Halftone, LED Bars, and Plasma presets as starting points
- **Generator layering** — Multiple generator effects blend together using contrast-based compositing
- **Code viewer** — Read-only CodeMirror 6 editor showing the composed GLSL output
- **Export** — Generate self-contained TypeScript functions or standalone HTML files with baked parameter values
- **Save/Load** — Persist shader projects to localStorage with autosave
- **Share** — Copy shareable URLs with encoded shader state

## Getting Started

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (default `http://localhost:5173`).

## Usage

### Presets

Select a preset from the sidebar to load a pre-configured combination of effects. Presets are starting points — you can add, remove, or tweak effects after loading one.

### Effects

Click **Add Effect** to open the effect catalog. Effects are grouped by category:

- **UV Transform** — Pixelate, Diffuse Blur, Polar Coordinates
- **Generators** — Gradient, Noise, Domain Warp, Wave, Glow Waves, Spiral, Floating Particles, LED Bars
- **Post-Processing** — Brightness, Vignette, Film Grain, CRT Scanlines, Chromatic Aberration, Dot Grid, ASCII, Dither

Each effect has its own parameter controls (sliders, color pickers). Effects can be toggled on/off, removed, or reordered via drag-and-drop within their category.

### Colors

Up to 5 colors can be added. Generators use these to produce the color gradient via a `colorRamp()` function. Colors can be reordered by dragging their handles.

### Code Viewer

Toggle the code viewer with the **Code** button or `Ctrl+E` to inspect the composed GLSL fragment shader. The output updates live as you add effects and adjust parameters.

### Export

The export panel generates production-ready code with all parameter values baked in:

- **TypeScript** — A single function that mounts a WebGL canvas on a target `<div>` and returns a cleanup function
- **HTML** — A standalone page for quick testing

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + E` | Toggle code viewer |
| `Ctrl/Cmd + S` | Save shader |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Space` | Play / Pause |

## Architecture

Shaders are composed at runtime from effect blocks. Each effect is a self-contained GLSL module with `$param` placeholders that get replaced with instance-scoped uniform names. The composer (`src/composer.ts`) assembles the final fragment shader by sorting effects by category and order, deduplicating shared utility functions (hash, noise, fbm), and emitting the combined GLSL.

## Tech Stack

- [Vite](https://vite.dev) — Dev server and build
- [TypeScript](https://www.typescriptlang.org) — Type safety
- [CodeMirror 6](https://codemirror.net) — Code viewer
- WebGL — Shader rendering

## License

MIT
