import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initializeRenderer,
  clearCanvas,
  setDrawingColor,
  renderStroke,
  renderStrokes,
  renderStrokesAsPoints,
  renderTestPattern,
  cleanupRenderer,
  RendererInitializationError,
} from './renderer';
import type { WebGLRenderer } from './renderer';
import { horizontalLineStroke, arcStroke, allTestStrokes } from '../data/testStrokes';
import * as CoreTypes from '../types/core';

type StrokeData = CoreTypes.StrokeData;

describe('WebGL Renderer (Browser Mode)', () => {
  let canvas: HTMLCanvasElement;
  let renderer: WebGLRenderer;

  beforeEach(() => {
    // Create a fresh canvas for each test
    canvas = document.createElement('canvas');
    canvas.id = 'renderer-test-canvas';
    canvas.width = 1024;
    canvas.height = 1024;
    document.body.appendChild(canvas);

    // Initialize renderer
    renderer = initializeRenderer('renderer-test-canvas');
  });

  afterEach(() => {
    // Clean up renderer and canvas
    if (renderer) {
      cleanupRenderer(renderer);
    }
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  });

  describe('Renderer Initialization', () => {
    it('should initialize renderer successfully', () => {
      expect(renderer).toBeDefined();
      expect(renderer.canvas).toBe(canvas);
      expect(renderer.gl).toBeDefined();
      expect(renderer.shaderProgram).toBeDefined();
      expect(renderer.canvasWidth).toBe(1024);
      expect(renderer.canvasHeight).toBe(1024);
    });

    it('should setup WebGL state correctly', () => {
      const { gl } = renderer;
      
      // Check viewport
      const viewport = gl.getParameter(gl.VIEWPORT);
      expect(viewport[0]).toBe(0); // x
      expect(viewport[1]).toBe(0); // y
      expect(viewport[2]).toBe(1024); // width
      expect(viewport[3]).toBe(1024); // height

      // Check clear color (should be white: 1,1,1,1)
      const clearColor = gl.getParameter(gl.COLOR_CLEAR_VALUE);
      expect(clearColor[0]).toBeCloseTo(1.0);
      expect(clearColor[1]).toBeCloseTo(1.0);
      expect(clearColor[2]).toBeCloseTo(1.0);
      expect(clearColor[3]).toBeCloseTo(1.0);

      // Check blending is enabled
      expect(gl.isEnabled(gl.BLEND)).toBe(true);
    });

    it('should throw RendererInitializationError for invalid canvas', () => {
      expect(() => {
        initializeRenderer('non-existent-canvas');
      }).toThrow(RendererInitializationError);
    });
  });

  describe('Canvas Operations', () => {
    it('should clear canvas without error', () => {
      expect(() => {
        clearCanvas(renderer);
      }).not.toThrow();
    });

    it('should set drawing color without error', () => {
      expect(() => {
        setDrawingColor(renderer, 1.0, 0.0, 0.0, 1.0); // Red
        setDrawingColor(renderer, 0.0, 1.0, 0.0, 0.5); // Green with alpha
        setDrawingColor(renderer, 0.0, 0.0, 1.0);      // Blue (default alpha)
      }).not.toThrow();
    });
  });

  describe('Single Stroke Rendering', () => {
    it('should render horizontal line stroke without error', () => {
      expect(() => {
        setDrawingColor(renderer, 0.0, 0.0, 0.0, 1.0);
        renderStroke(renderer, horizontalLineStroke);
      }).not.toThrow();
    });

    it('should render arc stroke without error', () => {
      expect(() => {
        setDrawingColor(renderer, 0.0, 0.0, 0.0, 1.0);
        renderStroke(renderer, arcStroke);
      }).not.toThrow();
    });

    it('should handle empty stroke without error', () => {
      const emptyStroke: StrokeData = {
        id: 'empty',
        points: [],
        symmetryMode: 'none' as const,
        timestamp: Date.now(),
        completed: true,
      };

      expect(() => {
        renderStroke(renderer, emptyStroke);
      }).not.toThrow();
    });

    it('should handle single point stroke', () => {
      const singlePointStroke: StrokeData = {
        id: 'single-point',
        points: [{ x: 512, y: 512, pressure: 0.8, timestamp: 1000 }],
        symmetryMode: 'none' as const,
        timestamp: Date.now(),
        completed: true,
      };

      expect(() => {
        renderStroke(renderer, singlePointStroke);
      }).not.toThrow();
    });
  });

  describe('Multiple Stroke Rendering', () => {
    it('should render multiple strokes without error', () => {
      const strokes = [horizontalLineStroke, arcStroke];

      expect(() => {
        setDrawingColor(renderer, 0.0, 0.0, 0.0, 1.0);
        renderStrokes(renderer, strokes);
      }).not.toThrow();
    });

    it('should handle empty stroke array', () => {
      expect(() => {
        renderStrokes(renderer, []);
      }).not.toThrow();
    });

    it('should render all test strokes without error', () => {
      expect(() => {
        setDrawingColor(renderer, 0.0, 0.0, 0.0, 1.0);
        renderStrokes(renderer, allTestStrokes);
      }).not.toThrow();
    });
  });

  describe('Point Rendering', () => {
    it('should render strokes as points without error', () => {
      expect(() => {
        clearCanvas(renderer);
        setDrawingColor(renderer, 1.0, 0.0, 0.0, 1.0); // Red points
        renderStrokesAsPoints(renderer, allTestStrokes);
      }).not.toThrow();
    });

    it('should handle empty stroke array for point rendering', () => {
      expect(() => {
        renderStrokesAsPoints(renderer, []);
      }).not.toThrow();
    });
  });

  describe('Test Pattern Rendering', () => {
    it('should render test pattern without error', () => {
      expect(() => {
        renderTestPattern(renderer, allTestStrokes);
      }).not.toThrow();
    });

    it('should handle empty test pattern', () => {
      expect(() => {
        renderTestPattern(renderer, []);
      }).not.toThrow();
    });
  });

  describe('Rendering Consistency', () => {
    it('should produce consistent results with same input', () => {
      const testStroke = horizontalLineStroke;

      // Render the same stroke multiple times
      expect(() => {
        for (let i = 0; i < 5; i++) {
          clearCanvas(renderer);
          setDrawingColor(renderer, 0.0, 0.0, 0.0, 1.0);
          renderStroke(renderer, testStroke);
        }
      }).not.toThrow();
    });

    it('should handle rapid sequential renders without error', () => {
      expect(() => {
        for (let i = 0; i < 10; i++) {
          renderStrokes(renderer, [horizontalLineStroke, arcStroke]);
        }
      }).not.toThrow();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle strokes with extreme coordinates', () => {
      const extremeStroke: StrokeData = {
        id: 'extreme',
        points: [
          { x: 0, y: 0, pressure: 1.0, timestamp: 1000 },
          { x: 1024, y: 1024, pressure: 1.0, timestamp: 1010 },
          { x: -100, y: -100, pressure: 0.1, timestamp: 1020 }, // Outside canvas
          { x: 2000, y: 2000, pressure: 0.1, timestamp: 1030 }, // Outside canvas
        ],
        symmetryMode: 'none' as const,
        timestamp: Date.now(),
        completed: true,
      };

      expect(() => {
        renderStroke(renderer, extremeStroke);
      }).not.toThrow();
    });

    it('should handle strokes with zero pressure', () => {
      const zeroPressureStroke: StrokeData = {
        id: 'zero-pressure',
        points: [
          { x: 100, y: 100, pressure: 0.0, timestamp: 1000 },
          { x: 200, y: 200, pressure: 0.0, timestamp: 1010 },
        ],
        symmetryMode: 'none' as const,
        timestamp: Date.now(),
        completed: true,
      };

      expect(() => {
        renderStroke(renderer, zeroPressureStroke);
      }).not.toThrow();
    });

    it('should handle strokes with maximum pressure', () => {
      const maxPressureStroke: StrokeData = {
        id: 'max-pressure',
        points: [
          { x: 300, y: 300, pressure: 1.0, timestamp: 1000 },
          { x: 400, y: 400, pressure: 1.0, timestamp: 1010 },
        ],
        symmetryMode: 'none' as const,
        timestamp: Date.now(),
        completed: true,
      };

      expect(() => {
        renderStroke(renderer, maxPressureStroke);
      }).not.toThrow();
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large number of strokes efficiently', () => {
      // Create 50 copies of test strokes
      const manyStrokes: StrokeData[] = [];
      for (let i = 0; i < 50; i++) {
        manyStrokes.push(...allTestStrokes);
      }

      expect(() => {
        renderStrokes(renderer, manyStrokes);
      }).not.toThrow();

      expect(manyStrokes.length).toBeGreaterThan(300); // Expect many strokes
    });

    it('should handle strokes with many points', () => {
      // Create a stroke with 1000 points
      const manyPointsStroke: StrokeData = {
        id: 'many-points',
        points: [],
        symmetryMode: 'none' as const,
        timestamp: Date.now(),
        completed: true,
      };

      for (let i = 0; i < 1000; i++) {
        manyPointsStroke.points.push({
          x: 100 + (i * 0.8), // Spread across canvas
          y: 100 + Math.sin(i * 0.1) * 50, // Wavy line
          pressure: 0.5 + Math.sin(i * 0.05) * 0.3, // Varying pressure
          timestamp: 1000 + i,
        });
      }

      expect(() => {
        renderStroke(renderer, manyPointsStroke);
      }).not.toThrow();

      expect(manyPointsStroke.points.length).toBe(1000);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup renderer resources without error', () => {
      expect(() => {
        cleanupRenderer(renderer);
      }).not.toThrow();
    });

    it('should be safe to cleanup multiple times', () => {
      expect(() => {
        cleanupRenderer(renderer);
        cleanupRenderer(renderer); // Should not throw
      }).not.toThrow();
    });
  });
});