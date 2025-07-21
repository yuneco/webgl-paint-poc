export interface WebGLContextResult {
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  hasInstancedArrays: boolean;
  instancedArraysExt?: ANGLE_instanced_arrays | null;
}

export class WebGLInitializationError extends Error {
  public readonly cause?: unknown;
  
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'WebGLInitializationError';
    this.cause = cause;
  }
}

export function initializeWebGL(canvasId: string): WebGLContextResult {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) {
    throw new WebGLInitializationError(`Canvas element with id "${canvasId}" not found`);
  }

  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new WebGLInitializationError(`Element with id "${canvasId}" is not a canvas`);
  }

  // Try to get WebGL context with explicit type
  const gl = canvas.getContext('webgl') as WebGLRenderingContext | null || 
             canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
  if (!gl) {
    throw new WebGLInitializationError('WebGL is not supported in this browser');
  }

  // Check for instanced arrays extension (required for efficient symmetry drawing)
  const instancedArraysExt = gl.getExtension('ANGLE_instanced_arrays');
  const hasInstancedArrays = instancedArraysExt !== null;

  // Log WebGL capabilities
  console.log('WebGL Context initialized:', {
    renderer: gl.getParameter(gl.RENDERER),
    vendor: gl.getParameter(gl.VENDOR),
    version: gl.getParameter(gl.VERSION),
    hasInstancedArrays,
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
  });

  // Set initial viewport
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Set clear color to white (matches canvas background)
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  return {
    gl,
    canvas,
    hasInstancedArrays,
    instancedArraysExt,
  };
}

export function testWebGLFeatures(gl: WebGLRenderingContext): boolean {
  try {
    // Test shader compilation capability
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if (!vertexShader) return false;

    const testVertexSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    gl.shaderSource(vertexShader, testVertexSource);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error('Test vertex shader compilation failed:', gl.getShaderInfoLog(vertexShader));
      gl.deleteShader(vertexShader);
      return false;
    }

    // Test fragment shader compilation
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fragmentShader) {
      gl.deleteShader(vertexShader);
      return false;
    }

    const testFragmentSource = `
      precision mediump float;
      void main() {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
      }
    `;

    gl.shaderSource(fragmentShader, testFragmentSource);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error('Test fragment shader compilation failed:', gl.getShaderInfoLog(fragmentShader));
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return false;
    }

    // Test program linking
    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return false;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Test program linking failed:', gl.getProgramInfoLog(program));
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteProgram(program);
      return false;
    }

    // Cleanup test resources
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteProgram(program);

    console.log('WebGL feature test passed');
    return true;
  } catch (error) {
    console.error('WebGL feature test failed:', error);
    return false;
  }
}