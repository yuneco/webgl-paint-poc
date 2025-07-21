import { describe, it, expect, beforeEach } from 'vitest';
import {
  basicVertexShaderSource,
  basicFragmentShaderSource,
  compileShader,
  createProgram,
  createBasicShaderProgram,
  validateShaderProgram,
  setupShaderUniforms,
  ShaderCompilationError,
  ProgramLinkingError,
} from './shaders';
import { initializeWebGL } from './context';

describe('WebGL Shaders (Browser Mode)', () => {
  let canvas: HTMLCanvasElement;
  let gl: WebGLRenderingContext;

  beforeEach(() => {
    // Create a fresh canvas for each test
    canvas = document.createElement('canvas');
    canvas.id = 'test-canvas';
    canvas.width = 1024;
    canvas.height = 1024;
    document.body.appendChild(canvas);

    // Initialize WebGL
    const webglContext = initializeWebGL('test-canvas');
    gl = webglContext.gl;
  });

  describe('Shader Source Code', () => {
    it('should have valid vertex shader source', () => {
      expect(basicVertexShaderSource).toBeDefined();
      expect(typeof basicVertexShaderSource).toBe('string');
      expect(basicVertexShaderSource).toContain('attribute vec2 a_position');
      expect(basicVertexShaderSource).toContain('attribute float a_pressure');
      expect(basicVertexShaderSource).toContain('uniform vec2 u_resolution');
      expect(basicVertexShaderSource).toContain('varying float v_pressure');
      expect(basicVertexShaderSource).toContain('void main()');
    });

    it('should have valid fragment shader source', () => {
      expect(basicFragmentShaderSource).toBeDefined();
      expect(typeof basicFragmentShaderSource).toBe('string');
      expect(basicFragmentShaderSource).toContain('precision mediump float');
      expect(basicFragmentShaderSource).toContain('uniform vec4 u_color');
      expect(basicFragmentShaderSource).toContain('varying float v_pressure');
      expect(basicFragmentShaderSource).toContain('void main()');
      expect(basicFragmentShaderSource).toContain('gl_FragColor');
    });
  });

  describe('Shader Compilation', () => {
    it('should compile vertex shader successfully', () => {
      const vertexShader = compileShader(gl, gl.VERTEX_SHADER, basicVertexShaderSource);
      
      expect(vertexShader).toBeDefined();
      expect(gl.isShader(vertexShader)).toBe(true);
      expect(gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)).toBe(true);
      
      // Clean up
      gl.deleteShader(vertexShader);
    });

    it('should compile fragment shader successfully', () => {
      const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, basicFragmentShaderSource);
      
      expect(fragmentShader).toBeDefined();
      expect(gl.isShader(fragmentShader)).toBe(true);
      expect(gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)).toBe(true);
      
      // Clean up
      gl.deleteShader(fragmentShader);
    });

    it('should throw ShaderCompilationError for invalid vertex shader', () => {
      const invalidVertexSource = `
        invalid shader source
        this will not compile
      `;

      expect(() => {
        compileShader(gl, gl.VERTEX_SHADER, invalidVertexSource);
      }).toThrow(ShaderCompilationError);
    });

    it('should throw ShaderCompilationError for invalid fragment shader', () => {
      const invalidFragmentSource = `
        precision mediump float;
        void main() {
          gl_FragColor = invalid_expression;
        }
      `;

      expect(() => {
        compileShader(gl, gl.FRAGMENT_SHADER, invalidFragmentSource);
      }).toThrow(ShaderCompilationError);
    });
  });

  describe('Program Creation', () => {
    it('should create program successfully with valid shaders', () => {
      const vertexShader = compileShader(gl, gl.VERTEX_SHADER, basicVertexShaderSource);
      const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, basicFragmentShaderSource);
      
      const program = createProgram(gl, vertexShader, fragmentShader);
      
      expect(program).toBeDefined();
      expect(gl.isProgram(program)).toBe(true);
      expect(gl.getProgramParameter(program, gl.LINK_STATUS)).toBe(true);
      
      // Clean up
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteProgram(program);
    });

    it('should throw ProgramLinkingError for incompatible shaders', () => {
      const incompatibleVertexSource = `
        attribute vec2 a_position;
        varying vec3 v_incompatible;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
          v_incompatible = vec3(1.0, 2.0, 3.0);
        }
      `;

      const incompatibleFragmentSource = `
        precision mediump float;
        varying vec2 v_different;
        void main() {
          gl_FragColor = vec4(v_different, 0.0, 1.0);
        }
      `;

      const vertexShader = compileShader(gl, gl.VERTEX_SHADER, incompatibleVertexSource);
      const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, incompatibleFragmentSource);

      expect(() => {
        createProgram(gl, vertexShader, fragmentShader);
      }).toThrow(ProgramLinkingError);

      // Clean up shaders
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    });
  });

  describe('Basic Shader Program', () => {
    it('should create basic shader program successfully', () => {
      const shaderProgram = createBasicShaderProgram(gl);
      
      expect(shaderProgram.program).toBeDefined();
      expect(gl.isProgram(shaderProgram.program)).toBe(true);
      
      // Check attributes
      expect(shaderProgram.attributes.position).toBeGreaterThanOrEqual(0);
      expect(shaderProgram.attributes.pressure).toBeGreaterThanOrEqual(0);
      
      // Check uniforms (they can be null if not found, but shouldn't be for our shader)
      expect(shaderProgram.uniforms.resolution).not.toBeNull();
      expect(shaderProgram.uniforms.color).not.toBeNull();
      
      // Clean up
      gl.deleteProgram(shaderProgram.program);
    });

    it('should have correct attribute locations', () => {
      const shaderProgram = createBasicShaderProgram(gl);
      
      // Test that we can enable the attributes without error
      expect(() => {
        gl.enableVertexAttribArray(shaderProgram.attributes.position);
        gl.enableVertexAttribArray(shaderProgram.attributes.pressure);
        gl.disableVertexAttribArray(shaderProgram.attributes.position);
        gl.disableVertexAttribArray(shaderProgram.attributes.pressure);
      }).not.toThrow();
      
      // Clean up
      gl.deleteProgram(shaderProgram.program);
    });

    it('should have working uniform locations', () => {
      const shaderProgram = createBasicShaderProgram(gl);
      
      gl.useProgram(shaderProgram.program);
      
      // Test setting uniforms without error
      expect(() => {
        if (shaderProgram.uniforms.resolution) {
          gl.uniform2f(shaderProgram.uniforms.resolution, 1024, 1024);
        }
        if (shaderProgram.uniforms.color) {
          gl.uniform4f(shaderProgram.uniforms.color, 1.0, 0.0, 0.0, 1.0);
        }
      }).not.toThrow();
      
      // Clean up
      gl.deleteProgram(shaderProgram.program);
    });
  });

  describe('Shader Program Validation', () => {
    it('should validate correct shader program', () => {
      const shaderProgram = createBasicShaderProgram(gl);
      
      const isValid = validateShaderProgram(gl, shaderProgram);
      expect(isValid).toBe(true);
      
      // Clean up
      gl.deleteProgram(shaderProgram.program);
    });

    it('should reject invalid program', () => {
      const invalidProgram = {
        program: {} as WebGLProgram, // Invalid program object
        attributes: { position: 0, pressure: 1 },
        uniforms: { resolution: null, color: null },
      };
      
      const isValid = validateShaderProgram(gl, invalidProgram);
      expect(isValid).toBe(false);
    });
  });

  describe('Shader Uniform Setup', () => {
    it('should setup uniforms with default values', () => {
      const shaderProgram = createBasicShaderProgram(gl);
      
      expect(() => {
        setupShaderUniforms(gl, shaderProgram);
      }).not.toThrow();
      
      // Clean up
      gl.deleteProgram(shaderProgram.program);
    });

    it('should setup uniforms with custom canvas size', () => {
      const shaderProgram = createBasicShaderProgram(gl);
      
      expect(() => {
        setupShaderUniforms(gl, shaderProgram, 512, 512);
      }).not.toThrow();
      
      // Clean up
      gl.deleteProgram(shaderProgram.program);
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed error information for compilation failures', () => {
      const invalidSource = `
        attribute vec2 a_position;
        void main() {
          gl_Position = invalid_function(a_position);
        }
      `;

      try {
        compileShader(gl, gl.VERTEX_SHADER, invalidSource);
        expect.fail('Should have thrown ShaderCompilationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ShaderCompilationError);
        if (error instanceof ShaderCompilationError) {
          expect(error.shaderType).toBe('vertex');
          expect(error.shaderSource).toBe(invalidSource);
          expect(error.glError).toContain('invalid_function');
        }
      }
    });

    it('should provide detailed error information for linking failures', () => {
      const vertexShader = compileShader(gl, gl.VERTEX_SHADER, `
        attribute vec2 a_position;
        varying vec4 v_test;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
          v_test = vec4(1.0);
        }
      `);

      const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, `
        precision mediump float;
        varying vec2 v_different; // Different from vertex shader
        void main() {
          gl_FragColor = vec4(v_different, 0.0, 1.0);
        }
      `);

      try {
        createProgram(gl, vertexShader, fragmentShader);
        expect.fail('Should have thrown ProgramLinkingError');
      } catch (error) {
        expect(error).toBeInstanceOf(ProgramLinkingError);
        if (error instanceof ProgramLinkingError) {
          expect(error.programLog).toBeDefined();
        }
      } finally {
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
      }
    });
  });
});