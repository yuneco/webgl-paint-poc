// Basic integration test for regl and regl-line
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeWebGL } from './context';

// @ts-ignore - regl doesn't have TypeScript definitions
import regl from 'regl';
// @ts-ignore - regl-line doesn't have TypeScript definitions  
import createLineRenderer from 'regl-line';

describe('Regl Integration Test', () => {
  let canvas: HTMLCanvasElement;
  let gl: WebGLRenderingContext;
  let reglInstance: any;
  let lineRenderer: any;

  beforeEach(() => {
    // Create test canvas
    canvas = document.createElement('canvas');
    canvas.id = 'test-canvas';
    canvas.width = 512;
    canvas.height = 512;
    document.body.appendChild(canvas);

    // Initialize WebGL context
    const webglContext = initializeWebGL('test-canvas');
    gl = webglContext.gl;
  });

  afterEach(() => {
    // Cleanup
    if (reglInstance && reglInstance.destroy) {
      reglInstance.destroy();
    }
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  });

  it('should initialize regl context successfully', () => {
    expect(() => {
      reglInstance = regl({
        canvas: canvas,
        extensions: ['OES_element_index_uint'],
        attributes: {
          antialias: true,
          alpha: true,
        }
      });
    }).not.toThrow();

    expect(reglInstance).toBeDefined();
  });

  it('should create regl-line renderer successfully', () => {
    reglInstance = regl({
      canvas: canvas,
      extensions: ['OES_element_index_uint'],
      attributes: {
        antialias: true,
        alpha: true,
      }
    });

    expect(() => {
      lineRenderer = createLineRenderer(reglInstance);
    }).not.toThrow();

    expect(lineRenderer).toBeDefined();
    
    // Debug what we actually get
    console.log('lineRenderer type:', typeof lineRenderer);
    console.log('lineRenderer keys:', Object.keys(lineRenderer));
    console.log('lineRenderer:', lineRenderer);
    
    // The return value could be a function or object - let's be flexible
    expect(typeof lineRenderer === 'object' || typeof lineRenderer === 'function').toBeTruthy();
  });

  it('should render a basic line using regl-line', () => {
    reglInstance = regl({
      canvas: canvas,
      extensions: ['OES_element_index_uint'],
      attributes: {
        antialias: true,
        alpha: true,
      }
    });

    lineRenderer = createLineRenderer(reglInstance);

    // Test data: simple line from top-left to bottom-right
    const testPoints = [
      [-0.5, -0.5],
      [0.5, 0.5]
    ];

    expect(() => {
      reglInstance.clear({
        color: [1, 1, 1, 1],
        depth: 1
      });

      // Use the correct regl-line API
      lineRenderer.setPoints(testPoints);
      lineRenderer.setStyle({
        thickness: 10,
        color: [0, 0, 0, 1], // Black line
        join: 'round',
        cap: 'round'
      });
      lineRenderer.draw();
    }).not.toThrow();
  });

  it('should coexist with existing WebGL context', () => {
    // Initialize both contexts
    reglInstance = regl({
      canvas: canvas,
      extensions: ['OES_element_index_uint'],
      attributes: {
        antialias: true,
        alpha: true,
      }
    });

    lineRenderer = createLineRenderer(reglInstance);

    // Both contexts should be working
    expect(gl).toBeDefined();
    expect(reglInstance).toBeDefined();
    
    // Test that we can use both
    expect(() => {
      // Clear with regl
      reglInstance.clear({
        color: [1, 1, 1, 1],
        depth: 1
      });

      // Use original WebGL context
      gl.clearColor(1.0, 1.0, 1.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }).not.toThrow();
  });

  it('should handle stroke data format conversion', () => {
    reglInstance = regl({
      canvas: canvas,
      extensions: ['OES_element_index_uint'],
      attributes: {
        antialias: true,
        alpha: true,
      }
    });

    lineRenderer = createLineRenderer(reglInstance);

    // Simulate StrokeData conversion
    const mockStrokeData = {
      id: 'test-stroke',
      points: [
        { x: 100, y: 100, pressure: 0.5, timestamp: Date.now() },
        { x: 200, y: 200, pressure: 0.7, timestamp: Date.now() + 10 },
        { x: 300, y: 150, pressure: 0.3, timestamp: Date.now() + 20 }
      ],
      timestamp: Date.now(),
      completed: true
    };

    // Convert to regl-line format
    const positions = mockStrokeData.points.map(p => [
      (p.x / 512) - 1, // Convert from 0-1024 canvas coords to -1,1 WebGL coords  
      1 - (p.y / 512)  // Flip Y axis for WebGL
    ]);

    const avgThickness = mockStrokeData.points.reduce((sum, p) => sum + p.pressure, 0) / mockStrokeData.points.length * 20;

    expect(positions).toHaveLength(3);
    expect(positions[0]).toEqual([100/512 - 1, 1 - 100/512]);

    // Test rendering with converted data
    expect(() => {
      reglInstance.clear({
        color: [1, 1, 1, 1],
        depth: 1
      });

      // Use correct regl-line API
      lineRenderer.setPoints(positions);
      lineRenderer.setStyle({
        thickness: avgThickness,
        color: [0, 0, 0, 1],
        join: 'round',
        cap: 'round'
      });
      lineRenderer.draw();
    }).not.toThrow();
  });
});