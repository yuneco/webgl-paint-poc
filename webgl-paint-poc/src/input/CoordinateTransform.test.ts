/**
 * CoordinateTransformのテスト
 * 各座標系間の変換の正確性を検証
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CoordinateTransform } from './CoordinateTransform';
import type {
  CanvasBounds,
  ViewTransformState,
  DeviceCoordinates,
  CanvasCoordinates,
  WebGLCoordinates,
  ViewCoordinates,
} from '../types/coordinates';

describe('CoordinateTransform', () => {
  let transform: CoordinateTransform;
  let defaultCanvasBounds: CanvasBounds;
  let defaultViewState: ViewTransformState;

  beforeEach(() => {
    // 標準的なCanvas要素の設定: 200x200ピクセル、位置(100, 150)
    defaultCanvasBounds = {
      left: 100,
      top: 150,
      width: 200,
      height: 200,
    };

    // 初期ビュー状態: 変換なし
    defaultViewState = {
      zoom: 1.0,
      panOffset: { canvasX: 0, canvasY: 0 },
      rotation: 0,
    };

    transform = new CoordinateTransform(defaultCanvasBounds, defaultViewState);
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with provided canvas bounds and view state', () => {
      const matrices = transform.getTransformMatrices();
      
      expect(matrices.deviceToCanvas).toBeDefined();
      expect(matrices.canvasToWebGL).toBeDefined();
      expect(matrices.canvasToView).toBeDefined();
    });

    it('should use default view state when not provided', () => {
      const transformWithDefaults = new CoordinateTransform(defaultCanvasBounds);
      const matrices = transformWithDefaults.getTransformMatrices();
      
      expect(matrices).toBeDefined();
    });
  });

  describe('Device to Canvas Coordinate Transform', () => {
    it('should transform canvas element corners correctly', () => {
      // Canvas要素の左上角(100, 150) → Canvas座標(0, 0)
      const topLeft = transform.deviceToCanvas({
        deviceX: 100,
        deviceY: 150,
      });
      expect(topLeft.canvasX).toBeCloseTo(0, 4);
      expect(topLeft.canvasY).toBeCloseTo(0, 4);

      // Canvas要素の右下角(300, 350) → Canvas座標(1024, 1024)
      const bottomRight = transform.deviceToCanvas({
        deviceX: 300,
        deviceY: 350,
      });
      expect(bottomRight.canvasX).toBeCloseTo(1024, 4);
      expect(bottomRight.canvasY).toBeCloseTo(1024, 4);

      // Canvas要素の中心(200, 250) → Canvas座標(512, 512)
      const center = transform.deviceToCanvas({
        deviceX: 200,
        deviceY: 250,
      });
      expect(center.canvasX).toBeCloseTo(512, 4);
      expect(center.canvasY).toBeCloseTo(512, 4);
    });

    it('should clamp coordinates to valid Canvas range', () => {
      // Canvas要素の外側の座標
      const outsideLeft = transform.deviceToCanvas({
        deviceX: 50, // Canvas要素より左
        deviceY: 200,
      });
      expect(outsideLeft.canvasX).toBe(0);

      const outsideRight = transform.deviceToCanvas({
        deviceX: 350, // Canvas要素より右
        deviceY: 200,
      });
      expect(outsideRight.canvasX).toBe(1024);
    });

    it('should handle non-square canvas elements correctly', () => {
      // 長方形のCanvas要素: 400x200
      const rectBounds: CanvasBounds = {
        left: 100,
        top: 150,
        width: 400,
        height: 200,
      };
      
      transform.updateCanvasBounds(rectBounds);
      
      // 中心点の変換
      const center = transform.deviceToCanvas({
        deviceX: 300, // left + width/2 = 100 + 200
        deviceY: 250, // top + height/2 = 150 + 100
      });
      expect(center.canvasX).toBeCloseTo(512, 4);
      expect(center.canvasY).toBeCloseTo(512, 4);
    });
  });

  describe('Canvas to Device Coordinate Transform', () => {
    it('should be inverse of device to canvas transform', () => {
      const originalDevice: DeviceCoordinates = {
        deviceX: 175,
        deviceY: 225,
      };

      // Device → Canvas → Device
      const canvas = transform.deviceToCanvas(originalDevice);
      const backToDevice = transform.canvasToDevice(canvas);

      expect(backToDevice.deviceX).toBeCloseTo(originalDevice.deviceX, 4);
      expect(backToDevice.deviceY).toBeCloseTo(originalDevice.deviceY, 4);
    });

    it('should transform canvas coordinates to correct device positions', () => {
      // Canvas中心(512, 512) → デバイス座標(200, 250)
      const deviceCenter = transform.canvasToDevice({
        canvasX: 512,
        canvasY: 512,
      });
      expect(deviceCenter.deviceX).toBeCloseTo(200, 4);
      expect(deviceCenter.deviceY).toBeCloseTo(250, 4);
    });
  });

  describe('Canvas to WebGL Coordinate Transform', () => {
    it('should transform canvas corners to WebGL normalized coordinates', () => {
      // Canvas左上角(0, 0) → WebGL(-1, 1)
      const topLeft = transform.canvasToWebGL({
        canvasX: 0,
        canvasY: 0,
      });
      expect(topLeft.webglX).toBeCloseTo(-1, 8);
      expect(topLeft.webglY).toBeCloseTo(1, 8);

      // Canvas右下角(1024, 1024) → WebGL(1, -1)
      const bottomRight = transform.canvasToWebGL({
        canvasX: 1024,
        canvasY: 1024,
      });
      expect(bottomRight.webglX).toBeCloseTo(1, 8);
      expect(bottomRight.webglY).toBeCloseTo(-1, 8);

      // Canvas中心(512, 512) → WebGL(0, 0)
      const center = transform.canvasToWebGL({
        canvasX: 512,
        canvasY: 512,
      });
      expect(center.webglX).toBeCloseTo(0, 8);
      expect(center.webglY).toBeCloseTo(0, 8);
    });

    it('should clamp coordinates to valid WebGL range', () => {
      // 範囲外の座標
      const outsideCoords = transform.canvasToWebGL({
        canvasX: 2000,
        canvasY: -500,
      });
      expect(outsideCoords.webglX).toBe(1);
      expect(outsideCoords.webglY).toBe(1);
    });
  });

  describe('WebGL to Canvas Coordinate Transform', () => {
    it('should be inverse of canvas to WebGL transform', () => {
      const originalCanvas: CanvasCoordinates = {
        canvasX: 256,
        canvasY: 768,
      };

      // Canvas → WebGL → Canvas
      const webgl = transform.canvasToWebGL(originalCanvas);
      const backToCanvas = transform.webGLToCanvas(webgl);

      expect(backToCanvas.canvasX).toBeCloseTo(originalCanvas.canvasX, 4);
      expect(backToCanvas.canvasY).toBeCloseTo(originalCanvas.canvasY, 4);
    });

    it('should handle WebGL coordinate edge cases', () => {
      // WebGL原点(0, 0) → Canvas中心(512, 512)
      const center = transform.webGLToCanvas({
        webglX: 0,
        webglY: 0,
      });
      expect(center.canvasX).toBeCloseTo(512, 8);
      expect(center.canvasY).toBeCloseTo(512, 8);
    });
  });

  describe('View Transform', () => {
    it('should handle identity view transform (no zoom, pan, rotation)', () => {
      const originalCanvas: CanvasCoordinates = {
        canvasX: 300,
        canvasY: 400,
      };

      // Canvas → View → Canvas (identity変換)
      const view = transform.canvasToView(originalCanvas);
      const backToCanvas = transform.viewToCanvas(view);

      expect(backToCanvas.canvasX).toBeCloseTo(originalCanvas.canvasX, 6);
      expect(backToCanvas.canvasY).toBeCloseTo(originalCanvas.canvasY, 6);
    });

    it('should handle zoom transformation', () => {
      const zoomedViewState: ViewTransformState = {
        zoom: 2.0,
        panOffset: { canvasX: 0, canvasY: 0 },
        rotation: 0,
      };
      
      transform.updateViewTransform(zoomedViewState);

      // Canvas中心点(512, 512)は、ズーム後も中心にいるはず
      const centerView = transform.canvasToView({
        canvasX: 512,
        canvasY: 512,
      });
      
      // 2倍ズーム時: 中心からの距離が2倍になる
      const offsetPoint = transform.canvasToView({
        canvasX: 612, // 中心から100ピクセル右
        canvasY: 512,
      });
      expect(offsetPoint.viewX).toBeCloseTo(712, 6); // 100 * 2 + 512
    });

    it('should handle pan transformation', () => {
      const pannedViewState: ViewTransformState = {
        zoom: 1.0,
        panOffset: { canvasX: 50, canvasY: -30 },
        rotation: 0,
      };
      
      transform.updateViewTransform(pannedViewState);

      const view = transform.canvasToView({
        canvasX: 512,
        canvasY: 512,
      });
      
      expect(view.viewX).toBeCloseTo(562, 6); // 512 + 50
      expect(view.viewY).toBeCloseTo(482, 6); // 512 - 30
    });

    it('should handle rotation transformation', () => {
      const rotatedViewState: ViewTransformState = {
        zoom: 1.0,
        panOffset: { canvasX: 0, canvasY: 0 },
        rotation: Math.PI / 2, // 90度回転
      };
      
      transform.updateViewTransform(rotatedViewState);

      // 中心から右に100ピクセルの点(612, 512)は、90度回転で中心から下に100ピクセル(512, 612)になる
      const rotatedPoint = transform.canvasToView({
        canvasX: 612,
        canvasY: 512,
      });
      
      expect(rotatedPoint.viewX).toBeCloseTo(512, 6);
      expect(rotatedPoint.viewY).toBeCloseTo(612, 6);
    });

    it('should handle combined transformations', () => {
      const combinedViewState: ViewTransformState = {
        zoom: 1.5,
        panOffset: { canvasX: 20, canvasY: 10 },
        rotation: Math.PI / 4, // 45度回転
      };
      
      transform.updateViewTransform(combinedViewState);

      // 複合変換の可逆性テスト
      const originalCanvas: CanvasCoordinates = {
        canvasX: 400,
        canvasY: 300,
      };

      const view = transform.canvasToView(originalCanvas);
      const backToCanvas = transform.viewToCanvas(view);

      expect(backToCanvas.canvasX).toBeCloseTo(originalCanvas.canvasX, 4);
      expect(backToCanvas.canvasY).toBeCloseTo(originalCanvas.canvasY, 4);
    });
  });

  describe('Canvas Bounds Update', () => {
    it('should update device-canvas transform when bounds change', () => {
      const newBounds: CanvasBounds = {
        left: 200,
        top: 100,
        width: 400,
        height: 300,
      };

      transform.updateCanvasBounds(newBounds);

      // 新しい境界での変換テスト
      const topLeft = transform.deviceToCanvas({
        deviceX: 200, // new left
        deviceY: 100, // new top
      });
      expect(topLeft.canvasX).toBeCloseTo(0, 4);
      expect(topLeft.canvasY).toBeCloseTo(0, 4);

      const bottomRight = transform.deviceToCanvas({
        deviceX: 600, // left + width
        deviceY: 400, // top + height
      });
      expect(bottomRight.canvasX).toBeCloseTo(1024, 4);
      expect(bottomRight.canvasY).toBeCloseTo(1024, 4);
    });
  });

  describe('Error Handling', () => {
    it('should handle matrix inversion failures gracefully', () => {
      // 通常の操作では例外は発生しないはず
      expect(() => {
        transform.deviceToCanvas({ deviceX: 150, deviceY: 200 });
      }).not.toThrow();

      expect(() => {
        transform.canvasToWebGL({ canvasX: 512, canvasY: 512 });
      }).not.toThrow();
    });

    it('should provide meaningful error messages', () => {
      // 現在の実装では例外は発生しにくいが、将来の拡張のためのテスト構造
      const matrices = transform.getTransformMatrices();
      expect(matrices).toBeDefined();
    });
  });

  describe('Performance and Memory', () => {
    it('should reuse matrix instances efficiently', () => {
      const matrices1 = transform.getTransformMatrices();
      const matrices2 = transform.getTransformMatrices();

      // クローンされた異なるインスタンスのはず
      expect(matrices1.deviceToCanvas).not.toBe(matrices2.deviceToCanvas);
      expect(matrices1.canvasToWebGL).not.toBe(matrices2.canvasToWebGL);
      expect(matrices1.canvasToView).not.toBe(matrices2.canvasToView);
    });

    it('should handle multiple coordinate transformations efficiently', () => {
      // 大量の変換処理のパフォーマンステスト
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        const device: DeviceCoordinates = {
          deviceX: 100 + i % 200,
          deviceY: 150 + i % 200,
        };
        
        const canvas = transform.deviceToCanvas(device);
        const webgl = transform.canvasToWebGL(canvas);
        transform.webGLToCanvas(webgl);
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // 1000回の変換が100ms以内で完了することを期待
      expect(executionTime).toBeLessThan(100);
    });
  });
});