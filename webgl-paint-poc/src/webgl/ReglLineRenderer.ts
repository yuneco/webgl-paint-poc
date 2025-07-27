// ReglLineRenderer - WebGL line renderer using regl-line for thick lines
// Replaces gl.lineWidth() limitations with triangulated line rendering

import type { StrokeData } from '../types/core';

import regl from 'regl';
import createLineRenderer from 'regl-line';

export interface ReglLineRendererConfig {
  canvas: HTMLCanvasElement;
  antialias?: boolean;
  alpha?: boolean;
  preserveDrawingBuffer?: boolean;
}

export interface LineStyle {
  thickness: number;
  color: [number, number, number, number]; // RGBA 0-1
  join?: 'miter' | 'round' | 'bevel';
  cap?: 'butt' | 'round' | 'square';
  miterLimit?: number;
}

export interface ReglLineData {
  positions: Array<[number, number]>; // WebGL normalized coordinates (-1 to 1)
  style: LineStyle;
}

export class ReglLineRendererError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ReglLineRendererError';
    this.cause = cause;
  }
}

/**
 * ReglLineRenderer - High-performance line renderer using regl-line
 * 
 * Provides thick line rendering capabilities that work around WebGL's
 * gl.lineWidth() limitations by using triangulated geometry.
 */
// Regl type definitions
interface ReglInstance {
  clear(options: { color: [number, number, number, number], depth: number }): void;
  destroy(): void;
  _gl: WebGLRenderingContext;
}

interface LineRenderer {
  setPoints(points: number[][]): void;
  setStyle(style: { thickness: number, color: [number, number, number, number], join: string, cap: string }): void;
  draw(): void;
  destroy?(): void;
}

interface ActiveLineRenderer {
  id: string;
  lineRenderer: LineRenderer;
  strokeData: StrokeData;
}

export class ReglLineRenderer {
  private reglInstance!: ReglInstance;
  private lineRenderer!: LineRenderer;
  private canvas: HTMLCanvasElement;
  private currentBrushSize: number = 10;
  private currentColor: [number, number, number, number] = [0, 0, 0, 1];
  private initialized: boolean = false;
  private frameLoopCancel?: () => void; // Frame loop cancel function
  private activeLineRenderers: ActiveLineRenderer[] = []; // Array to hold active line renderers
  private frameLoopActive: boolean = false; // Track if frame loop is running

  constructor(config: ReglLineRendererConfig) {
    this.canvas = config.canvas;
    this.initialize(config);
  }

  private initialize(config: ReglLineRendererConfig): void {
    try {
      // CRITICAL FIX: Always create fresh context to avoid conflicts
      // The simple test proves regl-line works with fresh context
      console.log('🆕 Creating fresh WebGL context for regl (avoiding conflicts)');
      
      // Create fresh regl context exactly like the working simple test
      this.reglInstance = regl({
        canvas: this.canvas,
        extensions: ['OES_element_index_uint'],
        attributes: {
          antialias: config.antialias ?? true,
          alpha: config.alpha ?? true,
          preserveDrawingBuffer: config.preserveDrawingBuffer ?? false,
        }
      });

      // Create line renderer exactly like the test file
      const lineRenderer = createLineRenderer(this.reglInstance as any);
      if (!lineRenderer) {
        throw new ReglLineRendererError('Failed to create line renderer - createLineRenderer returned null/undefined');
      }
      this.lineRenderer = lineRenderer;
      
      this.initialized = true;
      
      console.log('ReglLineRenderer initialized successfully:', {
        canvasSize: [this.canvas.width, this.canvas.height],
        antialias: config.antialias ?? true,
        alpha: config.alpha ?? true,
      });
    } catch (error) {
      throw new ReglLineRendererError(
        `Failed to initialize ReglLineRenderer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Clear all active strokes (frame loop continues)
   */
  clear(): void {
    this.ensureInitialized();
    
    // Clear all active line renderers
    console.log(`🧹 Clearing ${this.activeLineRenderers.length} active strokes`);
    this.activeLineRenderers.length = 0;
    
    // The frame loop will continue running and show empty canvas
    console.log('✅ Active strokes cleared (frame loop continues)');
  }

  /**
   * Set the brush size for subsequent line rendering
   */
  setBrushSize(size: number): void {
    this.currentBrushSize = Math.max(0.1, size); // Minimum thickness
  }

  /**
   * Set the drawing color for subsequent line rendering
   */
  setDrawingColor(red: number, green: number, blue: number, alpha: number = 1.0): void {
    this.currentColor = [red, green, blue, alpha];
  }

  /**
   * Convert StrokeData to ReglLineData format
   */
  private convertStrokeToReglData(stroke: StrokeData): ReglLineData {
    if (stroke.points.length === 0) {
      throw new ReglLineRendererError('Cannot convert stroke with no points');
    }

    // Convert canvas coordinates (0-1024) to WebGL normalized coordinates (-1 to 1)
    const positions: Array<[number, number]> = stroke.points.map(point => [
      (point.x / 512) - 1,   // Convert from 0-1024 to -1,1
      1 - (point.y / 512)    // Convert from 0-1024 to -1,1 and flip Y
    ]);

    console.log(`🔄 Converting stroke with ${stroke.points.length} points:`, {
      firstPoint: stroke.points[0],
      lastPoint: stroke.points[stroke.points.length - 1],
      firstConverted: positions[0],
      lastConverted: positions[positions.length - 1]
    });

    const style: LineStyle = {
      thickness: this.currentBrushSize,
      color: this.currentColor,
      join: 'round',
      cap: 'round'
    };

    return { positions, style };
  }

  /**
   * Render a single stroke using regl-line
   */
  renderStroke(stroke: StrokeData): void {
    this.ensureInitialized();
    
    if (stroke.points.length === 0) {
      return; // Nothing to draw
    }

    // Use original stroke rendering for individual strokes
    const reglData = this.convertStrokeToReglData(stroke);
    this.drawLine(reglData);
  }

  /**
   * Render multiple strokes using persistent frame loop
   */
  renderStrokes(strokes: StrokeData[]): void {
    this.ensureInitialized();
    
    if (strokes.length === 0) {
      this.clear();
      return;
    }

    console.log(`🎯 Adding ${strokes.length} strokes to active renderer`);
    
    try {
      // Clear existing strokes
      this.activeLineRenderers.length = 0;
      
      // Create line renderers for all strokes
      for (let i = 0; i < strokes.length; i++) {
        const stroke = strokes[i];
        const reglData = this.convertStrokeToReglData(stroke);
        
        // Convert positions to flat array format
        const flatPoints: number[] = [];
        for (const pos of reglData.positions) {
          flatPoints.push(pos[0], pos[1]);
        }
        
        console.log(`🧪 Creating line renderer ${i + 1}/${strokes.length} with ${flatPoints.length/2} points`);
        
        // Create line using official Getting Started pattern
        const lineRenderer = createLineRenderer(this.reglInstance, {
          width: reglData.style.thickness,
          color: reglData.style.color,
          is2d: true,
          points: flatPoints
        });
        
        // Add to active renderers
        this.activeLineRenderers.push({
          id: stroke.id,
          lineRenderer,
          strokeData: stroke
        });
      }
      
      // Start frame loop if not already running
      if (!this.frameLoopActive) {
        this.startFrameLoop();
      }
      
      console.log(`✅ ${strokes.length} strokes added to active renderer`);
      
    } catch (error) {
      console.error('❌ Failed to add strokes to active renderer:', error);
      
      // Fallback to individual stroke rendering
      this.reglInstance.clear({
        color: [1, 1, 1, 1],
        depth: 1
      });
      
      for (const stroke of strokes) {
        this.renderStroke(stroke);
      }
    }
  }

  /**
   * Start the persistent frame loop
   */
  private startFrameLoop(): void {
    if (this.frameLoopActive) {
      return; // Already running
    }
    
    console.log('🚀 Starting persistent frame loop');
    
    this.frameLoopCancel = this.reglInstance.frame(() => {
      // Clear canvas
      this.reglInstance.clear({ color: [1, 1, 1, 1], depth: 1 });
      
      // Draw all active line renderers
      for (const activeRenderer of this.activeLineRenderers) {
        activeRenderer.lineRenderer.draw();
      }
    });
    
    this.frameLoopActive = true;
    console.log('✅ Persistent frame loop started');
  }

  /**
   * Draw a line using regl-line with specified data
   */
  private drawLine(data: ReglLineData): void {
    if (data.positions.length < 2) {
      // Handle single point as a small circle
      if (data.positions.length === 1) {
        this.drawPoint(data.positions[0], data.style);
      }
      return;
    }

    try {
      console.log('🎨 Drawing single line - NO CLEAR:');
      console.log('  positions:', data.positions);
      console.log('  thickness:', data.style.thickness);
      
      // DO NOT CLEAR - let the caller handle clearing
      
      // Use exactly the same pattern as the working test file
      this.lineRenderer.setPoints(data.positions);
      this.lineRenderer.setStyle({
        thickness: data.style.thickness,
        color: data.style.color,
        join: 'round',
        cap: 'round'
      });
      this.lineRenderer.draw();
      
      console.log('✅ Single line drawn - no clear');
      
    } catch (error) {
      console.error('❌ Failed to draw line:', error);
      throw new ReglLineRendererError(
        `Failed to draw line: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Draw a single point as a small circle
   */
  private drawPoint(position: [number, number], style: LineStyle): void {
    // Create a small circle by drawing a line with the same start and end point
    // This is a fallback for single-point strokes
    const radius = style.thickness * 0.01; // Scale radius to NDC coordinates
    const circlePoints: Array<[number, number]> = [];
    
    // Generate circle points
    const segments = 12;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = position[0] + Math.cos(angle) * radius;
      const y = position[1] + Math.sin(angle) * radius;
      circlePoints.push([x, y]);
    }
    
    this.lineRenderer.setPoints(circlePoints);
    this.lineRenderer.setStyle({
      thickness: 2, // Small thickness for the circle outline
      color: style.color,
      join: 'round',
      cap: 'round'
    });
    this.lineRenderer.draw();
  }

  /**
   * Get current renderer state for debugging
   */
  getState() {
    return {
      initialized: this.initialized,
      canvasSize: [this.canvas.width, this.canvas.height],
      currentBrushSize: this.currentBrushSize,
      currentColor: this.currentColor,
    };
  }

  /**
   * Cleanup renderer resources
   */
  destroy(): void {
    if (!this.initialized) {
      return; // Already destroyed
    }
    
    // Stop frame loop first
    if (this.frameLoopCancel) {
      console.log('🛑 Stopping frame loop during destroy');
      this.frameLoopCancel();
      this.frameLoopCancel = undefined;
      this.frameLoopActive = false;
    }
    
    try {
      if (this.lineRenderer && this.lineRenderer.destroy) {
        this.lineRenderer.destroy();
      }
    } catch (error) {
      console.warn('Error destroying line renderer:', error);
    }
    
    try {
      if (this.reglInstance && this.reglInstance.destroy) {
        this.reglInstance.destroy();
      }
    } catch (error) {
      console.warn('Error destroying regl instance:', error);
    }
    
    this.initialized = false;
    console.log('ReglLineRenderer destroyed');
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new ReglLineRendererError('ReglLineRenderer not initialized');
    }
  }
}

/**
 * Factory function to create ReglLineRenderer instance
 */
export function createReglLineRenderer(canvasId: string): ReglLineRenderer {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) {
    throw new ReglLineRendererError(`Canvas element with id "${canvasId}" not found`);
  }

  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new ReglLineRendererError(`Element with id "${canvasId}" is not a canvas`);
  }

  return new ReglLineRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: false
  });
}