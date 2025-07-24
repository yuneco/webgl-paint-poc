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
      // 軸0-3: 反射軸 (0°, 45°, 90°, 135°)
      expect(Transform.calculateSymmetryAxisAngle(0)).toBeCloseTo(0); // 0度
      expect(Transform.calculateSymmetryAxisAngle(1)).toBeCloseTo(Math.PI / 4); // 45度
      expect(Transform.calculateSymmetryAxisAngle(2)).toBeCloseTo(Math.PI / 2); // 90度
      expect(Transform.calculateSymmetryAxisAngle(3)).toBeCloseTo(3 * Math.PI / 4); // 135度
      
      // 軸4-7: 回転軸 (0°, 90°, 180°, 270°)
      expect(Transform.calculateSymmetryAxisAngle(4)).toBeCloseTo(0); // 0度
      expect(Transform.calculateSymmetryAxisAngle(5)).toBeCloseTo(Math.PI / 2); // 90度
      expect(Transform.calculateSymmetryAxisAngle(6)).toBeCloseTo(Math.PI); // 180度
      expect(Transform.calculateSymmetryAxisAngle(7)).toBeCloseTo(3 * Math.PI / 2); // 270度
    });

    it('should throw error for invalid axis index', () => {
      expect(() => Transform.calculateSymmetryAxisAngle(-1)).toThrow('Invalid axis index');
      expect(() => Transform.calculateSymmetryAxisAngle(8)).toThrow('Invalid axis index');
      expect(() => Transform.calculateSymmetryAxisAngle(10)).toThrow('Invalid axis index');
    });

    it('should return all 8 axis angles', () => {
      const angles = Transform.getAllSymmetryAxisAngles();
      expect(angles).toHaveLength(8);
      
      // Check angles for both reflection and rotation axes
      // 軸0-3: 反射軸 (0°, 45°, 90°, 135°)
      expect(angles[0]).toBeCloseTo(0);
      expect(angles[1]).toBeCloseTo(Math.PI / 4);
      expect(angles[2]).toBeCloseTo(Math.PI / 2);
      expect(angles[3]).toBeCloseTo(3 * Math.PI / 4);
      
      // 軸4-7: 回転軸 (0°, 90°, 180°, 270°)
      expect(angles[4]).toBeCloseTo(0);
      expect(angles[5]).toBeCloseTo(Math.PI / 2);
      expect(angles[6]).toBeCloseTo(Math.PI);
      expect(angles[7]).toBeCloseTo(3 * Math.PI / 2);
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
        
        // Check correct angles for each axis type
        if (i < 4) {
          // 軸0-3: 反射軸
          expect(transform.angle).toBeCloseTo(i * Math.PI / 4);
        } else {
          // 軸4-7: 回転軸
          expect(transform.angle).toBeCloseTo((i - 4) * Math.PI / 2);
        }
        
        expect(transform.matrix).toBeDefined();
      }
    });

    it('should create all 8 axis transforms', () => {
      const transforms = Transform.createAll8AxisSymmetryTransforms();
      expect(transforms).toHaveLength(8);
      
      transforms.forEach((transform, index) => {
        expect(transform.axisIndex).toBe(index);
        
        // Check correct angles for each axis type
        if (index < 4) {
          // 軸0-3: 反射軸
          expect(transform.angle).toBeCloseTo(index * Math.PI / 4);
        } else {
          // 軸4-7: 回転軸
          expect(transform.angle).toBeCloseTo((index - 4) * Math.PI / 2);
        }
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
      
      // 軸0 (0度反射): 水平線で反射 -> Y座標が反転されるが、Y=512は中心線上なので変化なし
      const transformed0 = Transform.transformPointByAxis(point, 0);
      expect(transformed0.x).toBeCloseTo(612, 1);
      expect(transformed0.y).toBeCloseTo(512, 1);
      
      // 軸2 (90度反射): 垂直線で反射 -> X座標が反転される -> (412, 512)
      const transformed2 = Transform.transformPointByAxis(point, 2);
      expect(transformed2.x).toBeCloseTo(412, 1);
      expect(transformed2.y).toBeCloseTo(512, 1);
      
      // 軸5 (90度回転): 点(100,0)が(0,100)に回転 -> (512, 612)
      const transformed5 = Transform.transformPointByAxis(point, 5);
      expect(transformed5.x).toBeCloseTo(512, 1);
      expect(transformed5.y).toBeCloseTo(612, 1);
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
      
      const transformed = Transform.transformStrokePointByAxis(strokePoint, 2);
      
      // Position should be transformed (axis 2 is 90° vertical reflection, flips X coordinate)
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
      
      // For reflection symmetry, applying the same transform twice should return to original
      // Test only reflection axes (0-3), not rotation axes (5-7)
      for (let axis = 0; axis < 4; axis++) {
        const once = Transform.transformPointByAxis(testPoint, axis);
        const twice = Transform.transformPointByAxis(once, axis);
        
        // Applying the same reflection twice should return to original
        expect(Transform.arePointsNearlyEqual(twice, testPoint, 1e-6)).toBe(true);
      }
      
      // For rotation axes, test specific properties
      // 180° rotation applied twice should return to original
      const once180 = Transform.transformPointByAxis(testPoint, 6);
      const twice180 = Transform.transformPointByAxis(once180, 6);
      expect(Transform.arePointsNearlyEqual(twice180, testPoint, 1e-6)).toBe(true);
    });

    it('should maintain distances from center', () => {
      const testPoints: Point2D[] = [
        { x: 550, y: 450 }, // Off-axis point
        { x: 580, y: 480 }, // Another off-axis point
        { x: 600, y: 400 }, // Diagonal
        { x: 520, y: 530 }  // Near center off-axis
      ];
      
      testPoints.forEach(testPoint => {
        const originalDistance = Math.sqrt(
          Math.pow(testPoint.x - Transform.SYMMETRY_CENTER.x, 2) + 
          Math.pow(testPoint.y - Transform.SYMMETRY_CENTER.y, 2)
        );
        
        for (let axis = 0; axis < 8; axis++) {
          if (axis === 4) continue; // Skip identity transformation
          
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
      // Test with a point that has no special relationship to any symmetry axis
      const testPoint: Point2D = { x: 550, y: 450 }; // Offset from center: (38, -62)
      const symmetricPoints = Transform.transformPointToAllSymmetries(testPoint);
      
      // Expected positions for 8-axis radial symmetry
      // The exact coordinates depend on the reflection axis for each angle
      
      // At least verify that we get 8 different points (except for center point)
      const uniquePoints = new Set();
      symmetricPoints.forEach(p => {
        uniquePoints.add(`${Math.round(p.x)},${Math.round(p.y)}`);
      });
      
      // Should have exactly 8 unique positions for true 8-axis symmetry
      // (unless the point is on a symmetry axis, but our test point is not)
      expect(uniquePoints.size).toBe(8);
    });

    it('should generate exactly 8 unique positions for off-axis points', () => {
      // Test with a point that has no special relationship to any symmetry axis
      const testPoint: Point2D = { x: 550, y: 450 }; // Offset from center: (38, -62)
      const symmetricPoints = Transform.transformPointToAllSymmetries(testPoint);
      
      expect(symmetricPoints).toHaveLength(8);
      
      // Check that all 8 positions are unique
      const uniquePositions = new Set();
      symmetricPoints.forEach(p => {
        const roundedPos = `${Math.round(p.x)},${Math.round(p.y)}`;
        uniquePositions.add(roundedPos);
      });
      
      expect(uniquePositions.size).toBe(8);
      
      // Log the actual positions for debugging
      const positions = Array.from(uniquePositions);
      console.log('Generated 8-axis symmetry positions:', positions);
      
      // The original point should be explicitly included in our implementation
      const originalPos = `${Math.round(testPoint.x)},${Math.round(testPoint.y)}`;
      expect(positions).toContain(originalPos);
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