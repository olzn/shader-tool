interface GenerateHTMLOptions {
  functionName: string;
  vertexSource: string;
  fragmentSource: string;
  usesTexture: boolean;
  exportAsync: boolean;
  title?: string;
}

export function generateHTML(opts: GenerateHTMLOptions): string {
  const { functionName, vertexSource, fragmentSource, usesTexture, title } = opts;

  let compileShader = `    function compileShader(gl, type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }`;

  let loadTextureStr = '';
  if (usesTexture) {
    loadTextureStr = `
    function loadTexture(gl, url) {
      return new Promise((resolve, reject) => {
        const texture = gl.createTexture();
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          resolve(texture);
        };
        image.onerror = reject;
        image.src = url;
      });
    }`;
  }

  const fnSignature = usesTexture
    ? `async function ${functionName}(targetElement, imageUrl)`
    : `function ${functionName}(targetElement)`;

  const textureSetup = usesTexture
    ? `
      const uTexture = gl.getUniformLocation(program, 'u_texture');

      const texture = await loadTexture(gl, imageUrl);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uTexture, 0);`
    : '';

  const textureCleanup = usesTexture
    ? `
        gl.deleteTexture(texture);`
    : '';

  const invocation = usesTexture
    ? `    // Provide your image URL here
    const cleanup = await ${functionName}(document.getElementById('backdrop'), 'YOUR_IMAGE_URL');`
    : `    const cleanup = ${functionName}(document.getElementById('backdrop'));`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title || functionName} Test</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; }
    #backdrop {
      position: relative;
      width: 100vw;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="backdrop"></div>
  <script type="module">
    const MAX_DPR = 2;

    const VERTEX_SOURCE = \`
    ${vertexSource}\`;

    const FRAGMENT_SOURCE = \`
    ${fragmentSource}\`;

${compileShader}
${loadTextureStr}

    ${fnSignature} {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
      targetElement.appendChild(canvas);

      const gl = canvas.getContext('webgl', {
        alpha: false, antialias: false, depth: false, stencil: false,
        powerPreference: 'low-power', preserveDrawingBuffer: false,
      });
      if (!gl) { canvas.remove(); return () => {}; }

      const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SOURCE);
      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      gl.useProgram(program);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      const uTime = gl.getUniformLocation(program, 'u_time');
      const uRes = gl.getUniformLocation(program, 'u_resolution');${textureSetup}

      function resize() {
        const rect = targetElement.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const w = Math.round(rect.width * dpr);
        const h = Math.round(rect.height * dpr);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w; canvas.height = h;
          gl.viewport(0, 0, w, h);
        }
      }

      const observer = new ResizeObserver(resize);
      observer.observe(targetElement);

      let rafId = 0;
      const start = performance.now();
      function frame() {
        const t = (performance.now() - start) * 0.001;
        gl.uniform1f(uTime, t);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        rafId = requestAnimationFrame(frame);
      }

      resize();
      rafId = requestAnimationFrame(frame);

      return () => {
        cancelAnimationFrame(rafId);
        observer.disconnect();${textureCleanup}
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        canvas.remove();
      };
    }

${invocation}
  </script>
</body>
</html>
`;
}
