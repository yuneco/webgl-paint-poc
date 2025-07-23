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

    // Canvas要素のoffsetWidth/Heightを設定（新しい座標系で必要）
    Object.defineProperty(canvasElement, 'offsetWidth', { value: 500, configurable: true });
    Object.defineProperty(canvasElement, 'offsetHeight', { value: 500, configurable: true });

    // Canvas element already has real setPointerCapture/releasePointerCapture in browser mode

    // WebGLモックを削除して本物のWebGLコンテキストを使用
    // ブラウザモードなので本物のWebGLが利用可能
  });

  afterEach(() => {
    if (paintApp) {
      paintApp.destroy();
    }
    document.body.removeChild(canvasElement);
    vi.restoreAllMocks();
    
    // ストアをリセット
    const state = coreStore.getState();
    if (state.clearHistory) {
      state.clearHistory();
    }
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
        timestamp: Date.now(),
        metadata: {
          timestamp: Date.now(),
          deviceType: 'mouse' as const,
          totalPoints: 1,
        },
      };
      
      coreStore.getState().addStroke(mockStroke);
      expect(coreStore.getState().history.strokes).toHaveLength(1);

      paintApp.clearCanvas();
      expect(coreStore.getState().history.strokes).toHaveLength(0);
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
      expect(updatedState.axisCount).toBe(8);
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
        pointerId: 1,
        pointerType: 'pen',
        pressure: 0.8,
        buttons: 1,
      });
      // Use real offsetX/Y properties from PointerEvent
      Object.defineProperty(pointerEvent, 'offsetX', { value: 250, configurable: true });
      Object.defineProperty(pointerEvent, 'offsetY', { value: 250, configurable: true });

      canvasElement.dispatchEvent(pointerEvent);

      const debugStateAfter = paintApp.getDebugState();
      expect(debugStateAfter.isDrawing).toBe(true);
    });

    it('should process pointer move event during drawing', async () => {
      // デバッグモードで新しいPaintAppを作成
      const debugPaintApp = new PaintApp({
        canvasId: 'test-paint-canvas',
        displaySize: { width: 500, height: 500 },
        enableDebug: true,
      });
      // まず描画を開始
      const downEvent = new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'pen',
        pressure: 0.8,
        buttons: 1,
      });
      // Use real offsetX/Y properties from PointerEvent
      Object.defineProperty(downEvent, 'offsetX', { value: 300, configurable: true });
      Object.defineProperty(downEvent, 'offsetY', { value: 300, configurable: true });
      canvasElement.dispatchEvent(downEvent);
      
      // 間引きを回避するための省い延置
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(debugPaintApp.getDebugState().isDrawing).toBe(true);
      expect(debugPaintApp.getDebugState().currentStrokePoints).toBe(1);

      // 移動イベント
      const moveEvent = new PointerEvent('pointermove', {
        pointerId: 1,
        pointerType: 'pen',
        pressure: 0.7,
        buttons: 1,
      });
      // Use real offsetX/Y properties from PointerEvent
      Object.defineProperty(moveEvent, 'offsetX', { value: 350, configurable: true });
      Object.defineProperty(moveEvent, 'offsetY', { value: 350, configurable: true });
      canvasElement.dispatchEvent(moveEvent);

      // ストロークにポイントが追加されていることを確認
      const debugState = debugPaintApp.getDebugState();
      expect(debugState.currentStrokePoints).toBeGreaterThan(1);
      
      // クリーンアップ
      debugPaintApp.destroy();
    });

    it('should complete stroke on pointer up', () => {
      // 描画を開始
      const downEvent = new PointerEvent('pointerdown', {
        pointerId: 1,
        buttons: 1,
      });
      // offsetX/Yを手動で設定
      Object.defineProperty(downEvent, 'offsetX', { value: 300 });
      Object.defineProperty(downEvent, 'offsetY', { value: 300 });
      canvasElement.dispatchEvent(downEvent);

      // 描画を終了
      const upEvent = new PointerEvent('pointerup', {
        pointerId: 1,
        buttons: 0,
      });
      // Use real offsetX/Y properties from PointerEvent
      Object.defineProperty(upEvent, 'offsetX', { value: 300, configurable: true });
      Object.defineProperty(upEvent, 'offsetY', { value: 300, configurable: true });
      canvasElement.dispatchEvent(upEvent);

      const debugState = paintApp.getDebugState();
      expect(debugState.isDrawing).toBe(false);
      expect(debugState.currentStrokePoints).toBe(0);
      
      // ストロークがストアに保存されていることを確認
      expect(coreStore.getState().history.strokes).toHaveLength(1);
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
      expect(debugState.coreState.history).toBeDefined();
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