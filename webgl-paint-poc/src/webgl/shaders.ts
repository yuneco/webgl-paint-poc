// Basic shader programs for WebGL Symmetry Paint PoC

export interface ShaderProgram {
  program: WebGLProgram;
  attributes: {
    position: number;
    pressure: number;
  };
  uniforms: {
    resolution: WebGLUniformLocation | null;
    color: WebGLUniformLocation | null;
  };
}

export class ShaderCompilationError extends Error {
  public readonly shaderType: string;
  public readonly shaderSource: string;
  public readonly glError: string;

  constructor(message: string, shaderType: string, shaderSource: string, glError: string) {
    super(message);
    this.name = 'ShaderCompilationError';
    this.shaderType = shaderType;
    this.shaderSource = shaderSource;
    this.glError = glError;
  }
}

export class ProgramLinkingError extends Error {
  public readonly programLog: string;

  constructor(message: string, programLog: string) {
    super(message);
    this.name = 'ProgramLinkingError';
    this.programLog = programLog;
  }
}

// Minimal vertex shader for basic stroke rendering
export const basicVertexShaderSource = `
  attribute vec2 a_position;
  attribute float a_pressure;
  
  uniform vec2 u_resolution;
  
  varying float v_pressure;
  
  void main() {
    // Convert from canvas coordinates (0-1024) to clip space (-1 to 1)
    vec2 zeroToOne = a_position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    
    // Flip Y coordinate (WebGL Y goes up, canvas Y goes down)
    gl_Position = vec4(clipSpace.x, -clipSpace.y, 0.0, 1.0);
    
    // Pass pressure to fragment shader
    v_pressure = a_pressure;
    
    // Use pressure to control point size (for GL_POINTS rendering)
    gl_PointSize = a_pressure * 10.0 + 2.0;
  }
`;

// Minimal fragment shader for single color rendering
export const basicFragmentShaderSource = `
  precision mediump float;
  
  uniform vec4 u_color;
  varying float v_pressure;
  
  void main() {
    // Simple solid color with pressure-based alpha
    vec4 color = u_color;
    color.a *= v_pressure;
    
    gl_FragColor = color;
  }
`;

/**
 * Compile a WebGL shader
 */
export function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new ShaderCompilationError(
      'Failed to create shader object',
      type === gl.VERTEX_SHADER ? 'vertex' : 'fragment',
      source,
      'createShader returned null'
    );
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader) || 'Unknown compilation error';
    gl.deleteShader(shader);
    
    throw new ShaderCompilationError(
      `Shader compilation failed: ${error}`,
      type === gl.VERTEX_SHADER ? 'vertex' : 'fragment',
      source,
      error
    );
  }

  return shader;
}

/**
 * Create a WebGL program from vertex and fragment shaders
 */
export function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) {
    throw new ProgramLinkingError(
      'Failed to create program object',
      'createProgram returned null'
    );
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program) || 'Unknown linking error';
    gl.deleteProgram(program);
    
    throw new ProgramLinkingError(
      `Program linking failed: ${error}`,
      error
    );
  }

  return program;
}

/**
 * Create the basic shader program for stroke rendering
 */
export function createBasicShaderProgram(gl: WebGLRenderingContext): ShaderProgram {
  // Compile shaders
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, basicVertexShaderSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, basicFragmentShaderSource);

  // Create program
  const program = createProgram(gl, vertexShader, fragmentShader);

  // Get attribute locations
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const pressureLocation = gl.getAttribLocation(program, 'a_pressure');

  if (positionLocation === -1) {
    throw new Error('Failed to get a_position attribute location');
  }
  if (pressureLocation === -1) {
    throw new Error('Failed to get a_pressure attribute location');
  }

  // Get uniform locations
  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
  const colorLocation = gl.getUniformLocation(program, 'u_color');

  // Clean up shaders (they're linked into the program now)
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  console.log('Basic shader program created successfully:', {
    positionLocation,
    pressureLocation,
    hasResolutionUniform: resolutionLocation !== null,
    hasColorUniform: colorLocation !== null,
  });

  return {
    program,
    attributes: {
      position: positionLocation,
      pressure: pressureLocation,
    },
    uniforms: {
      resolution: resolutionLocation,
      color: colorLocation,
    },
  };
}

/**
 * Validate shader program by checking all expected attributes and uniforms
 */
export function validateShaderProgram(gl: WebGLRenderingContext, shaderProgram: ShaderProgram): boolean {
  try {
    // Check if program is valid
    if (!gl.isProgram(shaderProgram.program)) {
      console.error('Invalid WebGL program object');
      return false;
    }

    // Validate program
    gl.validateProgram(shaderProgram.program);
    if (!gl.getProgramParameter(shaderProgram.program, gl.VALIDATE_STATUS)) {
      const error = gl.getProgramInfoLog(shaderProgram.program);
      console.error('Program validation failed:', error);
      return false;
    }

    // Check attribute locations are valid
    if (shaderProgram.attributes.position < 0 || shaderProgram.attributes.pressure < 0) {
      console.error('Invalid attribute locations');
      return false;
    }

    console.log('Shader program validation passed');
    return true;
  } catch (error) {
    console.error('Shader program validation error:', error);
    return false;
  }
}

/**
 * Set up shader program uniforms with default values
 */
export function setupShaderUniforms(
  gl: WebGLRenderingContext,
  shaderProgram: ShaderProgram,
  canvasWidth: number = 1024,
  canvasHeight: number = 1024
): void {
  gl.useProgram(shaderProgram.program);

  // Set resolution uniform
  if (shaderProgram.uniforms.resolution) {
    gl.uniform2f(shaderProgram.uniforms.resolution, canvasWidth, canvasHeight);
  }

  // Set default color (black)
  if (shaderProgram.uniforms.color) {
    gl.uniform4f(shaderProgram.uniforms.color, 0.0, 0.0, 0.0, 1.0);
  }

  console.log('Shader uniforms initialized:', {
    resolution: [canvasWidth, canvasHeight],
    color: [0.0, 0.0, 0.0, 1.0],
  });
}