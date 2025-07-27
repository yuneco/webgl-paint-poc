// Tests for ReglLineRenderer
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReglLineRenderer, createReglLineRenderer, ReglLineRendererError } from './ReglLineRenderer';
import type { StrokeData } from '../types/core';

describe('ReglLineRenderer', () => {
  let canvas: HTMLCanvasElement;
  let renderer: ReglLineRenderer;

  const createMockStroke = (points: Array<{x: number, y: number, pressure?: number}>): StrokeData => ({
    id: 'test-stroke',
    points: points.map((p, i) => ({
      x: p.x,
      y: p.y,
      pressure: p.pressure ?? 0.5,
      timestamp: Date.now() + i
    })),
    timestamp: Date.now(),
    completed: true
  });

  beforeEach(() => {
    // Create test canvas
    canvas = document.createElement('canvas');
    canvas.id = 'test-canvas';
    canvas.width = 512;
    canvas.height = 512;
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    // Cleanup
    if (renderer) {
      renderer.destroy();
    }
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  });

  it('should create renderer successfully', () => {
    expect(() => {
      renderer = new ReglLineRenderer({ canvas });
    }).not.toThrow();

    expect(renderer).toBeDefined();
    
    const state = renderer.getState();
    expect(state.initialized).toBe(true);
    expect(state.canvasSize).toEqual([512, 512]);
  });

  it('should create renderer via factory function', () => {
    expect(() => {
      renderer = createReglLineRenderer('test-canvas');
    }).not.toThrow();

    expect(renderer).toBeDefined();
    expect(renderer.getState().initialized).toBe(true);
  });

  it('should throw error for non-existent canvas', () => {
    expect(() => {
      renderer = createReglLineRenderer('non-existent-canvas');
    }).toThrow(ReglLineRendererError);
  });

  it('should clear canvas successfully', () => {
    renderer = new ReglLineRenderer({ canvas });
    
    expect(() => {
      renderer.clear();
    }).not.toThrow();
  });

  it('should set brush size and color', () => {
    renderer = new ReglLineRenderer({ canvas });
    
    renderer.setBrushSize(25.2);
    renderer.setDrawingColor(1.0, 0.0, 0.0, 1.0);
    
    const state = renderer.getState();
    expect(state.currentBrushSize).toBe(25.2);
    expect(state.currentColor).toEqual([1.0, 0.0, 0.0, 1.0]);
  });

  it('should enforce minimum brush size', () => {
    renderer = new ReglLineRenderer({ canvas });
    
    renderer.setBrushSize(0.05); // Below minimum
    
    const state = renderer.getState();
    expect(state.currentBrushSize).toBeGreaterThanOrEqual(0.1);
  });

  it('should render a single stroke', () => {
    renderer = new ReglLineRenderer({ canvas });
    
    const stroke = createMockStroke([
      { x: 100, y: 100, pressure: 0.5 },
      { x: 200, y: 200, pressure: 0.7 },
      { x: 300, y: 150, pressure: 0.3 }
    ]);

    expect(() => {
      renderer.renderStroke(stroke);
    }).not.toThrow();
  });

  it('should render multiple strokes', () => {
    renderer = new ReglLineRenderer({ canvas });
    
    const strokes = [
      createMockStroke([
        { x: 100, y: 100 },
        { x: 200, y: 200 }
      ]),
      createMockStroke([
        { x: 300, y: 100 },
        { x: 400, y: 200 }
      ])
    ];

    expect(() => {
      renderer.renderStrokes(strokes);
    }).not.toThrow();
  });

  it('should handle empty stroke gracefully', () => {
    renderer = new ReglLineRenderer({ canvas });
    
    const emptyStroke = createMockStroke([]);

    expect(() => {
      renderer.renderStroke(emptyStroke);
    }).not.toThrow();
  });

  it('should handle single point stroke', () => {
    renderer = new ReglLineRenderer({ canvas });
    
    const singlePointStroke = createMockStroke([
      { x: 256, y: 256, pressure: 0.8 }
    ]);

    expect(() => {
      renderer.renderStroke(singlePointStroke);
    }).not.toThrow();
  });

  it('should throw error when using destroyed renderer', () => {
    renderer = new ReglLineRenderer({ canvas });
    renderer.destroy();
    
    const stroke = createMockStroke([
      { x: 100, y: 100 },
      { x: 200, y: 200 }
    ]);

    expect(() => {
      renderer.renderStroke(stroke);
    }).toThrow(ReglLineRendererError);
  });

  it('should work with pressure variations', () => {
    renderer = new ReglLineRenderer({ canvas });
    renderer.setBrushSize(20);
    
    const stroke = createMockStroke([
      { x: 100, y: 100, pressure: 0.1 }, // Light pressure
      { x: 150, y: 150, pressure: 0.5 }, // Medium pressure
      { x: 200, y: 200, pressure: 1.0 }, // Full pressure
      { x: 250, y: 150, pressure: 0.2 }  // Light pressure
    ]);

    expect(() => {
      renderer.renderStroke(stroke);
    }).not.toThrow();
  });

  it('should handle coordinate edge cases', () => {
    renderer = new ReglLineRenderer({ canvas });
    
    // Test edge coordinates
    const edgeStroke = createMockStroke([
      { x: 0, y: 0 },     // Top-left corner
      { x: 512, y: 512 }, // Bottom-right corner
      { x: 256, y: 256 }  // Center
    ]);

    expect(() => {
      renderer.renderStroke(edgeStroke);
    }).not.toThrow();
  });
});