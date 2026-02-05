import type { CompileError, UniformValue } from './types';
import { parseCompileErrors, hexToVec3 } from './compiler';

const MAX_DPR = 2;

export class Renderer {
  private gl: WebGLRenderingContext | null = null;
  private canvas: HTMLCanvasElement;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private rafId = 0;
  private startTime = 0;
  private currentTime = 0;
  private _playing = true;
  private _timeScale = 1.0;
  private pausedTime = 0;
  private observer: ResizeObserver | null = null;

  // Uniform state
  private uniformLocations = new Map<string, WebGLUniformLocation | null>();
  private pendingUniforms = new Map<string, { type: string; value: UniformValue }>();

  // Keep old program on compile failure
  private vertexShader: WebGLShader | null = null;
  private fragmentShader: WebGLShader | null = null;

  // Time callback
  onTimeUpdate?: (time: number) => void;

  constructor(private container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.container.appendChild(this.canvas);

    this.gl = this.canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    });

    if (!this.gl) return;

    // Setup fullscreen quad
    this.buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      this.gl.STATIC_DRAW
    );

    // Resize handling
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.container);
    this.resize();

    // Start time
    this.startTime = performance.now();
    this.loop();
  }

  get playing(): boolean {
    return this._playing;
  }

  get timeScale(): number {
    return this._timeScale;
  }

  get time(): number {
    return this.currentTime;
  }

  compile(vertexSource: string, fragmentSource: string): CompileError[] | null {
    const gl = this.gl;
    if (!gl) return [{ type: 'vertex', message: 'WebGL not available' }];

    // Compile vertex shader
    const vs = gl.createShader(gl.VERTEX_SHADER);
    if (!vs) return [{ type: 'vertex', message: 'Failed to create vertex shader' }];
    gl.shaderSource(vs, vertexSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(vs) || 'Unknown error';
      gl.deleteShader(vs);
      return parseCompileErrors(log, 'vertex');
    }

    // Compile fragment shader
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fs) {
      gl.deleteShader(vs);
      return [{ type: 'fragment', message: 'Failed to create fragment shader' }];
    }
    gl.shaderSource(fs, fragmentSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(fs) || 'Unknown error';
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return parseCompileErrors(log, 'fragment');
    }

    // Link program
    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return [{ type: 'link', message: 'Failed to create program' }];
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) || 'Unknown error';
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteProgram(program);
      return [{ type: 'link', message: log }];
    }

    // Success — swap old program
    if (this.program) {
      gl.deleteProgram(this.program);
    }
    if (this.vertexShader) {
      gl.deleteShader(this.vertexShader);
    }
    if (this.fragmentShader) {
      gl.deleteShader(this.fragmentShader);
    }

    this.program = program;
    this.vertexShader = vs;
    this.fragmentShader = fs;

    gl.useProgram(program);

    // Re-bind buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Clear uniform location cache
    this.uniformLocations.clear();

    return null;
  }

  setUniform(name: string, type: string, value: UniformValue): void {
    this.pendingUniforms.set(name, { type, value });
  }

  play(): void {
    if (this._playing) return;
    this._playing = true;
    this.startTime = performance.now() - this.pausedTime * 1000 / this._timeScale;
  }

  pause(): void {
    if (!this._playing) return;
    this._playing = false;
    this.pausedTime = this.currentTime;
  }

  reset(): void {
    this.startTime = performance.now();
    this.pausedTime = 0;
    this.currentTime = 0;
  }

  setTimeScale(scale: number): void {
    const now = performance.now();
    // Preserve current time position when changing scale
    this.startTime = now - this.currentTime * 1000 / scale;
    this._timeScale = scale;
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.gl?.viewport(0, 0, w, h);
    }
  }

  private getUniformLocation(name: string): WebGLUniformLocation | null {
    if (!this.gl || !this.program) return null;
    if (this.uniformLocations.has(name)) {
      return this.uniformLocations.get(name)!;
    }
    const loc = this.gl.getUniformLocation(this.program, name);
    this.uniformLocations.set(name, loc);
    return loc;
  }

  private applyUniforms(): void {
    const gl = this.gl;
    if (!gl || !this.program) return;

    // Built-in uniforms
    const uTime = this.getUniformLocation('u_time');
    const uRes = this.getUniformLocation('u_resolution');
    if (uTime) gl.uniform1f(uTime, this.currentTime);
    if (uRes) gl.uniform2f(uRes, this.canvas.width, this.canvas.height);

    // User uniforms
    for (const [name, { type, value }] of this.pendingUniforms) {
      const loc = this.getUniformLocation(name);
      if (!loc) continue;

      switch (type) {
        case 'float':
        case 'select':
          gl.uniform1f(loc, value as number);
          break;
        case 'int':
          gl.uniform1i(loc, value as number);
          break;
        case 'bool':
          gl.uniform1f(loc, (value as number) > 0.5 ? 1.0 : 0.0);
          break;
        case 'color': {
          const [r, g, b] = hexToVec3(value as string);
          gl.uniform3f(loc, r, g, b);
          break;
        }
        case 'vec2': {
          const v = value as [number, number];
          gl.uniform2f(loc, v[0], v[1]);
          break;
        }
      }
    }
  }

  private loop = (): void => {
    if (this._playing) {
      this.currentTime = (performance.now() - this.startTime) * 0.001 * this._timeScale;
    }

    if (this.gl && this.program) {
      this.applyUniforms();
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    this.onTimeUpdate?.(this.currentTime);
    this.rafId = requestAnimationFrame(this.loop);
  };

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.observer?.disconnect();
    if (this.gl) {
      if (this.buffer) this.gl.deleteBuffer(this.buffer);
      if (this.program) this.gl.deleteProgram(this.program);
      if (this.vertexShader) this.gl.deleteShader(this.vertexShader);
      if (this.fragmentShader) this.gl.deleteShader(this.fragmentShader);
      this.gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.canvas.remove();
  }
}
