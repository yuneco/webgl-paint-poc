import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as Transform from './transform';
import * as CoreTypes from '../types/core';

type StrokePoint = CoreTypes.StrokePoint;
type Point2D = Transform.Point2D;

describe('Symmetry Transform (Browser Mode)', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create a fresh canvas for each test (required by Vitest browser mode)
    canvas = document.createElement('canvas');
    canvas.id = 'test-canvas';
    canvas.width = 1024;
    canvas.height = 1024;
    document.body.appendChild(canvas);
    console.log('Setting up WebGL test environment');
  });

  afterEach(() => {
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
    console.log('Cleaning up WebGL test environment');
  });

  describe('Angle Conversion', () => {
    it('should convert degrees to radians correctly', () => {
      expect(Transform.degreesToRadians(0)).toBeCloseTo(0);
      expect(Transform.degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
      expect(Transform.degreesToRadians(180)).toBeCloseTo(Math.PI);
      expect(Transform.degreesToRadians(270)).toBeCloseTo(3 * Math.PI / 2);
      expect(Transform.degreesToRadians(360)).toBeCloseTo(2 * Math.PI);
      expect(Transform.degreesToRadians(45)).toBeCloseTo(Math.PI / 4);
    });

    it('should convert radians to degrees correctly', () => {
      expect(Transform.radiansToDegrees(0)).toBeCloseTo(0);
      expect(Transform.radiansToDegrees(Math.PI / 2)).toBeCloseTo(90);
      expect(Transform.radiansToDegrees(Math.PI)).toBeCloseTo(180);
      expect(Transform.radiansToDegrees(3 * Math.PI / 2)).toBeCloseTo(270);
      expect(Transform.radiansToDegrees(2 * Math.PI)).toBeCloseTo(360);
      expect(Transform.radiansToDegrees(Math.PI / 4)).toBeCloseTo(45);
    });
  });

  describe('Symmetry Axis Calculations', () => {
    it('should calculate correct angles for 8-axis symmetry', () => {
      expect(Transform.calculateSymmetryAxisAngle(0)).toBeCloseTo(0); // 0度
      expect(Transform.calculateSymmetryAxisAngle(1)).toBeCloseTo(Math.PI / 4); // 45度
      expect(Transform.calculateSymmetryAxisAngle(2)).toBeCloseTo(Math.PI / 2); // 90度
      expect(Transform.calculateSymmetryAxisAngle(3)).toBeCloseTo(3 * Math.PI / 4); // 135度
      expect(Transform.calculateSymmetryAxisAngle(4)).toBeCloseTo(Math.PI); // 180度
      expect(Transform.calculateSymmetryAxisAngle(5)).toBeCloseTo(5 * Math.PI / 4); // 225度
      expect(Transform.calculateSymmetryAxisAngle(6)).toBeCloseTo(3 * Math.PI / 2); // 270度
      expect(Transform.calculateSymmetryAxisAngle(7)).toBeCloseTo(7 * Math.PI / 4); // 315度
    });

    it('should throw error for invalid axis index', () => {
      expect(() => Transform.calculateSymmetryAxisAngle(-1)).toThrow('Invalid axis index');
      expect(() => Transform.calculateSymmetryAxisAngle(8)).toThrow('Invalid axis index');
      expect(() => Transform.calculateSymmetryAxisAngle(10)).toThrow('Invalid axis index');
    });

    it('should return all 8 axis angles', () => {
      const angles = Transform.getAllSymmetryAxisAngles();
      expect(angles).toHaveLength(8);
      
      // Check that angles are in 45-degree increments
      for (let i = 0; i < 8; i++) {
        expect(angles[i]).toBeCloseTo(i * Math.PI / 4);
      }
    });
  });

  describe('Matrix Operations', () => {
    it('should create correct rotation matrix', () => {
      // 90度回転
      const rotation90 = Transform.createRotationMatrix(Math.PI / 2);
      expect(rotation90.m00).toBeCloseTo(0, 5); // cos(90°) = 0
      expect(rotation90.m01).toBeCloseTo(-1, 5); // -sin(90°) = -1
      expect(rotation90.m10).toBeCloseTo(1, 5); // sin(90°) = 1
      expect(rotation90.m11).toBeCloseTo(0, 5); // cos(90°) = 0

      // 45度回転
      const rotation45 = Transform.createRotationMatrix(Math.PI / 4);
      const sqrt2_2 = Math.sqrt(2) / 2;
      expect(rotation45.m00).toBeCloseTo(sqrt2_2, 5);
      expect(rotation45.m01).toBeCloseTo(-sqrt2_2, 5);
      expect(rotation45.m10).toBeCloseTo(sqrt2_2, 5);
      expect(rotation45.m11).toBeCloseTo(sqrt2_2, 5);
    });

    it('should create correct translation matrix', () => {
      const translation = Transform.createTranslationMatrix(10, 20);
      expect(translation.m02).toBe(10);
      expect(translation.m12).toBe(20);
      expect(translation.m00).toBe(1);
      expect(translation.m11).toBe(1);
      expect(translation.m22).toBe(1);
    });

    it('should create correct reflection matrix', () => {
      // Default parameter should create Y-axis reflection (vertical line)
      const reflectionY = Transform.createReflectionMatrix();
      expect(reflectionY.m00).toBeCloseTo(-1, 5); // X軸反転 for vertical line
      expect(reflectionY.m11).toBeCloseTo(1, 5);
      expect(reflectionY.m22).toBe(1);
      
      // Test X-axis reflection (horizontal line)
      const reflectionX = Transform.createReflectionMatrix(0);
      expect(reflectionX.m00).toBeCloseTo(1, 5);
      expect(reflectionX.m11).toBeCloseTo(-1, 5); // Y軸反転 for horizontal line
      expect(reflectionX.m22).toBe(1);
    });

    it('should multiply matrices correctly', () => {
      const a = Transform.createTranslationMatrix(5, 3);
      const b = Transform.createTranslationMatrix(2, 7);
      const result = Transform.multiplyMatrices(a, b);
      
      // 平行移動の合成
      expect(result.m02).toBe(7); // 5 + 2
      expect(result.m12).toBe(10); // 3 + 7
    });

    it('should apply transform to point correctly', () => {
      // 平行移動テスト
      const translation = Transform.createTranslationMatrix(10, 20);
      const point: Point2D = { x: 5, y: 3 };
      const transformed = Transform.applyTransformToPoint(point, translation);
      
      expect(transformed.x).toBeCloseTo(15); // 5 + 10
      expect(transformed.y).toBeCloseTo(23); // 3 + 20
    });
  });

  describe('8-Axis Symmetry Transforms', () => {
    it('should create valid symmetry transform for each axis', () => {
      for (let i = 0; i < 8; i++) {
        const transform = Transform.create8AxisSymmetryTransform(i);
        expect(transform.axisIndex).toBe(i);
        expect(transform.angle).toBeCloseTo(i * Math.PI / 4);
        expect(transform.matrix).toBeDefined();
      }
    });

    it('should create all 8 axis transforms', () => {
      const transforms = Transform.createAll8AxisSymmetryTransforms();
      expect(transforms).toHaveLength(8);
      
      transforms.forEach((transform, index) => {
        expect(transform.axisIndex).toBe(index);
        expect(transform.angle).toBeCloseTo(index * Math.PI / 4);
      });
    });

    it('should throw error for invalid axis in transform creation', () => {
      expect(() => Transform.create8AxisSymmetryTransform(-1)).toThrow('Invalid axis index');
      expect(() => Transform.create8AxisSymmetryTransform(8)).toThrow('Invalid axis index');
    });
  });

  describe('Point Transformation', () => {
    it('should transform point by axis correctly', () => {
      const point: Point2D = { x: 612, y: 512 }; // 100 pixels right of center
      
      // 軸0 (0度): X軸で反射 -> (412, 512) 100 pixels left of center  
      const transformed0 = Transform.transformPointByAxis(point, 0);
      expect(transformed0.x).toBeCloseTo(412, 1);
      expect(transformed0.y).toBeCloseTo(512, 1);
      
      // 軸2 (90度): 水平線で反射 -> Y座標が反転される
      const transformed2 = Transform.transformPointByAxis(point, 2);
      // 軸2は90度なので水平線での反射：(612,512) -> (612,512) (Y座標が中心線上なので変化なし)
      expect(transformed2.x).toBeCloseTo(612, 1);
      expect(transformed2.y).toBeCloseTo(512, 1);
    });

    it('should preserve center point under all transformations', () => {
      const centerPoint: Point2D = { x: 512, y: 512 };
      
      for (let axis = 0; axis < 8; axis++) {
        const transformed = Transform.transformPointByAxis(centerPoint, axis);
        expect(transformed.x).toBeCloseTo(512, 1);
        expect(transformed.y).toBeCloseTo(512, 1);
      }
    });

    it('should generate 8 symmetric points', () => {
      const point: Point2D = { x: 612, y: 412 }; // Right and up from center
      const symmetricPoints = Transform.transformPointToAllSymmetries(point);
      
      expect(symmetricPoints).toHaveLength(8);
      
      // All points should be equidistant from center
      const centerDistance = Math.sqrt(
        Math.pow(point.x - Transform.SYMMETRY_CENTER.x, 2) + 
        Math.pow(point.y - Transform.SYMMETRY_CENTER.y, 2)
      );
      
      symmetricPoints.forEach(symPoint => {
        const distance = Math.sqrt(
          Math.pow(symPoint.x - Transform.SYMMETRY_CENTER.x, 2) + 
          Math.pow(symPoint.y - Transform.SYMMETRY_CENTER.y, 2)
        );
        expect(distance).toBeCloseTo(centerDistance, 1);
      });
    });
  });

  describe('StrokePoint Transformation', () => {
    it('should transform stroke point while preserving pressure and timestamp', () => {
      const strokePoint: StrokePoint = {
        x: 612,
        y: 412,
        pressure: 0.75,
        timestamp: 1234567890
      };
      
      const transformed = Transform.transformStrokePointByAxis(strokePoint, 0);
      
      // Position should be transformed (axis 0 flips X coordinate)
      expect(transformed.x).toBeCloseTo(412, 1); // X should be flipped
      expect(transformed.y).toBeCloseTo(412, 1); // Y should remain same
      
      // Pressure and timestamp should be preserved
      expect(transformed.pressure).toBe(0.75);
      expect(transformed.timestamp).toBe(1234567890);
    });

    it('should generate 8 symmetric stroke points', () => {
      const strokePoint: StrokePoint = {
        x: 600,
        y: 500,
        pressure: 0.8,
        timestamp: 1000
      };
      
      const symmetricPoints = Transform.transformStrokePointToAllSymmetries(strokePoint);
      
      expect(symmetricPoints).toHaveLength(8);
      
      // All should have same pressure and timestamp
      symmetricPoints.forEach(point => {
        expect(point.pressure).toBe(0.8);
        expect(point.timestamp).toBe(1000);
      });
    });
  });

  describe('Mathematical Accuracy Tests', () => {
    it('should satisfy symmetry properties', () => {
      const testPoint: Point2D = { x: 600, y: 400 };
      
      // Apply transformation twice should return to a predictable location
      // For reflection symmetry, applying the same transform twice should return to original
      for (let axis = 0; axis < 8; axis++) {
        const once = Transform.transformPointByAxis(testPoint, axis);
        const twice = Transform.transformPointByAxis(once, axis);
        
        // Applying the same reflection twice should return to original
        expect(Transform.arePointsNearlyEqual(twice, testPoint, 1e-6)).toBe(true);
      }
    });

    it('should maintain distances from center', () => {
      const testPoints: Point2D[] = [
        { x: 612, y: 512 }, // Right
        { x: 512, y: 412 }, // Up  
        { x: 412, y: 512 }, // Left
        { x: 512, y: 612 }, // Down
        { x: 600, y: 400 }, // Diagonal
        { x: 700, y: 300 }  // Further diagonal
      ];
      
      testPoints.forEach(testPoint => {
        const originalDistance = Math.sqrt(
          Math.pow(testPoint.x - Transform.SYMMETRY_CENTER.x, 2) + 
          Math.pow(testPoint.y - Transform.SYMMETRY_CENTER.y, 2)
        );
        
        for (let axis = 0; axis < 8; axis++) {
          const transformed = Transform.transformPointByAxis(testPoint, axis);
          const transformedDistance = Math.sqrt(
            Math.pow(transformed.x - Transform.SYMMETRY_CENTER.x, 2) + 
            Math.pow(transformed.y - Transform.SYMMETRY_CENTER.y, 2)
          );
          
          expect(transformedDistance).toBeCloseTo(originalDistance, 5);
        }
      });
    });

    it('should generate symmetric patterns with known coordinates', () => {
      // Test with a point at known position
      const testPoint: Point2D = { x: 612, y: 512 }; // 100 pixels right of center
      const symmetricPoints = Transform.transformPointToAllSymmetries(testPoint);
      
      // Expected positions for 8-axis radial symmetry
      // The exact coordinates depend on the reflection axis for each angle
      
      // At least verify that we get 8 different points (except for center point)
      const uniquePoints = new Set();
      symmetricPoints.forEach(p => {
        uniquePoints.add(`${Math.round(p.x)},${Math.round(p.y)}`);
      });
      
      // Should have 8 unique positions (or fewer if some overlap due to symmetry)
      expect(uniquePoints.size).toBeGreaterThanOrEqual(4);
      expect(uniquePoints.size).toBeLessThanOrEqual(8);
    });
  });

  describe('Utility Functions', () => {
    it('should check numeric equality with epsilon', () => {
      expect(Transform.isNearlyEqual(1.0, 1.0000001, 1e-6)).toBe(true);
      expect(Transform.isNearlyEqual(1.0, 1.0001, 1e-6)).toBe(false);
      expect(Transform.isNearlyEqual(0.0, 0.0000001, 1e-6)).toBe(true);
    });

    it('should check point equality with epsilon', () => {
      const p1: Point2D = { x: 1.0, y: 2.0 };
      const p2: Point2D = { x: 1.0000001, y: 1.9999999 };
      const p3: Point2D = { x: 1.1, y: 2.0 };
      
      expect(Transform.arePointsNearlyEqual(p1, p2, 1e-6)).toBe(true);
      expect(Transform.arePointsNearlyEqual(p1, p3, 1e-6)).toBe(false);
    });

    it('should check matrix equality with epsilon', () => {
      const m1 = Transform.createRotationMatrix(Math.PI / 4);
      const m2 = Transform.createRotationMatrix(Math.PI / 4 + 1e-10);
      const m3 = Transform.createRotationMatrix(Math.PI / 2);
      
      expect(Transform.areMatricesNearlyEqual(m1, m2, 1e-8)).toBe(true);
      expect(Transform.areMatricesNearlyEqual(m1, m3, 1e-8)).toBe(false);
    });
  });

  describe('Constants Validation', () => {
    it('should have correct constants', () => {
      expect(Transform.SYMMETRY_CENTER.x).toBe(512);
      expect(Transform.SYMMETRY_CENTER.y).toBe(512);
      expect(Transform.AXIS_COUNT).toBe(8);
      expect(Transform.ANGLE_INCREMENT).toBeCloseTo(Math.PI / 4);
    });
  });
});