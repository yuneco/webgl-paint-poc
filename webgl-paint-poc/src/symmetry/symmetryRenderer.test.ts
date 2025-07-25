import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as SymmetryRenderer from './symmetryRenderer';
import * as CoreTypes from '../types/core';
import * as Transform from './transform';
import { initializeRenderer, cleanupRenderer } from '../webgl/renderer';
import type { WebGLRenderer } from '../webgl/renderer';

type StrokeData = CoreTypes.StrokeData;
type StrokePoint = CoreTypes.StrokePoint;

describe('Symmetry Renderer (Browser Mode)', () => {
  let canvas: HTMLCanvasElement;
  let renderer: WebGLRenderer;

  beforeEach(() => {
    // Create a fresh canvas for each test (required by Vitest browser mode)
    canvas = document.createElement('canvas');
    canvas.id = 'symmetry-test-canvas';
    canvas.width = 1024;
    canvas.height = 1024;
    document.body.appendChild(canvas);
    
    renderer = initializeRenderer('symmetry-test-canvas');
    console.log('Setting up symmetry renderer test environment');
  });

  afterEach(() => {
    if (renderer) {
      cleanupRenderer(renderer);
    }
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
    console.log('Cleaning up symmetry renderer test environment');
  });

  describe('Symmetric Stroke Generation', () => {
    it('should generate 8 symmetric strokes from a single stroke', () => {
      const originalStroke: StrokeData = {
        id: 'test-stroke-1',
        points: [
          { x: 612, y: 512, pressure: 1.0, timestamp: 1000 },
          { x: 612, y: 412, pressure: 0.8, timestamp: 1010 },
          { x: 612, y: 312, pressure: 0.6, timestamp: 1020 }
        ],
        timestamp: 1000,
        metadata: { type: 'test' }
      };

      const result = SymmetryRenderer.generateSymmetricStrokes(originalStroke);
      
      expect(result.symmetricStrokes).toHaveLength(8);
      expect(result.axisCount).toBe(8);
      expect(result.original).toEqual(originalStroke);
      
      // Each symmetric stroke should have same number of points
      result.symmetricStrokes.forEach(stroke => {
        expect(stroke.points).toHaveLength(3);
      });
    });

    it('should preserve pressure and timestamp in symmetric strokes', () => {
      const originalStroke: StrokeData = {
        id: 'pressure-test',
        points: [
          { x: 600, y: 400, pressure: 0.75, timestamp: 5000 }
        ],
        timestamp: 5000,
        metadata: {}
      };

      const result = SymmetryRenderer.generateSymmetricStrokes(originalStroke);
      
      result.symmetricStrokes.forEach(stroke => {
        stroke.points.forEach(point => {
          expect(point.pressure).toBe(0.75);
          expect(point.timestamp).toBe(5000);
        });
      });
    });

    it('should generate symmetric strokes for multiple input strokes', () => {
      const strokes: StrokeData[] = [
        {
          id: 'stroke-1',
          points: [{ x: 612, y: 512, pressure: 1.0, timestamp: 1000 }],
          timestamp: 1000,
          metadata: {}
        },
        {
          id: 'stroke-2', 
          points: [{ x: 512, y: 412, pressure: 0.8, timestamp: 2000 }],
          timestamp: 2000,
          metadata: {}
        }
      ];

      const allSymmetricStrokes = SymmetryRenderer.generateAllSymmetricStrokes(strokes);
      
      // Should have 8 strokes for each input (2 input * 8 axes = 16 total)
      expect(allSymmetricStrokes).toHaveLength(16);
    });
  });

  describe('Symmetry Point Generation', () => {
    it('should generate 8 symmetric points from single point', () => {
      const originalPoint: Transform.Point2D = { x: 612, y: 412 };
      const strokePoint: StrokePoint = { x: originalPoint.x, y: originalPoint.y, pressure: 1.0, timestamp: 1000 };
      const symmetricPoints = SymmetryRenderer.generateSymmetricPoints(strokePoint, 8);
      
      expect(symmetricPoints).toHaveLength(8);
      
      // All points should be equidistant from center
      const centerDistance = Math.sqrt(
        Math.pow(originalPoint.x - Transform.SYMMETRY_CENTER.x, 2) + 
        Math.pow(originalPoint.y - Transform.SYMMETRY_CENTER.y, 2)
      );
      
      symmetricPoints.forEach(point => {
        const distance = Math.sqrt(
          Math.pow(point.x - Transform.SYMMETRY_CENTER.x, 2) + 
          Math.pow(point.y - Transform.SYMMETRY_CENTER.y, 2)
        );
        expect(distance).toBeCloseTo(centerDistance, 1);
      });
    });

    it('should generate 8 symmetric stroke points from single stroke point', () => {
      const originalStrokePoint: StrokePoint = {
        x: 600,
        y: 500, 
        pressure: 0.9,
        timestamp: 3000
      };
      
      const symmetricStrokePoints = SymmetryRenderer.generateSymmetricPoints(originalStrokePoint, 8);
      
      expect(symmetricStrokePoints).toHaveLength(8);
      
      // All should preserve pressure and timestamp
      symmetricStrokePoints.forEach(point => {
        expect(point.pressure).toBe(0.9);
        expect(point.timestamp).toBe(3000);
      });
    });
  });

  describe('Symmetry Consistency Tests', () => {
    it('should maintain consistent distances from center', () => {
      const testPoints: Transform.Point2D[] = [
        { x: 612, y: 512 }, // Right
        { x: 512, y: 412 }, // Up  
        { x: 412, y: 512 }, // Left
        { x: 512, y: 612 }, // Down
        { x: 700, y: 300 }  // Diagonal
      ];
      
      testPoints.forEach(point => {
        const isConsistent = SymmetryRenderer.testSymmetryConsistency(point);
        expect(isConsistent).toBe(true);
      });
    });

    it('should handle center point correctly', () => {
      const centerPoint = Transform.SYMMETRY_CENTER;
      const isConsistent = SymmetryRenderer.testSymmetryConsistency(centerPoint);
      expect(isConsistent).toBe(true);
      
      // Center point should generate 8 identical points
      const strokePoint: StrokePoint = { x: centerPoint.x, y: centerPoint.y, pressure: 1.0, timestamp: 1000 };
      const symmetricPoints = SymmetryRenderer.generateSymmetricPoints(strokePoint, 8);
      symmetricPoints.forEach(point => {
        expect(point.x).toBeCloseTo(512, 1);
        expect(point.y).toBeCloseTo(512, 1);
      });
    });

    it('should handle axis count changes correctly', () => {
      const testStroke: StrokeData = {
        id: 'axis-count-test',
        points: [{ x: 600, y: 400, pressure: 1.0, timestamp: 1000 }],
        timestamp: 1000,
        metadata: {}
      };

      // Compare different axis counts
      const comparison = SymmetryRenderer.compareAxisCountResults(testStroke, 4, 8);
      
      expect(comparison.result1.axisCount).toBe(4);
      expect(comparison.result2.axisCount).toBe(8);
      expect(comparison.result1.symmetricStrokes).toHaveLength(4);
      expect(comparison.result2.symmetricStrokes).toHaveLength(8);
      expect(comparison.different).toBe(true);
    });
  });

  describe('Symmetry Config and Control', () => {
    it('should handle symmetry config properly', () => {
      const stroke: StrokeData = {
        id: 'config-test',
        points: [{ x: 600, y: 400, pressure: 1.0, timestamp: 1000 }],
        timestamp: 1000,
        metadata: {}
      };

      // Test with symmetry disabled
      const disabledConfig: SymmetryRenderer.SymmetryConfig = {
        enabled: false,
        axisCount: 8,
        centerPoint: Transform.SYMMETRY_CENTER
      };

      // Should not throw errors (visual test would be needed to verify no symmetry)
      expect(() => {
        SymmetryRenderer.renderStrokeWithSymmetry(renderer, stroke, disabledConfig);
      }).not.toThrow();

      // Test with symmetry enabled
      const enabledConfig: SymmetryRenderer.SymmetryConfig = {
        enabled: true,
        axisCount: 8,
        centerPoint: Transform.SYMMETRY_CENTER
      };

      expect(() => {
        SymmetryRenderer.renderStrokeWithSymmetry(renderer, stroke, enabledConfig);
      }).not.toThrow();
    });

    it('should provide symmetry information correctly', () => {
      const info = SymmetryRenderer.getSymmetryInfo();
      
      expect(info.axisCount).toBe(8);
      expect(info.axisAngles).toHaveLength(8);
      expect(info.centerPoint.x).toBe(512);
      expect(info.centerPoint.y).toBe(512);
      
      // Check that we have 8 angles and they are valid
      expect(info.axisAngles).toHaveLength(8);
      
      // Verify that all angles are finite numbers
      info.axisAngles.forEach(angle => {
        expect(typeof angle).toBe('number');
        expect(isFinite(angle)).toBe(true);
      });
      
      // Check that angles are within valid range [0, 2π)
      info.axisAngles.forEach(angle => {
        expect(angle).toBeGreaterThanOrEqual(0);
        expect(angle).toBeLessThan(2 * Math.PI);
      });
    });
  });

  describe('Integration with WebGL Renderer', () => {
    it('should render symmetric strokes without errors', () => {
      const testStroke: StrokeData = {
        id: 'render-test',
        points: [
          { x: 612, y: 512, pressure: 1.0, timestamp: 1000 },
          { x: 612, y: 412, pressure: 0.8, timestamp: 1010 }
        ],
        timestamp: 1000,
        metadata: {}
      };

      // Test single stroke rendering
      expect(() => {
        SymmetryRenderer.renderStrokeWithSymmetry(renderer, testStroke);
      }).not.toThrow();

      // Test multiple strokes rendering
      expect(() => {
        SymmetryRenderer.renderStrokesWithSymmetry(renderer, [testStroke]);
      }).not.toThrow();
    });

    it('should handle empty stroke arrays', () => {
      expect(() => {
        SymmetryRenderer.renderStrokesWithSymmetry(renderer, []);
      }).not.toThrow();

      expect(() => {
        SymmetryRenderer.generateAllSymmetricStrokes([]);
      }).not.toThrow();

      const emptyResult = SymmetryRenderer.generateAllSymmetricStrokes([]);
      expect(emptyResult).toHaveLength(0);
    });
  });

  describe('Mathematical Properties', () => {
    it('should preserve stroke properties in symmetry generation', () => {
      const originalStroke: StrokeData = {
        id: 'property-test',
        points: [
          { x: 600, y: 500, pressure: 0.7, timestamp: 2000 },
          { x: 620, y: 480, pressure: 0.9, timestamp: 2010 }
        ],
        timestamp: 2000,
        metadata: { color: 'red', lineWidth: 5 }
      };

      const result = SymmetryRenderer.generateSymmetricStrokes(originalStroke);
      
      // Each symmetric stroke should preserve original metadata
      result.symmetricStrokes.forEach(stroke => {
        expect(stroke.timestamp).toBe(2000);
      });
    });

    it('should generate unique positions for non-center points', () => {
      const testPoint: Transform.Point2D = { x: 612, y: 412 }; // Off-center
      const strokePoint: StrokePoint = { x: testPoint.x, y: testPoint.y, pressure: 1.0, timestamp: 1000 };
      const symmetricPoints = SymmetryRenderer.generateSymmetricPoints(strokePoint, 8);
      
      // Convert to rounded coordinates for uniqueness check
      const uniqueCoords = new Set(
        symmetricPoints.map(p => `${Math.round(p.x)},${Math.round(p.y)}`)
      );
      
      // Should have multiple unique positions (exact count depends on symmetry)
      expect(uniqueCoords.size).toBeGreaterThanOrEqual(4);
      expect(uniqueCoords.size).toBeLessThanOrEqual(8);
    });
  });
});