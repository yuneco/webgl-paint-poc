// Renderer Adapter - Unified interface for WebGL and ReglLine renderers
// Provides consistent API for both rendering backends

import { WebGLRenderer } from './WebGLRenderer';
import { ReglLineRenderer } from './ReglLineRenderer';
import type { StrokeData } from '../types/core';

export type RendererType = 'webgl' | 'regl-line';

export interface RendererAdapter {
  clear(): void;
  renderStroke(stroke: StrokeData): void;
  renderStrokes(strokes: StrokeData[]): void;
  renderStrokesAsPoints(strokes: StrokeData[]): void;
  setDrawingColor(r: number, g: number, b: number, a?: number): void;
  setBrushSize(size: number): void;
  getCanvas(): HTMLCanvasElement;
  cleanup(): void;
  getRendererType(): RendererType;
  getRendererInfo(): RendererInfo;
}

export interface RendererInfo {
  type: RendererType;
  supportsThickLines: boolean;
  lineWidthRange: [number, number];
  features: string[];
}

/**
 * WebGL Renderer Adapter (uses gl.lineWidth - limited to 1px)
 */
export class WebGLRendererAdapter implements RendererAdapter {
  private renderer: WebGLRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer(canvas);
  }

  clear(): void {
    this.renderer.clear();
  }

  renderStroke(stroke: StrokeData): void {
    this.renderer.renderStroke(stroke);
  }

  renderStrokes(strokes: StrokeData[]): void {
    this.renderer.renderStrokes(strokes);
  }

  renderStrokesAsPoints(strokes: StrokeData[]): void {
    this.renderer.renderStrokesAsPoints(strokes);
  }

  setDrawingColor(r: number, g: number, b: number, a: number = 1.0): void {
    this.renderer.setDrawingColor(r, g, b, a);
  }

  setBrushSize(size: number): void {
    this.renderer.setBrushSize(size);
  }

  getCanvas(): HTMLCanvasElement {
    return this.renderer.getCanvas();
  }

  cleanup(): void {
    this.renderer.cleanup();
  }

  getRendererType(): RendererType {
    return 'webgl';
  }

  getRendererInfo(): RendererInfo {
    return {
      type: 'webgl',
      supportsThickLines: false,
      lineWidthRange: [1, 1], // WebGL limitation
      features: [
        'gl.LINE_STRIP rendering',
        'Point sprites for single points', 
        'Limited to 1px line width',
        'Hardware accelerated'
      ]
    };
  }
}

/**
 * Regl-Line Renderer Adapter (supports true thick lines via triangulation)
 */
export class ReglLineRendererAdapter implements RendererAdapter {
  private renderer: ReglLineRenderer;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new ReglLineRenderer({ canvas });
  }

  clear(): void {
    this.renderer.clear();
  }

  renderStroke(stroke: StrokeData): void {
    this.renderer.renderStroke(stroke);
  }

  renderStrokes(strokes: StrokeData[]): void {
    this.renderer.renderStrokes(strokes);
  }

  renderStrokesAsPoints(strokes: StrokeData[]): void {
    // ReglLineRenderer handles single points as small circles
    // For multiple points, render each as a single-point stroke
    for (const stroke of strokes) {
      for (const point of stroke.points) {
        const singlePointStroke: StrokeData = {
          id: `point-${stroke.id}-${point.timestamp}`,
          points: [point],
          timestamp: point.timestamp,
          completed: true
        };
        this.renderer.renderStroke(singlePointStroke);
      }
    }
  }

  setDrawingColor(r: number, g: number, b: number, a: number = 1.0): void {
    this.renderer.setDrawingColor(r, g, b, a);
  }

  setBrushSize(size: number): void {
    this.renderer.setBrushSize(size);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  cleanup(): void {
    this.renderer.destroy();
  }

  getRendererType(): RendererType {
    return 'regl-line';
  }

  getRendererInfo(): RendererInfo {
    return {
      type: 'regl-line',
      supportsThickLines: true,
      lineWidthRange: [0.1, 1000], // Practical range
      features: [
        'Triangulated line rendering',
        'True thick line support',
        'Pressure-sensitive thickness',
        'Anti-aliased lines',
        'Round/square line caps',
        'Miter/round/bevel line joins'
      ]
    };
  }
}

/**
 * Factory function to create renderer adapter
 */
export function createRendererAdapter(
  canvas: HTMLCanvasElement, 
  type: RendererType = 'webgl'
): RendererAdapter {
  switch (type) {
    case 'webgl':
      console.log('⚠️ WebGL renderer temporarily disabled to avoid interference with regl-line');
      // Temporarily disable WebGL renderer to avoid interference
      return new ReglLineRendererAdapter(canvas);
    case 'regl-line':
      return new ReglLineRendererAdapter(canvas);
    default:
      throw new Error(`Unknown renderer type: ${type}`);
  }
}

/**
 * Get available renderer types
 */
export function getAvailableRendererTypes(): RendererType[] {
  return ['webgl', 'regl-line'];
}

/**
 * Compare renderer capabilities
 */
export function compareRenderers(): { webgl: RendererInfo; reglLine: RendererInfo } {
  // Create temporary canvas for testing
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 1;
  tempCanvas.height = 1;
  
  const webglAdapter = new WebGLRendererAdapter(tempCanvas);
  const reglAdapter = new ReglLineRendererAdapter(tempCanvas);
  
  const comparison = {
    webgl: webglAdapter.getRendererInfo(),
    reglLine: reglAdapter.getRendererInfo()
  };
  
  // Cleanup
  webglAdapter.cleanup();
  reglAdapter.cleanup();
  
  return comparison;
}