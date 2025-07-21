import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeWebGL, testWebGLFeatures, WebGLInitializationError } from './context';

describe('WebGL Context (Browser Mode)', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create a fresh canvas for each test
    canvas = document.createElement('canvas');
    canvas.id = 'test-canvas';
    canvas.width = 1024;
    canvas.height = 1024;
    document.body.appendChild(canvas);
  });

  it('should initialize WebGL context successfully', () => {
    const result = initializeWebGL('test-canvas');
    
    expect(result.gl).toBeDefined();
    expect(result.canvas).toBe(canvas);
    expect(result.gl).toBeInstanceOf(WebGLRenderingContext);
    expect(typeof result.hasInstancedArrays).toBe('boolean');
    
    // Verify canvas dimensions
    expect(result.canvas.width).toBe(1024);
    expect(result.canvas.height).toBe(1024);
  });

  it('should throw error when canvas not found', () => {
    expect(() => {
      initializeWebGL('nonexistent-canvas');
    }).toThrow(WebGLInitializationError);
    
    expect(() => {
      initializeWebGL('nonexistent-canvas');
    }).toThrow('Canvas element with id "nonexistent-canvas" not found');
  });

  it('should throw error when element is not canvas', () => {
    const div = document.createElement('div');
    div.id = 'not-a-canvas';
    document.body.appendChild(div);
    
    expect(() => {
      initializeWebGL('not-a-canvas');
    }).toThrow(WebGLInitializationError);
    
    expect(() => {
      initializeWebGL('not-a-canvas');
    }).toThrow('Element with id "not-a-canvas" is not a canvas');
  });

  it('should test WebGL features successfully', () => {
    const result = initializeWebGL('test-canvas');
    const featuresSupported = testWebGLFeatures(result.gl);
    
    expect(featuresSupported).toBe(true);
  });

  it('should log WebGL capabilities', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    
    initializeWebGL('test-canvas');
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'WebGL Context initialized:',
      expect.objectContaining({
        renderer: expect.any(String),
        vendor: expect.any(String),
        version: expect.any(String),
        hasInstancedArrays: expect.any(Boolean),
        maxTextureSize: expect.any(Number),
        maxVertexAttribs: expect.any(Number),
      })
    );
    
    consoleSpy.mockRestore();
  });

  it('should clear canvas to white', () => {
    const result = initializeWebGL('test-canvas');
    
    // Clear should not throw
    expect(() => {
      result.gl.clear(result.gl.COLOR_BUFFER_BIT);
    }).not.toThrow();
    
    // Verify clear color was set to white (WebGL returns Float32Array)
    const clearColor = result.gl.getParameter(result.gl.COLOR_CLEAR_VALUE);
    expect(Array.from(clearColor)).toEqual([1.0, 1.0, 1.0, 1.0]);
  });
});