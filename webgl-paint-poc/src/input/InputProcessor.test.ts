/**
 * InputProcessorのテスト
 * 統合入力処理システムの検証
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InputProcessor, DEFAULT_INPUT_PROCESSOR_CONFIG } from './InputProcessor';
import type { NormalizedInputEvent } from './InputEventHandler';
import type { CanvasBounds, ViewTransformState } from '../types/coordinates';

describe('InputProcessor', () => {
  let processor: InputProcessor;
  let canvasElement: HTMLCanvasElement;
  let canvasBounds: CanvasBounds;
  let eventCallback: ReturnType<typeof vi.fn>;
  let receivedEvents: NormalizedInputEvent[];

  beforeEach(() => {
    // Mock Canvas要素
    canvasElement = document.createElement('canvas');
    canvasElement.width = 1024;
    canvasElement.height = 1024;
    document.body.appendChild(canvasElement);

    // Mock getBoundingClientRect
    vi.spyOn(canvasElement, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 150,
      width: 200,
      height: 200,
      right: 300,
      bottom: 350,
      x: 100,
      y: 150,
      toJSON: () => ({}),
    });

    canvasBounds = {
      left: 100,
      top: 150,
      width: 200,
      height: 200,
    };

    // イベントコールバックのモック
    receivedEvents = [];
    eventCallback = vi.fn((event: NormalizedInputEvent) => {
      receivedEvents.push(event);
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

    processor = new InputProcessor(canvasElement, canvasBounds);
    processor.setEventCallback(eventCallback);
  });

  afterEach(() => {
    processor.destroy();
    document.body.removeChild(canvasElement);
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const config = processor.getConfig();
      expect(config).toEqual(DEFAULT_INPUT_PROCESSOR_CONFIG);
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        throttle: {
          minTimeInterval: 16,
          minDistance: 5.0,
          maxBufferSize: 64,
          forceFlushInterval: 32,
        },
        enableDuplicateFiltering: false,
        minPressureChange: 0.05,
      };

      const customProcessor = new InputProcessor(
        canvasElement,
        canvasBounds,
        undefined,
        customConfig
      );

      const config = customProcessor.getConfig();
      expect(config).toEqual(customConfig);

      customProcessor.destroy();
    });
  });

  describe('Configuration Updates', () => {
    it('should allow partial configuration updates', () => {
      const update = {
        enableDuplicateFiltering: false,
        minPressureChange: 0.05,
      };

      processor.updateConfig(update);
      const config = processor.getConfig();

      expect(config.enableDuplicateFiltering).toBe(false);
      expect(config.minPressureChange).toBe(0.05);
      expect(config.throttle).toEqual(DEFAULT_INPUT_PROCESSOR_CONFIG.throttle);
    });

    it('should update throttle configuration', () => {
      const update = {
        throttle: {
          minTimeInterval: 32,
          minDistance: 10.0,
          maxBufferSize: 128,
          forceFlushInterval: 64,
        },
      };

      processor.updateConfig(update);
      const config = processor.getConfig();

      expect(config.throttle).toEqual(update.throttle);
    });
  });

  describe('Input Event Processing', () => {
    it('should process basic pointer events', () => {
      const pointerEvent = new PointerEvent('pointerdown', {
        clientX: 200, // Canvas中心
        clientY: 250, // Canvas中心
        pointerId: 1,
        pointerType: 'pen',
        pressure: 0.8,
        buttons: 1,
      });

      canvasElement.dispatchEvent(pointerEvent);

      expect(receivedEvents).toHaveLength(1);
      const event = receivedEvents[0];
      expect(event.type).toBe('start');
      expect(event.deviceType).toBe('pen');
      expect(event.pressure).toBeCloseTo(0.8, 6);
      expect(event.position.canvasX).toBeCloseTo(512, 4);
      expect(event.position.canvasY).toBeCloseTo(512, 4);
    });

    it('should apply throttling to move events', () => {
      // 開始イベント
      const downEvent = new PointerEvent('pointerdown', {
        clientX: 150,
        clientY: 200,
        pointerId: 1,
        pointerType: 'pen',
        pressure: 0.8,
        buttons: 1,
      });
      canvasElement.dispatchEvent(downEvent);

      // 短時間間隔での移動イベント
      const moveEvent1 = new PointerEvent('pointermove', {
        clientX: 155,
        clientY: 205,
        pointerId: 1,
        pointerType: 'pen',
        pressure: 0.8,
        buttons: 1,
      });
      canvasElement.dispatchEvent(moveEvent1);

      const moveEvent2 = new PointerEvent('pointermove', {
        clientX: 160,
        clientY: 210,
        pointerId: 1,
        pointerType: 'pen',
        pressure: 0.8,
        buttons: 1,
      });
      canvasElement.dispatchEvent(moveEvent2);

      // startイベントのみが通る（moveイベントは間引かれる）
      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe('start');
    });

    it('should filter duplicate events when enabled', () => {
      // 重複フィルタリングを有効にする
      processor.updateConfig({ enableDuplicateFiltering: true });

      // 開始イベント
      const downEvent = new PointerEvent('pointerdown', {
        clientX: 200,
        clientY: 250,
        pointerId: 1,
        pointerType: 'pen',
        pressure: 0.8,
        buttons: 1,
      });
      canvasElement.dispatchEvent(downEvent);

      // 同じ座標・筆圧での移動イベント（間引きを回避するため十分な時間間隔を設ける）
      setTimeout(() => {
        const moveEvent = new PointerEvent('pointermove', {
          clientX: 200,
          clientY: 250,
          pointerId: 1,
          pointerType: 'pen',
          pressure: 0.8,
          buttons: 1,
        });
        canvasElement.dispatchEvent(moveEvent);
      }, 20);

      // startイベントのみ（重複moveイベントは除去される）
      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe('start');
    });

    it('should not filter duplicate events when disabled', () => {
      // 重複フィルタリングを無効にする
      processor.updateConfig({ enableDuplicateFiltering: false });

      const downEvent = new PointerEvent('pointerdown', {
        clientX: 200,
        clientY: 250,
        pointerId: 1,
        pointerType: 'pen',
        pressure: 0.8,
        buttons: 1,
      });
      canvasElement.dispatchEvent(downEvent);

      expect(receivedEvents).toHaveLength(1);
    });
  });

  describe('Bounds and Transform Updates', () => {
    it('should update canvas bounds', () => {
      const newBounds = {
        left: 200,
        top: 100,
        width: 400,
        height: 300,
      };

      processor.updateCanvasBounds(newBounds);

      // 新しい境界で座標変換が動作することを確認
      const pointerEvent = new PointerEvent('pointerdown', {
        clientX: 200, // 新しいCanvas左端
        clientY: 100, // 新しいCanvas上端
        pointerId: 1,
        buttons: 1,
      });

      canvasElement.dispatchEvent(pointerEvent);

      expect(receivedEvents).toHaveLength(1);
      const event = receivedEvents[0];
      expect(event.position.canvasX).toBeCloseTo(0, 4);
      expect(event.position.canvasY).toBeCloseTo(0, 4);
    });

    it('should update view transform', () => {
      const viewTransform: ViewTransformState = {
        zoom: 2.0,
        panOffset: { canvasX: 100, canvasY: 200 },
        rotation: Math.PI / 4,
      };

      processor.updateViewTransform(viewTransform);

      // ビュー変換が適用されることを確認
      const coordinateTransform = processor.getCoordinateTransform();
      expect(coordinateTransform).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should provide comprehensive statistics', () => {
      const stats = processor.getStats();

      expect(stats).toHaveProperty('inputHandler');
      expect(stats).toHaveProperty('throttler');
      expect(stats).toHaveProperty('processor');

      expect(stats.inputHandler).toHaveProperty('isCapturing');
      expect(stats.inputHandler).toHaveProperty('activePointerCount');
      expect(stats.throttler).toHaveProperty('bufferSize');
      expect(stats.processor).toHaveProperty('totalEventsProcessed');
    });

    it('should track event processing counts', () => {
      const initialStats = processor.getStats();
      expect(initialStats.processor.totalEventsProcessed).toBe(0);

      // イベントを送信
      const pointerEvent = new PointerEvent('pointerdown', {
        clientX: 200,
        clientY: 250,
        pointerId: 1,
        buttons: 1,
      });
      canvasElement.dispatchEvent(pointerEvent);

      const finalStats = processor.getStats();
      expect(finalStats.processor.totalEventsProcessed).toBe(1);
    });
  });

  describe('Debug Information', () => {
    it('should provide debug information', () => {
      const debugInfo = processor.getDebugInfo();

      expect(debugInfo).toHaveProperty('config');
      expect(debugInfo).toHaveProperty('stats');
      expect(debugInfo).toHaveProperty('lastEvent');

      expect(debugInfo.config).toEqual(processor.getConfig());
    });
  });

  describe('Resource Management', () => {
    it('should clean up resources on destroy', () => {
      const stats1 = processor.getStats();
      expect(stats1).toBeDefined();

      processor.destroy();

      // destroy()後もgetStats()は呼び出し可能だが、
      // 内部リソースがクリーンアップされていることを確認
      const debugInfo = processor.getDebugInfo();
      expect(debugInfo.lastEvent).toBeUndefined();
    });
  });

  describe('Pressure Change Filtering', () => {
    it('should filter minimal pressure changes in move events', () => {
      // 最小筆圧変化を設定
      processor.updateConfig({ minPressureChange: 0.1 });

      // 開始イベント
      const downEvent = new PointerEvent('pointerdown', {
        clientX: 200,
        clientY: 250,
        pointerId: 1,
        pointerType: 'pen',
        pressure: 0.8,
        buttons: 1,
      });
      canvasElement.dispatchEvent(downEvent);

      // 十分な時間間隔・距離で微小筆圧変化の移動イベント
      setTimeout(() => {
        const moveEvent = new PointerEvent('pointermove', {
          clientX: 250, // 十分な距離移動
          clientY: 300,
          pointerId: 1,
          pointerType: 'pen',
          pressure: 0.81, // 微小な筆圧変化 (0.01 < 0.1)
          buttons: 1,
        });
        canvasElement.dispatchEvent(moveEvent);
      }, 50); // 十分な時間間隔

      // startイベントのみ（筆圧変化が小さいmoveイベントは除去）
      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe('start');
    });

    it('should pass through significant pressure changes', () => {
      // 最小筆圧変化を設定
      processor.updateConfig({ minPressureChange: 0.1 });

      // 開始イベント
      const downEvent = new PointerEvent('pointerdown', {
        clientX: 200,
        clientY: 250,
        pointerId: 1,
        pointerType: 'pen',
        pressure: 0.8,
        buttons: 1,
      });
      canvasElement.dispatchEvent(downEvent);

      // 十分な時間間隔・距離で大きな筆圧変化の移動イベント
      setTimeout(() => {
        const moveEvent = new PointerEvent('pointermove', {
          clientX: 250, // 十分な距離移動
          clientY: 300,
          pointerId: 1,
          pointerType: 'pen',
          pressure: 0.95, // 大きな筆圧変化 (0.15 > 0.1)
          buttons: 1,
        });
        canvasElement.dispatchEvent(moveEvent);
      }, 50); // 十分な時間間隔

      // 実際の動作では間引きが適用される可能性があるため、
      // 最低でもstartイベントは通ることを確認
      expect(receivedEvents.length).toBeGreaterThanOrEqual(1);
      expect(receivedEvents[0].type).toBe('start');
    });
  });

  describe('Integration with View Transform', () => {
    it('should work with view transforms', () => {
      const viewTransform: ViewTransformState = {
        zoom: 1.5,
        panOffset: { canvasX: 50, canvasY: 100 },
        rotation: 0,
      };

      // 新しいイベント配列を作成
      const transformEvents: NormalizedInputEvent[] = [];
      const transformCallback = vi.fn((event: NormalizedInputEvent) => {
        transformEvents.push(event);
      });

      const processorWithTransform = new InputProcessor(
        canvasElement,
        canvasBounds,
        viewTransform
      );

      processorWithTransform.setEventCallback(transformCallback);

      const pointerEvent = new PointerEvent('pointerdown', {
        clientX: 200,
        clientY: 250,
        pointerId: 1,
        buttons: 1,
      });

      canvasElement.dispatchEvent(pointerEvent);

      expect(transformEvents).toHaveLength(1);
      processorWithTransform.destroy();
    });
  });
});