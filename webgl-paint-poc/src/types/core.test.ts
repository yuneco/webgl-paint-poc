import { describe, it, expect } from 'vitest';
import * as CoreTypes from './core';

// Extract types for convenience
type StrokePoint = CoreTypes.StrokePoint;
type StrokeData = CoreTypes.StrokeData;
type SymmetryConfig = CoreTypes.SymmetryConfig;
type ViewState = CoreTypes.ViewState;
type VertexData = CoreTypes.VertexData;
type AppState = CoreTypes.AppState;

const {
  SymmetryMode,
  CANVAS_SIZE,
  SYMMETRY_ORIGIN,
  SYMMETRY_AXIS_COUNT,
  DEFAULT_SYMMETRY_CONFIG,
  DEFAULT_VIEW_STATE,
  DEFAULT_DRAWING_STATE,
} = CoreTypes;

describe('Core Types', () => {
  describe('StrokePoint', () => {
    it('should create valid stroke point', () => {
      const point: StrokePoint = {
        x: 100,
        y: 200,
        pressure: 0.5,
        timestamp: Date.now(),
      };

      expect(point.x).toBe(100);
      expect(point.y).toBe(200);
      expect(point.pressure).toBe(0.5);
      expect(typeof point.timestamp).toBe('number');
    });

    it('should validate canvas coordinates range', () => {
      const point: StrokePoint = {
        x: 512,
        y: 512,
        pressure: 1.0,
        timestamp: Date.now(),
      };

      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1024);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(1024);
      expect(point.pressure).toBeGreaterThanOrEqual(0.0);
      expect(point.pressure).toBeLessThanOrEqual(1.0);
    });
  });

  describe('StrokeData', () => {
    it('should create valid stroke data', () => {
      const stroke: StrokeData = {
        id: 'stroke-1',
        points: [
          { x: 100, y: 100, pressure: 0.5, timestamp: Date.now() },
          { x: 200, y: 200, pressure: 0.7, timestamp: Date.now() + 10 },
        ],
        symmetryMode: SymmetryMode.RADIAL_8,
        timestamp: Date.now(),
        completed: false,
      };

      expect(stroke.id).toBe('stroke-1');
      expect(stroke.points).toHaveLength(2);
      expect(stroke.symmetryMode).toBe(SymmetryMode.RADIAL_8);
      expect(typeof stroke.completed).toBe('boolean');
    });
  });

  describe('SymmetryConfig', () => {
    it('should create valid symmetry config', () => {
      const config: SymmetryConfig = {
        mode: SymmetryMode.RADIAL_8,
        origin: { x: 512, y: 512 },
        axisCount: 8,
      };

      expect(config.mode).toBe(SymmetryMode.RADIAL_8);
      expect(config.origin).toEqual({ x: 512, y: 512 });
      expect(config.axisCount).toBe(8);
    });
  });

  describe('ViewState', () => {
    it('should create valid view state', () => {
      const viewState: ViewState = {
        zoomLevel: 1.5,
        panOffset: { x: 10, y: 20 },
        canvasSize: { width: 1024, height: 1024 },
        tilingEnabled: true,
        transform: {
          zoom: 1.5,
          panOffset: { canvasX: 10, canvasY: 20 },
          rotation: 0,
        },
      };

      expect(viewState.zoomLevel).toBe(1.5);
      expect(viewState.panOffset).toEqual({ x: 10, y: 20 });
      expect(viewState.canvasSize).toEqual({ width: 1024, height: 1024 });
      expect(viewState.tilingEnabled).toBe(true);
    });
  });

  describe('VertexData', () => {
    it('should create valid vertex data', () => {
      const vertex: VertexData = {
        position: [0.5, -0.3],
        pressure: 0.8,
        symmetryIndex: 3,
      };

      expect(vertex.position).toEqual([0.5, -0.3]);
      expect(vertex.pressure).toBe(0.8);
      expect(vertex.symmetryIndex).toBe(3);
      expect(vertex.symmetryIndex).toBeGreaterThanOrEqual(0);
      expect(vertex.symmetryIndex).toBeLessThan(8);
    });
  });

  describe('Constants', () => {
    it('should have correct constant values', () => {
      expect(CANVAS_SIZE).toBe(1024);
      expect(SYMMETRY_ORIGIN).toEqual({ x: 512, y: 512 });
      expect(SYMMETRY_AXIS_COUNT).toBe(8);
    });
  });

  describe('Default Configurations', () => {
    it('should have valid default symmetry config', () => {
      expect(DEFAULT_SYMMETRY_CONFIG.mode).toBe(SymmetryMode.RADIAL_8);
      expect(DEFAULT_SYMMETRY_CONFIG.origin).toEqual(SYMMETRY_ORIGIN);
      expect(DEFAULT_SYMMETRY_CONFIG.axisCount).toBe(SYMMETRY_AXIS_COUNT);
    });

    it('should have valid default view state', () => {
      expect(DEFAULT_VIEW_STATE.zoomLevel).toBe(1.0);
      expect(DEFAULT_VIEW_STATE.panOffset).toEqual({ x: 0, y: 0 });
      expect(DEFAULT_VIEW_STATE.canvasSize).toEqual({ 
        width: CANVAS_SIZE, 
        height: CANVAS_SIZE 
      });
      expect(DEFAULT_VIEW_STATE.tilingEnabled).toBe(false);
    });

    it('should have valid default drawing state', () => {
      expect(DEFAULT_DRAWING_STATE.currentStroke).toEqual([]);
      expect(DEFAULT_DRAWING_STATE.completedStrokes).toEqual([]);
      expect(DEFAULT_DRAWING_STATE.symmetryConfig).toEqual(DEFAULT_SYMMETRY_CONFIG);
      expect(DEFAULT_DRAWING_STATE.isDrawing).toBe(false);
    });
  });

  describe('Type Composition', () => {
    it('should create complete app state', () => {
      const appState: AppState = {
        drawing: DEFAULT_DRAWING_STATE,
        view: DEFAULT_VIEW_STATE,
        performance: {
          fps: 60,
          memoryUsage: {
            usedJSHeapSize: 1000000,
            totalJSHeapSize: 2000000,
            jsHeapSizeLimit: 4000000,
            webglMemoryUsage: 500000,
          },
          inputLatency: 12,
          frameMetrics: {
            renderTime: 8,
            bufferUpdateTime: 2,
            totalFrameTime: 16,
          },
        },
      };

      expect(appState.drawing).toBeDefined();
      expect(appState.view).toBeDefined();
      expect(appState.performance).toBeDefined();
      expect(appState.performance.fps).toBe(60);
    });
  });
});