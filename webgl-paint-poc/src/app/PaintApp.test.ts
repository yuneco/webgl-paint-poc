/**
 * PaintAppのテスト
 * 統合ペイントアプリケーションの検証
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PaintApp } from './PaintApp';
import { coreStore } from '../store/coreStore';

describe('PaintApp', () => {
  let canvasElement: HTMLCanvasElement;
  let paintApp: PaintApp;

  beforeEach(() => {
    // Mock Canvas要素をDOMに追加
    canvasElement = document.createElement('canvas');
    canvasElement.id = 'test-paint-canvas';
    canvasElement.width = 1024;
    canvasElement.height = 1024;
    document.body.appendChild(canvasElement);

    // Mock getBoundingClientRect
    vi.spyOn(canvasElement, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 150,
      width: 500,
      height: 500,
      right: 600,
      bottom: 650,
      x: 100,
      y: 150,
      toJSON: () => ({}),
    });

    // PointerEvent のモック
    // @ts-ignore - テスト用のモック
    window.PointerEvent = class PointerEvent extends MouseEvent {
        public pointerId: number;
        public pointerType: string;
        public pressure: number;
        public tiltX: number;
        public tiltY: number;

        constructor(type: string, options: any = {}) {
          super(type, options);
          this.pointerId = options.pointerId || 0;
          this.pointerType = options.pointerType || 'mouse';
          this.pressure = 'pressure' in options ? options.pressure : 0.5;
          this.tiltX = options.tiltX || 0;
          this.tiltY = options.tiltY || 0;
        }
      };

    // setPointerCapture/releasePointerCapture のモック
    canvasElement.setPointerCapture = vi.fn();
    canvasElement.releasePointerCapture = vi.fn();

    // WebGLのモック
    const mockWebGLContext = {
      canvas: canvasElement,
      clearColor: vi.fn(),
      clear: vi.fn(),
      viewport: vi.fn(),
      useProgram: vi.fn(),
      createShader: vi.fn(),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      createProgram: vi.fn(),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      getProgramParameter: vi.fn(() => true),
      getAttribLocation: vi.fn(() => 0),
      getUniformLocation: vi.fn(() => {}),
      createBuffer: vi.fn(() => ({})),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      vertexAttribPointer: vi.fn(),
      enableVertexAttribArray: vi.fn(),
      uniform4f: vi.fn(),
      uniform2f: vi.fn(),
      drawArrays: vi.fn(),
      deleteBuffer: vi.fn(),
      VERTEX_SHADER: 35633,
      FRAGMENT_SHADER: 35632,
      ARRAY_BUFFER: 34962,
      STATIC_DRAW: 35044,
      COLOR_BUFFER_BIT: 16384,
      LINES: 1,
      LINE_STRIP: 3,
      POINTS: 0,
    };

    vi.spyOn(canvasElement, 'getContext').mockReturnValue(mockWebGLContext);
  });

  afterEach(() => {
    if (paintApp) {
      paintApp.destroy();
    }
    document.body.removeChild(canvasElement);
    vi.restoreAllMocks();
    
    // ストアをリセット
    coreStore.getState().actions.drawing.clearStrokes();
  });

  describe('Initialization', () => {
    it('should initialize with valid configuration', () => {
      paintApp = new PaintApp({
        canvasId: 'test-paint-canvas',
        displaySize: { width: 500, height: 500 },
        enableDebug: false,
      });

      expect(paintApp).toBeInstanceOf(PaintApp);
      
      const debugState = paintApp.getDebugState();
      expect(debugState.isDrawing).toBe(false);
      expect(debugState.currentStrokePoints).toBe(0);
    });

    it('should throw error for non-existent canvas', () => {
      expect(() => {
        new PaintApp({
          canvasId: 'non-existent-canvas',
          displaySize: { width: 500, height: 500 },
          enableDebug: false,
        });
      }).toThrow('Canvas element with id "non-existent-canvas" not found');
    });

    it('should setup canvas with correct styles', () => {
      paintApp = new PaintApp({
        canvasId: 'test-paint-canvas',
        displaySize: { width: 600, height: 400 },
        enableDebug: false,
      });

      expect(canvasElement.style.width).toBe('600px');
      expect(canvasElement.style.height).toBe('400px');
      expect(canvasElement.style.cursor).toBe('crosshair');
    });
  });

  describe('Canvas Operations', () => {
    beforeEach(() => {
      paintApp = new PaintApp({
        canvasId: 'test-paint-canvas',
        displaySize: { width: 500, height: 500 },
        enableDebug: false,
      });
    });

    it('should clear canvas', () => {
      // まずストロークを追加
      const mockStroke = {
        id: 'test-stroke',
        points: [
          { x: 100, y: 200, pressure: 0.8, timestamp: Date.now() }
        ],
        metadata: {
          timestamp: Date.now(),
          deviceType: 'mouse' as const,
          totalPoints: 1,
        },
      };
      
      coreStore.getState().actions.drawing.addStroke(mockStroke);
      expect(coreStore.getState().drawing.strokes).toHaveLength(1);

      paintApp.clearCanvas();
      expect(coreStore.getState().drawing.strokes).toHaveLength(0);
    });

    it('should update display size', () => {
      paintApp.updateDisplaySize({ width: 800, height: 600 });

      expect(canvasElement.style.width).toBe('800px');
      expect(canvasElement.style.height).toBe('600px');
    });
  });

  describe('Symmetry Operations', () => {
    beforeEach(() => {
      paintApp = new PaintApp({
        canvasId: 'test-paint-canvas',
        displaySize: { width: 500, height: 500 },
        enableDebug: false,
      });
    });

    it('should update symmetry settings', () => {
      const initialState = coreStore.getState().symmetry;
      expect(initialState.enabled).toBe(true); // デフォルト値

      paintApp.updateSymmetry(false);
      expect(coreStore.getState().symmetry.enabled).toBe(false);

      paintApp.updateSymmetry(true, 16);
      const updatedState = coreStore.getState().symmetry;
      expect(updatedState.enabled).toBe(true);
      expect(updatedState.axisCount).toBe(16);
    });
  });

  describe('Input Event Processing', () => {
    beforeEach(() => {
      paintApp = new PaintApp({
        canvasId: 'test-paint-canvas',
        displaySize: { width: 500, height: 500 },
        enableDebug: false,
      });
    });

    it('should process pointer down event', () => {
      const debugStateBefore = paintApp.getDebugState();
      expect(debugStateBefore.isDrawing).toBe(false);

      const pointerEvent = new PointerEvent('pointerdown', {
        clientX: 350, // Canvas中心 (100 + 500/2)
        clientY: 400, // Canvas中心 (150 + 500/2)
        pointerId: 1,
        pointerType: 'pen',
        pressure: 0.8,
        buttons: 1,
      });

      canvasElement.dispatchEvent(pointerEvent);

      const debugStateAfter = paintApp.getDebugState();
      expect(debugStateAfter.isDrawing).toBe(true);
    });

    it('should process pointer move event during drawing', () => {
      // まず描画を開始
      const downEvent = new PointerEvent('pointerdown', {
        clientX: 300,
        clientY: 300,
        pointerId: 1,
        pointerType: 'pen',
        pressure: 0.8,
        buttons: 1,
      });
      canvasElement.dispatchEvent(downEvent);

      expect(paintApp.getDebugState().isDrawing).toBe(true);

      // 移動イベント
      const moveEvent = new PointerEvent('pointermove', {
        clientX: 320,
        clientY: 320,
        pointerId: 1,
        pointerType: 'pen',
        pressure: 0.7,
        buttons: 1,
      });
      canvasElement.dispatchEvent(moveEvent);

      // ストロークにポイントが追加されていることを確認
      const debugState = paintApp.getDebugState();
      expect(debugState.currentStrokePoints).toBeGreaterThan(1);
    });

    it('should complete stroke on pointer up', () => {
      // 描画を開始
      const downEvent = new PointerEvent('pointerdown', {
        clientX: 300,
        clientY: 300,
        pointerId: 1,
        buttons: 1,
      });
      canvasElement.dispatchEvent(downEvent);

      // 描画を終了
      const upEvent = new PointerEvent('pointerup', {
        clientX: 300,
        clientY: 300,
        pointerId: 1,
        buttons: 0,
      });
      canvasElement.dispatchEvent(upEvent);

      const debugState = paintApp.getDebugState();
      expect(debugState.isDrawing).toBe(false);
      expect(debugState.currentStrokePoints).toBe(0);
      
      // ストロークがストアに保存されていることを確認
      expect(coreStore.getState().drawing.strokes).toHaveLength(1);
    });
  });

  describe('Debug Mode', () => {
    it('should setup debug info when enabled', () => {
      paintApp = new PaintApp({
        canvasId: 'test-paint-canvas',
        displaySize: { width: 500, height: 500 },
        enableDebug: true,
      });

      // デバッグ要素が作成されていることを確認
      const debugElement = document.getElementById('paint-debug-info');
      expect(debugElement).toBeTruthy();
    });

    it('should not setup debug info when disabled', () => {
      paintApp = new PaintApp({
        canvasId: 'test-paint-canvas',
        displaySize: { width: 500, height: 500 },
        enableDebug: false,
      });

      // デバッグ要素が作成されていないことを確認
      const debugElement = document.getElementById('paint-debug-info');
      expect(debugElement).toBeFalsy();
    });
  });

  describe('Resource Management', () => {
    it('should clean up resources on destroy', () => {
      paintApp = new PaintApp({
        canvasId: 'test-paint-canvas',
        displaySize: { width: 500, height: 500 },
        enableDebug: true,
      });

      // デバッグ要素が存在することを確認
      const debugElement = document.getElementById('paint-debug-info');
      expect(debugElement).toBeTruthy();

      paintApp.destroy();

      // デバッグ要素が削除されていることを確認
      const debugElementAfter = document.getElementById('paint-debug-info');
      expect(debugElementAfter).toBeFalsy();
    });
  });

  describe('State Integration', () => {
    beforeEach(() => {
      paintApp = new PaintApp({
        canvasId: 'test-paint-canvas',
        displaySize: { width: 500, height: 500 },
        enableDebug: false,
      });
    });

    it('should integrate with core store', () => {
      const debugState = paintApp.getDebugState();
      expect(debugState.coreState).toBeDefined();
      expect(debugState.coreState.drawing).toBeDefined();
      expect(debugState.coreState.symmetry).toBeDefined();
      expect(debugState.coreState.view).toBeDefined();
    });

    it('should track input processor statistics', () => {
      const debugState = paintApp.getDebugState();
      expect(debugState.inputStats).toBeDefined();
      expect(debugState.inputStats.inputHandler).toBeDefined();
      expect(debugState.inputStats.throttler).toBeDefined();
      expect(debugState.inputStats.processor).toBeDefined();
    });
  });
});