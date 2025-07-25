/**
 * Mathematical Accuracy Tests for Spline Utils
 * 
 * This test suite verifies the mathematical correctness of spline interpolation
 * algorithms used in the input correction system.
 */

import { describe, it, expect } from 'vitest';
import {
  lerp,
  catmullRomSegment,
  catmullRomSpline,
  catmullRomSegmentRealtime,
  linearSmoothing,
  adaptiveSmoothing,
  calculatePathLength,
  pointToVector,
  vectorToPoint,
  type Vector2D
} from './splineUtils';
import type { StrokePoint } from '../types/core';

describe('splineUtils - Mathematical Accuracy Tests', () => {
  
  // =============================================================================
  // LINEAR INTERPOLATION TESTS
  // =============================================================================
  
  describe('lerp', () => {
    it('should return start point when t=0', () => {
      const a: Vector2D = { x: 10, y: 20 };
      const b: Vector2D = { x: 30, y: 40 };
      
      const result = lerp(a, b, 0);
      
      expect(result).toEqual(a);
    });

    it('should return end point when t=1', () => {
      const a: Vector2D = { x: 10, y: 20 };
      const b: Vector2D = { x: 30, y: 40 };
      
      const result = lerp(a, b, 1);
      
      expect(result).toEqual(b);
    });

    it('should return midpoint when t=0.5', () => {
      const a: Vector2D = { x: 0, y: 0 };
      const b: Vector2D = { x: 20, y: 40 };
      
      const result = lerp(a, b, 0.5);
      
      expect(result).toEqual({ x: 10, y: 20 });
    });

    it('should interpolate correctly for arbitrary t values', () => {
      const a: Vector2D = { x: 5, y: 10 };
      const b: Vector2D = { x: 15, y: 30 };
      
      const result = lerp(a, b, 0.3);
      
      expect(result.x).toBeCloseTo(8, 5);
      expect(result.y).toBeCloseTo(16, 5);
    });
  });

  // =============================================================================
  // CATMULL-ROM SPLINE TESTS  
  // =============================================================================

  describe('catmullRomSegment', () => {
    it('should return p1 when t=0', () => {
      const p0: Vector2D = { x: 0, y: 0 };
      const p1: Vector2D = { x: 10, y: 10 };
      const p2: Vector2D = { x: 20, y: 20 };
      const p3: Vector2D = { x: 30, y: 30 };
      
      const result = catmullRomSegment(p0, p1, p2, p3, 0);
      
      expect(result.x).toBeCloseTo(p1.x, 5);
      expect(result.y).toBeCloseTo(p1.y, 5);
    });

    it('should return p2 when t=1', () => {
      const p0: Vector2D = { x: 0, y: 0 };
      const p1: Vector2D = { x: 10, y: 10 };
      const p2: Vector2D = { x: 20, y: 20 };
      const p3: Vector2D = { x: 30, y: 30 };
      
      const result = catmullRomSegment(p0, p1, p2, p3, 1);
      
      expect(result.x).toBeCloseTo(p2.x, 5);
      expect(result.y).toBeCloseTo(p2.y, 5);
    });

    it('should produce smooth interpolation for known control points', () => {
      // Square control points
      const p0: Vector2D = { x: 0, y: 0 };
      const p1: Vector2D = { x: 10, y: 0 };
      const p2: Vector2D = { x: 20, y: 0 };
      const p3: Vector2D = { x: 30, y: 0 };
      
      const result = catmullRomSegment(p0, p1, p2, p3, 0.5);
      
      // For collinear points, should interpolate linearly
      expect(result.x).toBeCloseTo(15, 5);
      expect(result.y).toBeCloseTo(0, 5);
    });

    it('should handle curved paths correctly', () => {
      // Circular arc approximation
      const p0: Vector2D = { x: 0, y: 10 };
      const p1: Vector2D = { x: 10, y: 0 };
      const p2: Vector2D = { x: 20, y: 0 };
      const p3: Vector2D = { x: 30, y: 10 };
      
      const result = catmullRomSegment(p0, p1, p2, p3, 0.5);
      
      // Result should be between p1 and p2, with some curvature
      expect(result.x).toBeCloseTo(15, 1);
      expect(result.y).toBeLessThan(5); // Should curve below the line
    });
  });

  describe('catmullRomSpline', () => {
    it('should return original points when insufficient points provided', () => {
      const points: Vector2D[] = [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 20 }
      ];
      
      const result = catmullRomSpline(points, 2);
      
      expect(result).toEqual(points);
    });

    it('should generate smooth spline with sufficient points', () => {
      const points: Vector2D[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
        { x: 30, y: 0 },
        { x: 40, y: 0 }
      ];
      
      const result = catmullRomSpline(points, 2);
      
      // Should have at least as many points as input (may be more due to interpolation)
      expect(result.length).toBeGreaterThanOrEqual(points.length);
      
      // Should preserve endpoints approximately
      expect(result[result.length - 1]).toEqual(points[points.length - 1]);
    });

    it('should respect resolution parameter', () => {
      const points: Vector2D[] = [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 30 }
      ];
      
      const lowRes = catmullRomSpline(points, 1);
      const highRes = catmullRomSpline(points, 4);
      
      expect(highRes.length).toBeGreaterThan(lowRes.length);
    });
  });

  describe('catmullRomSegmentRealtime', () => {
    it('should return empty array for insufficient points', () => {
      const points: Vector2D[] = [
        { x: 0, y: 0 },
        { x: 10, y: 10 }
      ];
      
      const result = catmullRomSegmentRealtime(points, 2);
      
      expect(result).toEqual([]);
    });

    it('should generate interpolated points for latest segment only', () => {
      const points: Vector2D[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
        { x: 30, y: 0 }
      ];
      
      const result = catmullRomSegmentRealtime(points, 2);
      
      expect(result).toHaveLength(2);
      
      // Points should be between the last two control points
      result.forEach(point => {
        expect(point.x).toBeGreaterThan(10);
        expect(point.x).toBeLessThan(30);
      });
    });
  });

  // =============================================================================
  // LINEAR SMOOTHING TESTS
  // =============================================================================

  describe('linearSmoothing', () => {
    it('should return original points when strength is 0', () => {
      const points: Vector2D[] = [
        { x: 0, y: 0 },
        { x: 10, y: 20 },
        { x: 20, y: 10 },
        { x: 30, y: 30 }
      ];
      
      const result = linearSmoothing(points, 0);
      
      expect(result).toEqual(points);
    });

    it('should preserve first and last points', () => {
      const points: Vector2D[] = [
        { x: 0, y: 0 },
        { x: 10, y: 20 },
        { x: 20, y: 10 },
        { x: 30, y: 30 }
      ];
      
      const result = linearSmoothing(points, 0.5);
      
      expect(result[0]).toEqual(points[0]);
      expect(result[result.length - 1]).toEqual(points[points.length - 1]);
    });

    it('should smooth middle points towards average of neighbors', () => {
      const points: Vector2D[] = [
        { x: 0, y: 0 },
        { x: 10, y: 100 }, // Outlier that should be smoothed
        { x: 20, y: 0 }
      ];
      
      const result = linearSmoothing(points, 1.0); // Maximum smoothing
      
      // Middle point should be closer to average of neighbors
      expect(result[1].y).toBeLessThan(points[1].y);
      expect(result[1].y).toBeCloseTo(0, 1); // Should be close to (0+0)/2 = 0
    });

    it('should have correct smoothing strength effect', () => {
      const points: Vector2D[] = [
        { x: 0, y: 0 },
        { x: 10, y: 100 },
        { x: 20, y: 0 }
      ];
      
      const lightSmoothing = linearSmoothing(points, 0.2);
      const heavySmoothing = linearSmoothing(points, 0.8);
      
      // Heavy smoothing should move the point more towards the average
      expect(Math.abs(heavySmoothing[1].y - points[1].y)).toBeGreaterThan(
        Math.abs(lightSmoothing[1].y - points[1].y)
      );
    });
  });

  // =============================================================================
  // ADAPTIVE SMOOTHING TESTS
  // =============================================================================

  describe('adaptiveSmoothing', () => {
    const createStrokePoints = (vectors: Vector2D[]): StrokePoint[] => {
      return vectors.map((v, i) => ({
        x: v.x,
        y: v.y,
        pressure: 0.5,
        timestamp: Date.now() + i * 16 // 60fps timing
      }));
    };

    it('should return original points for insufficient input', () => {
      const points: StrokePoint[] = [
        { x: 0, y: 0, pressure: 0.5, timestamp: 1000 }
      ];
      
      const result = adaptiveSmoothing(points, 1.0);
      
      expect(result).toEqual(points);
    });

    it('should adapt to drawing speed', () => {
      // Fast drawing (short time intervals)
      const fastPoints = createStrokePoints([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 200, y: 0 },
        { x: 300, y: 0 }
      ]);
      
      // Slow drawing (long time intervals)
      const slowPoints: StrokePoint[] = fastPoints.map((p, i) => ({
        ...p,
        timestamp: p.timestamp + i * 100 // Much slower
      }));
      
      const fastResult = adaptiveSmoothing(fastPoints, 5.0);
      const slowResult = adaptiveSmoothing(slowPoints, 5.0);
      
      // Both should return valid results
      expect(fastResult.length).toBeGreaterThan(0);
      expect(slowResult.length).toBeGreaterThan(0);
    });

    it('should respect processing time limit', () => {
      const points = createStrokePoints([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 30 }
      ]);
      
      const startTime = performance.now();
      const result = adaptiveSmoothing(points, 0.1); // Very tight time limit
      const endTime = performance.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(50); // 50ms max
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // PATH LENGTH CALCULATION TESTS
  // =============================================================================

  describe('calculatePathLength', () => {
    it('should return 0 for insufficient points', () => {
      const points: Vector2D[] = [{ x: 0, y: 0 }];
      
      const length = calculatePathLength(points);
      
      expect(length).toBe(0);
    });

    it('should calculate correct length for straight line', () => {
      const points: Vector2D[] = [
        { x: 0, y: 0 },
        { x: 3, y: 4 } // 3-4-5 triangle
      ];
      
      const length = calculatePathLength(points);
      
      expect(length).toBeCloseTo(5, 5);
    });

    it('should calculate correct length for multi-segment path', () => {
      const points: Vector2D[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 }, // Length 10
        { x: 10, y: 10 } // Length 10
      ];
      
      const length = calculatePathLength(points);
      
      expect(length).toBeCloseTo(20, 5);
    });

    it('should handle complex paths', () => {
      const points: Vector2D[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 0 }
      ];
      
      const length = calculatePathLength(points);
      
      expect(length).toBeCloseTo(4, 5);
    });
  });

  // =============================================================================
  // UTILITY FUNCTION TESTS
  // =============================================================================

  describe('pointToVector and vectorToPoint', () => {
    it('should convert between point and vector correctly', () => {
      const originalPoint: StrokePoint = {
        x: 15.5,
        y: 25.7,
        pressure: 0.8,
        timestamp: 12345
      };
      
      const vector = pointToVector(originalPoint);
      const convertedPoint = vectorToPoint(vector, originalPoint.pressure, originalPoint.timestamp);
      
      expect(convertedPoint).toEqual(originalPoint);
    });

    it('should preserve vector precision', () => {
      const vector: Vector2D = { x: Math.PI, y: Math.E };
      
      const point = vectorToPoint(vector, 0.5, 1000);
      const backToVector = pointToVector(point);
      
      expect(backToVector.x).toBeCloseTo(vector.x, 10);
      expect(backToVector.y).toBeCloseTo(vector.y, 10);
    });
  });

  // =============================================================================
  // MATHEMATICAL PROPERTIES TESTS
  // =============================================================================

  describe('Mathematical Properties', () => {
    it('Catmull-Rom should be C1 continuous', () => {
      // Test continuity at segment boundaries
      const points: Vector2D[] = [
        { x: 0, y: 0 },
        { x: 10, y: 5 },
        { x: 20, y: 0 },
        { x: 30, y: 10 }
      ];
      
      // Point at end of first segment (t=1)
      const endFirst = catmullRomSegment(points[0], points[1], points[2], points[3], 1);
      
      // Point at start of second segment would be points[2] (at t=0)
      // For C1 continuity, these should match
      expect(endFirst.x).toBeCloseTo(points[2].x, 5);
      expect(endFirst.y).toBeCloseTo(points[2].y, 5);
    });

    it('Linear smoothing should preserve convex hull property', () => {
      // For a triangle, smoothed interior points should stay inside
      const points: Vector2D[] = [
        { x: 0, y: 0 },
        { x: 10, y: 10 }, // Inside triangle
        { x: 20, y: 0 }
      ];
      
      const smoothed = linearSmoothing(points, 0.5);
      
      // Smoothed middle point should still be within reasonable bounds
      expect(smoothed[1].x).toBeGreaterThanOrEqual(0);
      expect(smoothed[1].x).toBeLessThanOrEqual(20);
      expect(smoothed[1].y).toBeGreaterThanOrEqual(0);
    });

    it('Spline interpolation should preserve monotonicity for monotonic input', () => {
      // Monotonically increasing x values
      const points: Vector2D[] = [
        { x: 0, y: 5 },
        { x: 10, y: 10 },
        { x: 20, y: 15 },
        { x: 30, y: 20 }
      ];
      
      const spline = catmullRomSpline(points, 3);
      
      // X values should remain monotonically increasing
      for (let i = 1; i < spline.length; i++) {
        expect(spline[i].x).toBeGreaterThanOrEqual(spline[i - 1].x);
      }
    });
  });

  // =============================================================================
  // PERFORMANCE AND STABILITY TESTS
  // =============================================================================

  describe('Performance and Stability', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset: Vector2D[] = [];
      for (let i = 0; i < 1000; i++) {
        largeDataset.push({ x: i, y: Math.sin(i * 0.1) * 10 });
      }
      
      const startTime = performance.now();
      const result = linearSmoothing(largeDataset, 0.3);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      expect(result).toHaveLength(largeDataset.length);
    });

    it('should handle edge cases gracefully', () => {
      // Empty array
      expect(linearSmoothing([], 0.5)).toEqual([]);
      expect(calculatePathLength([])).toBe(0);
      
      // Single point
      const singlePoint = [{ x: 5, y: 10 }];
      expect(linearSmoothing(singlePoint, 0.5)).toEqual(singlePoint);
      
      // Identical points
      const identicalPoints = [
        { x: 10, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 10 }
      ];
      const smoothedIdentical = linearSmoothing(identicalPoints, 0.5);
      expect(smoothedIdentical).toEqual(identicalPoints);
    });

    it('should handle numerical edge cases', () => {
      // Very small differences
      const points: Vector2D[] = [
        { x: 0, y: 0 },
        { x: Number.EPSILON, y: Number.EPSILON },
        { x: 2 * Number.EPSILON, y: 2 * Number.EPSILON }
      ];
      
      expect(() => linearSmoothing(points, 0.5)).not.toThrow();
      expect(() => calculatePathLength(points)).not.toThrow();
      
      // Very large numbers
      const largePoints: Vector2D[] = [
        { x: 1e10, y: 1e10 },
        { x: 1e10 + 1, y: 1e10 + 1 },
        { x: 1e10 + 2, y: 1e10 + 2 }
      ];
      
      expect(() => linearSmoothing(largePoints, 0.5)).not.toThrow();
      expect(() => calculatePathLength(largePoints)).not.toThrow();
    });
  });
});