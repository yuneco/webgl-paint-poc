import { describe, it, expect } from 'vitest';
import {
  horizontalLineStroke,
  verticalLineStroke,
  diagonalLineStroke,
  arcStroke,
  complexCurveStroke,
  spiralStroke,
  zigzagStroke,
  allTestStrokes,
  testPatterns,
  validateStrokeData,
  getStrokeStats,
} from './testStrokes';
import * as CoreTypes from '../types/core';

const SymmetryMode = CoreTypes.SymmetryMode;

describe('Test Stroke Data', () => {
  describe('Individual Test Strokes', () => {
    it('should create valid horizontal line stroke', () => {
      expect(horizontalLineStroke.id).toBe('test-horizontal-line');
      expect(horizontalLineStroke.points).toHaveLength(7);
      expect(horizontalLineStroke.symmetryMode).toBe(SymmetryMode.RADIAL_8);
      expect(horizontalLineStroke.completed).toBe(true);
      
      // Check that all points have same Y coordinate (horizontal line)
      const yCoord = horizontalLineStroke.points[0].y;
      horizontalLineStroke.points.forEach(point => {
        expect(point.y).toBe(yCoord);
        expect(point.y).toBe(512); // Center line
      });
      
      // Check X coordinates are increasing
      for (let i = 1; i < horizontalLineStroke.points.length; i++) {
        expect(horizontalLineStroke.points[i].x).toBeGreaterThan(
          horizontalLineStroke.points[i - 1].x
        );
      }
    });

    it('should create valid vertical line stroke', () => {
      expect(verticalLineStroke.id).toBe('test-vertical-line');
      expect(verticalLineStroke.points).toHaveLength(7);
      
      // Check that all points have same X coordinate (vertical line)
      const xCoord = verticalLineStroke.points[0].x;
      verticalLineStroke.points.forEach(point => {
        expect(point.x).toBe(xCoord);
        expect(point.x).toBe(512); // Center line
      });
      
      // Check Y coordinates are increasing
      for (let i = 1; i < verticalLineStroke.points.length; i++) {
        expect(verticalLineStroke.points[i].y).toBeGreaterThan(
          verticalLineStroke.points[i - 1].y
        );
      }
    });

    it('should create valid diagonal line stroke', () => {
      expect(diagonalLineStroke.id).toBe('test-diagonal-line');
      expect(diagonalLineStroke.points).toHaveLength(7);
      
      // Check diagonal progression (equal X and Y increments)
      const firstPoint = diagonalLineStroke.points[0];
      expect(firstPoint.x).toBe(512);
      expect(firstPoint.y).toBe(512);
      
      for (let i = 1; i < diagonalLineStroke.points.length; i++) {
        const point = diagonalLineStroke.points[i];
        const prev = diagonalLineStroke.points[i - 1];
        const deltaX = point.x - prev.x;
        const deltaY = point.y - prev.y;
        
        // Should be equal increments for diagonal line
        expect(Math.abs(deltaX - deltaY)).toBeLessThan(0.1);
      }
    });

    it('should create valid arc stroke', () => {
      expect(arcStroke.id).toBe('test-arc');
      expect(arcStroke.points.length).toBeGreaterThan(10);
      
      // Arc should start and end at specific positions
      const firstPoint = arcStroke.points[0];
      const lastPoint = arcStroke.points[arcStroke.points.length - 1];
      
      // First point should be at (612, 512) - center + radius
      expect(Math.abs(firstPoint.x - 612)).toBeLessThan(1);
      expect(Math.abs(firstPoint.y - 512)).toBeLessThan(1);
      
      // All points should be roughly 100 pixels from center (512, 512)
      arcStroke.points.forEach(point => {
        const distance = Math.sqrt(
          Math.pow(point.x - 512, 2) + Math.pow(point.y - 512, 2)
        );
        expect(distance).toBeGreaterThan(95);
        expect(distance).toBeLessThan(105);
      });
    });

    it('should create valid complex curve stroke', () => {
      expect(complexCurveStroke.id).toBe('test-complex-curve');
      expect(complexCurveStroke.points.length).toBeGreaterThan(20);
      
      // Should span from x=300 to x=700
      const firstPoint = complexCurveStroke.points[0];
      const lastPoint = complexCurveStroke.points[complexCurveStroke.points.length - 1];
      
      expect(firstPoint.x).toBe(300);
      expect(lastPoint.x).toBe(700);
      
      // Y should oscillate around 512
      let hasPointsAbove512 = false;
      let hasPointsBelow512 = false;
      
      complexCurveStroke.points.forEach(point => {
        if (point.y > 512) hasPointsAbove512 = true;
        if (point.y < 512) hasPointsBelow512 = true;
      });
      
      expect(hasPointsAbove512).toBe(true);
      expect(hasPointsBelow512).toBe(true);
    });

    it('should create valid spiral stroke', () => {
      expect(spiralStroke.id).toBe('test-spiral');
      expect(spiralStroke.points.length).toBeGreaterThan(30);
      
      // Distance from center should increase over time
      for (let i = 1; i < spiralStroke.points.length; i++) {
        const currentPoint = spiralStroke.points[i];
        const prevPoint = spiralStroke.points[i - 1];
        
        const currentDistance = Math.sqrt(
          Math.pow(currentPoint.x - 512, 2) + Math.pow(currentPoint.y - 512, 2)
        );
        const prevDistance = Math.sqrt(
          Math.pow(prevPoint.x - 512, 2) + Math.pow(prevPoint.y - 512, 2)
        );
        
        expect(currentDistance).toBeGreaterThanOrEqual(prevDistance - 1); // Allow small variations
      }
    });

    it('should create valid zigzag stroke', () => {
      expect(zigzagStroke.id).toBe('test-zigzag');
      expect(zigzagStroke.points.length).toBeGreaterThan(10);
      
      // Should alternate above and below center line
      let alternatingPattern = true;
      for (let i = 1; i < zigzagStroke.points.length - 1; i++) {
        const current = zigzagStroke.points[i].y;
        const prev = zigzagStroke.points[i - 1].y;
        const next = zigzagStroke.points[i + 1].y;
        
        // Check for alternating pattern (peak or valley)
        if (!((current > prev && current > next) || (current < prev && current < next))) {
          // Allow some exceptions for transition points
          if (i % 2 !== 0) {
            alternatingPattern = false;
          }
        }
      }
      
      expect(alternatingPattern).toBe(true);
    });
  });

  describe('Test Patterns Collections', () => {
    it('should contain correct number of strokes in each pattern', () => {
      expect(testPatterns.singleStrokes).toHaveLength(3);
      expect(testPatterns.curvedStrokes).toHaveLength(3);
      expect(testPatterns.angularStrokes).toHaveLength(1);
      expect(testPatterns.allStrokes).toHaveLength(7);
    });

    it('should have all strokes in allTestStrokes array', () => {
      expect(allTestStrokes).toHaveLength(7);
      expect(allTestStrokes).toContain(horizontalLineStroke);
      expect(allTestStrokes).toContain(verticalLineStroke);
      expect(allTestStrokes).toContain(diagonalLineStroke);
      expect(allTestStrokes).toContain(arcStroke);
      expect(allTestStrokes).toContain(complexCurveStroke);
      expect(allTestStrokes).toContain(spiralStroke);
      expect(allTestStrokes).toContain(zigzagStroke);
    });
  });

  describe('Validation Functions', () => {
    it('should validate all test strokes as valid', () => {
      allTestStrokes.forEach(stroke => {
        expect(validateStrokeData(stroke)).toBe(true);
      });
    });

    it('should reject invalid stroke data', () => {
      // Empty stroke
      expect(validateStrokeData({
        id: '',
        points: [],
        symmetryMode: SymmetryMode.RADIAL_8,
        timestamp: Date.now(),
        completed: false,
      })).toBe(false);

      // Out of bounds coordinates
      expect(validateStrokeData({
        id: 'test',
        points: [{ x: -10, y: 500, pressure: 0.5, timestamp: Date.now() }],
        symmetryMode: SymmetryMode.RADIAL_8,
        timestamp: Date.now(),
        completed: false,
      })).toBe(false);

      // Invalid pressure
      expect(validateStrokeData({
        id: 'test',
        points: [{ x: 500, y: 500, pressure: 1.5, timestamp: Date.now() }],
        symmetryMode: SymmetryMode.RADIAL_8,
        timestamp: Date.now(),
        completed: false,
      })).toBe(false);
    });

    it('should calculate correct stroke statistics', () => {
      const stats = getStrokeStats(horizontalLineStroke);
      
      expect(stats.pointCount).toBe(7);
      expect(stats.totalLength).toBeGreaterThan(500); // Horizontal line from 200 to 800
      expect(stats.totalLength).toBeLessThan(700);
      expect(stats.averagePressure).toBeGreaterThan(0);
      expect(stats.averagePressure).toBeLessThanOrEqual(1);
      expect(stats.duration).toBeGreaterThan(0);
    });
  });

  describe('Data Quality Checks', () => {
    it('should have all strokes within canvas bounds', () => {
      allTestStrokes.forEach(stroke => {
        stroke.points.forEach(point => {
          expect(point.x).toBeGreaterThanOrEqual(0);
          expect(point.x).toBeLessThanOrEqual(1024);
          expect(point.y).toBeGreaterThanOrEqual(0);
          expect(point.y).toBeLessThanOrEqual(1024);
        });
      });
    });

    it('should have all strokes with valid pressure values', () => {
      allTestStrokes.forEach(stroke => {
        stroke.points.forEach(point => {
          expect(point.pressure).toBeGreaterThanOrEqual(0);
          expect(point.pressure).toBeLessThanOrEqual(1);
        });
      });
    });

    it('should have increasing timestamps within each stroke', () => {
      allTestStrokes.forEach(stroke => {
        for (let i = 1; i < stroke.points.length; i++) {
          expect(stroke.points[i].timestamp).toBeGreaterThanOrEqual(
            stroke.points[i - 1].timestamp
          );
        }
      });
    });

    it('should have unique stroke IDs', () => {
      const ids = allTestStrokes.map(stroke => stroke.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});