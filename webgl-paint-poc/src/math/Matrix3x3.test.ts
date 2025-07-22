/**
 * Matrix3x3のテスト
 * 座標変換の数学的正確性を細かく検証
 */

import { describe, it, expect } from 'vitest';
import { Matrix3x3 } from './Matrix3x3';

describe('Matrix3x3', () => {
  const EPSILON = 1e-8;

  describe('Constructor and Basic Properties', () => {
    it('should create identity matrix by default', () => {
      const matrix = new Matrix3x3();
      const identity = Matrix3x3.identity();
      
      expect(matrix.equals(identity)).toBe(true);
    });

    it('should create matrix with specified elements', () => {
      const matrix = new Matrix3x3(
        1, 2, 3,
        4, 5, 6,
        7, 8, 9
      );
      
      expect(matrix.get(0, 0)).toBe(1);
      expect(matrix.get(0, 1)).toBe(2);
      expect(matrix.get(0, 2)).toBe(3);
      expect(matrix.get(1, 0)).toBe(4);
      expect(matrix.get(1, 1)).toBe(5);
      expect(matrix.get(1, 2)).toBe(6);
      expect(matrix.get(2, 0)).toBe(7);
      expect(matrix.get(2, 1)).toBe(8);
      expect(matrix.get(2, 2)).toBe(9);
    });

    it('should throw error for invalid indices', () => {
      const matrix = Matrix3x3.identity();
      
      expect(() => matrix.get(-1, 0)).toThrow();
      expect(() => matrix.get(0, 3)).toThrow();
      expect(() => matrix.get(3, 0)).toThrow();
    });
  });

  describe('Static Factory Methods', () => {
    it('should create translation matrix correctly', () => {
      const matrix = Matrix3x3.translation(10, 20);
      
      expect(matrix.get(0, 0)).toBe(1);
      expect(matrix.get(0, 1)).toBe(0);
      expect(matrix.get(0, 2)).toBe(10); // translateX
      expect(matrix.get(1, 0)).toBe(0);
      expect(matrix.get(1, 1)).toBe(1);
      expect(matrix.get(1, 2)).toBe(20); // translateY
      expect(matrix.get(2, 0)).toBe(0);
      expect(matrix.get(2, 1)).toBe(0);
      expect(matrix.get(2, 2)).toBe(1);
    });

    it('should create scale matrix correctly', () => {
      const matrix = Matrix3x3.scale(2, 3);
      
      expect(matrix.get(0, 0)).toBe(2); // scaleX
      expect(matrix.get(1, 1)).toBe(3); // scaleY
      expect(matrix.get(2, 2)).toBe(1);
      
      // 非対角要素は0
      expect(matrix.get(0, 1)).toBe(0);
      expect(matrix.get(0, 2)).toBe(0);
      expect(matrix.get(1, 0)).toBe(0);
      expect(matrix.get(1, 2)).toBe(0);
    });

    it('should create uniform scale matrix when only one parameter given', () => {
      const matrix = Matrix3x3.scale(2.5);
      
      expect(matrix.get(0, 0)).toBe(2.5);
      expect(matrix.get(1, 1)).toBe(2.5);
    });

    it('should create rotation matrix correctly', () => {
      // 90度回転（π/2ラジアン）
      const matrix = Matrix3x3.rotation(Math.PI / 2);
      
      expect(matrix.get(0, 0)).toBeCloseTo(0, 8);   // cos(90°) = 0
      expect(matrix.get(0, 1)).toBeCloseTo(-1, 8);  // -sin(90°) = -1
      expect(matrix.get(1, 0)).toBeCloseTo(1, 8);   // sin(90°) = 1
      expect(matrix.get(1, 1)).toBeCloseTo(0, 8);   // cos(90°) = 0
      expect(matrix.get(2, 2)).toBe(1);
    });

    it('should create rotation around point correctly', () => {
      // 点(100, 200)周りの90度回転
      const centerX = 100, centerY = 200;
      const matrix = Matrix3x3.rotationAround(Math.PI / 2, centerX, centerY);
      
      // 中心点は変化しないはず
      const centerResult = matrix.transformPoint(centerX, centerY);
      expect(centerResult.x).toBeCloseTo(centerX, 8);
      expect(centerResult.y).toBeCloseTo(centerY, 8);
      
      // 中心から右に10の点(110, 200)は、90度CCW回転で中心から下に10の点(100, 210)に変換される
      // (数学的回転: 正のY方向が上、正の角度は反時計回り)
      const testPoint = matrix.transformPoint(centerX + 10, centerY);
      expect(testPoint.x).toBeCloseTo(centerX, 8);
      expect(testPoint.y).toBeCloseTo(centerY + 10, 8);
    });
  });

  describe('Point Transformation', () => {
    it('should transform point with translation', () => {
      const matrix = Matrix3x3.translation(5, 10);
      const result = matrix.transformPoint(3, 7);
      
      expect(result.x).toBe(8);  // 3 + 5
      expect(result.y).toBe(17); // 7 + 10
    });

    it('should transform point with scale', () => {
      const matrix = Matrix3x3.scale(2, 3);
      const result = matrix.transformPoint(4, 5);
      
      expect(result.x).toBe(8);  // 4 * 2
      expect(result.y).toBe(15); // 5 * 3
    });

    it('should transform point with 90-degree rotation', () => {
      const matrix = Matrix3x3.rotation(Math.PI / 2);
      const result = matrix.transformPoint(1, 0);
      
      expect(result.x).toBeCloseTo(0, 8);
      expect(result.y).toBeCloseTo(1, 8);
    });

    it('should transform point with identity matrix (no change)', () => {
      const matrix = Matrix3x3.identity();
      const result = matrix.transformPoint(123.456, 789.012);
      
      expect(result.x).toBe(123.456);
      expect(result.y).toBe(789.012);
    });
  });

  describe('Matrix Multiplication', () => {
    it('should multiply with identity correctly', () => {
      const matrix = Matrix3x3.translation(5, 10);
      const identity = Matrix3x3.identity();
      
      const result1 = matrix.multiply(identity);
      const result2 = identity.multiply(matrix);
      
      expect(result1.equals(matrix)).toBe(true);
      expect(result2.equals(matrix)).toBe(true);
    });

    it('should compose transformations correctly', () => {
      // 先にスケール(2,2)、次に平行移動(10,20)
      const scale = Matrix3x3.scale(2, 2);
      const translate = Matrix3x3.translation(10, 20);
      const composed = translate.multiply(scale);
      
      // 点(3,4)を変換: スケール→(6,8) → 平行移動→(16,28)
      const result = composed.transformPoint(3, 4);
      expect(result.x).toBe(16);
      expect(result.y).toBe(28);
    });

    it('should handle complex transformation chain', () => {
      // Canvas座標(256,256) → 中心移動 → 2倍スケール → 45度回転 → 元位置 → WebGL変換
      const canvasToOrigin = Matrix3x3.translation(-512, -512);
      const scale = Matrix3x3.scale(2, 2);
      const rotation = Matrix3x3.rotation(Math.PI / 4); // 45度
      const backToCanvas = Matrix3x3.translation(512, 512);
      
      const combined = backToCanvas
        .multiply(rotation)
        .multiply(scale)
        .multiply(canvasToOrigin);
      
      // 中心点(512,512)は変化しないはず
      const centerResult = combined.transformPoint(512, 512);
      expect(centerResult.x).toBeCloseTo(512, 8);
      expect(centerResult.y).toBeCloseTo(512, 8);
    });
  });

  describe('Inverse Matrix', () => {
    it('should compute inverse of translation matrix', () => {
      const matrix = Matrix3x3.translation(10, 20);
      const inverse = matrix.inverse();
      const product = matrix.multiply(inverse);
      
      expect(product.equals(Matrix3x3.identity(), EPSILON)).toBe(true);
    });

    it('should compute inverse of scale matrix', () => {
      const matrix = Matrix3x3.scale(2, 4);
      const inverse = matrix.inverse();
      
      // スケールの逆変換を手動で検証
      const testPoint = { x: 6, y: 8 };
      const scaled = matrix.transformPoint(testPoint.x, testPoint.y);
      const restored = inverse.transformPoint(scaled.x, scaled.y);
      
      expect(restored.x).toBeCloseTo(testPoint.x, 6);
      expect(restored.y).toBeCloseTo(testPoint.y, 6);
    });

    it('should compute inverse of rotation matrix', () => {
      const angle = Math.PI / 3; // 60度
      const matrix = Matrix3x3.rotation(angle);
      const inverse = matrix.inverse();
      
      const testPoint = { x: 5, y: 12 };
      const rotated = matrix.transformPoint(testPoint.x, testPoint.y);
      const restored = inverse.transformPoint(rotated.x, rotated.y);
      
      expect(restored.x).toBeCloseTo(testPoint.x, 6);
      expect(restored.y).toBeCloseTo(testPoint.y, 6);
    });

    it('should throw error for singular matrix', () => {
      // 行列式が0になる行列（全ての行が線形従属）
      const singularMatrix = new Matrix3x3(
        1, 2, 3,
        2, 4, 6,
        3, 6, 9
      );
      
      expect(() => singularMatrix.inverse()).toThrow(/singular/i);
    });
  });

  describe('Matrix Properties', () => {
    it('should calculate determinant correctly', () => {
      // 単位行列の行列式は1
      expect(Matrix3x3.identity().determinant()).toBe(1);
      
      // スケール行列の行列式はスケール値の積
      expect(Matrix3x3.scale(2, 3).determinant()).toBe(6);
      
      // 回転行列の行列式は1（面積保存）
      const rotation = Matrix3x3.rotation(Math.PI / 4);
      expect(rotation.determinant()).toBeCloseTo(1, 7);
    });

    it('should create transpose correctly', () => {
      const matrix = new Matrix3x3(
        1, 2, 3,
        4, 5, 6,
        7, 8, 9
      );
      
      const transposed = matrix.transpose();
      
      expect(transposed.get(0, 0)).toBe(1);
      expect(transposed.get(0, 1)).toBe(4);
      expect(transposed.get(0, 2)).toBe(7);
      expect(transposed.get(1, 0)).toBe(2);
      expect(transposed.get(1, 1)).toBe(5);
      expect(transposed.get(1, 2)).toBe(8);
      expect(transposed.get(2, 0)).toBe(3);
      expect(transposed.get(2, 1)).toBe(6);
      expect(transposed.get(2, 2)).toBe(9);
    });

    it('should clone matrix correctly', () => {
      const original = Matrix3x3.translation(10, 20);
      const cloned = original.clone();
      
      expect(cloned.equals(original)).toBe(true);
      expect(cloned).not.toBe(original); // 異なるインスタンス
    });
  });

  describe('Coordinate System Specific Tests', () => {
    it('should handle Canvas to WebGL coordinate transformation', () => {
      // Canvas座標(0,0) → WebGL座標(-1,1)
      // Canvas座標(1024,1024) → WebGL座標(1,-1)
      // 変換: webglX = (canvasX / 1024) * 2 - 1, webglY = -((canvasY / 1024) * 2 - 1)
      const canvasToWebGL = Matrix3x3.translation(-1, 1)
        .multiply(Matrix3x3.scale(2/1024, -2/1024));
      
      // Canvas左上角
      const topLeft = canvasToWebGL.transformPoint(0, 0);
      expect(topLeft.x).toBeCloseTo(-1, 8);
      expect(topLeft.y).toBeCloseTo(1, 8);
      
      // Canvas右下角
      const bottomRight = canvasToWebGL.transformPoint(1024, 1024);
      expect(bottomRight.x).toBeCloseTo(1, 8);
      expect(bottomRight.y).toBeCloseTo(-1, 8);
      
      // Canvas中心
      const center = canvasToWebGL.transformPoint(512, 512);
      expect(center.x).toBeCloseTo(0, 8);
      expect(center.y).toBeCloseTo(0, 8);
    });

    it('should handle device to canvas coordinate transformation', () => {
      // デバイス座標からCanvas座標への変換
      // Canvas要素が200x200ピクセルで表示され、(100,150)の位置にある場合
      const canvasLeft = 100, canvasTop = 150;
      const canvasWidth = 200, canvasHeight = 200;
      
      // 1. デバイス座標をCanvas要素内の相対座標に変換
      const deviceToRelative = Matrix3x3.translation(-canvasLeft, -canvasTop);
      
      // 2. Canvas要素の表示サイズを論理サイズ(1024x1024)にスケール
      const relativeToCanvas = Matrix3x3.scale(1024/canvasWidth, 1024/canvasHeight);
      
      const deviceToCanvas = relativeToCanvas.multiply(deviceToRelative);
      
      // Canvas要素の左上角(100,150) → Canvas座標(0,0)
      const topLeft = deviceToCanvas.transformPoint(100, 150);
      expect(topLeft.x).toBeCloseTo(0, 4);
      expect(topLeft.y).toBeCloseTo(0, 4);
      
      // Canvas要素の右下角(300,350) → Canvas座標(1024,1024)
      const bottomRight = deviceToCanvas.transformPoint(300, 350);
      expect(bottomRight.x).toBeCloseTo(1024, 4);
      expect(bottomRight.y).toBeCloseTo(1024, 4);
      
      // Canvas要素の中心(200,250) → Canvas座標(512,512)
      const center = deviceToCanvas.transformPoint(200, 250);
      expect(center.x).toBeCloseTo(512, 4);
      expect(center.y).toBeCloseTo(512, 4);
    });
  });
});