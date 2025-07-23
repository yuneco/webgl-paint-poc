/**
 * InputEventHandlerのテスト
 * Pointer Events API統合と入力正規化の検証
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InputEventHandler, type NormalizedInputEvent } from './InputEventHandler';
import type { ViewTransformState } from '../types/coordinates';

describe('InputEventHandler', () => {
  let canvasElement: HTMLCanvasElement;
  let inputHandler: InputEventHandler;
  let eventCallback: ReturnType<typeof vi.fn>;
  let receivedEvents: NormalizedInputEvent[];

  beforeEach(() => {
    // Mock Canvas要素
    canvasElement = document.createElement('canvas');
    canvasElement.width = 1024;
    canvasElement.height = 1024;
    document.body.appendChild(canvasElement);

    // Canvas element has real offsetWidth/offsetHeight in browser mode
    Object.defineProperty(canvasElement, 'offsetWidth', { value: 200, configurable: true });
    Object.defineProperty(canvasElement, 'offsetHeight', { value: 200, configurable: true });

    // イベントコールバックのモック
    receivedEvents = [];
    eventCallback = vi.fn((event: NormalizedInputEvent) => {
      receivedEvents.push(event);
    });

    // InputEventHandler初期化
    inputHandler = new InputEventHandler(canvasElement);
    inputHandler.setEventCallback(eventCallback);

    // Mock only setPointerCapture/releasePointerCapture (necessary for testing) but use real PointerEvent
    canvasElement.setPointerCapture = vi.fn();
    canvasElement.releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    inputHandler.destroy();
    document.body.removeChild(canvasElement);
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with canvas element and bounds', () => {
      expect(inputHandler).toBeInstanceOf(InputEventHandler);
      expect(inputHandler.isCurrentlyCapturing()).toBe(false);
      expect(inputHandler.getActivePointerCount()).toBe(0);
    });

    it('should setup event listeners on canvas element', () => {
      const addEventListenerSpy = vi.spyOn(canvasElement, 'addEventListener');
      
      // 新しいハンドラーを作成してイベントリスナーの追加を確認
      const newHandler = new InputEventHandler(canvasElement);
      
      // Pointer Events が利用可能な場合
      if ('PointerEvent' in window) {
        expect(addEventListenerSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function));
        expect(addEventListenerSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
        expect(addEventListenerSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
      }
      
      newHandler.destroy();
    });

    it('should accept view transform state', () => {
      const viewTransform: ViewTransformState = {
        zoom: 2.0,
        panOffset: { canvasX: 50, canvasY: 100 },
        rotation: Math.PI / 4,
      };

      const newHandler = new InputEventHandler(canvasElement, viewTransform);
      expect(newHandler).toBeInstanceOf(InputEventHandler);
      newHandler.destroy();
    });
  });

  describe('Pointer Events Integration', () => {
    it('should handle pointer down event correctly', () => {
      const pointerEvent = new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'pen',
        pressure: 0.8,
        tiltX: 10,
        tiltY: -5,
        buttons: 1,
      });
      // Canvas center coordinates (Canvas size is 200x200, so center is 100, 100)
      Object.defineProperty(pointerEvent, 'offsetX', { value: 100, configurable: true });
      Object.defineProperty(pointerEvent, 'offsetY', { value: 100, configurable: true });

      canvasElement.dispatchEvent(pointerEvent);

      expect(receivedEvents).toHaveLength(1);
      const event = receivedEvents[0];
      
      expect(event.type).toBe('start');
      expect(event.deviceType).toBe('pen');
      expect(event.pressure).toBeCloseTo(0.8, 6);
      expect(event.position.canvasX).toBeCloseTo(512, 4); // Canvas中心
      expect(event.position.canvasY).toBeCloseTo(512, 4);
      expect(event.buttons).toBe(1);
      expect(event.tiltX).toBe(10);
      expect(event.tiltY).toBe(-5);
      expect(event.timestamp).toBeGreaterThan(0);
      
      expect(inputHandler.isCurrentlyCapturing()).toBe(true);
      expect(inputHandler.getActivePointerCount()).toBe(1);
    });

    it('should handle pointer move event correctly', () => {
      // 最初にポインターダウン
      const downEvent = new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'touch',
        pressure: 0.6,
        buttons: 1,
      });
      Object.defineProperty(downEvent, 'offsetX', { value: 50, configurable: true });
      Object.defineProperty(downEvent, 'offsetY', { value: 50, configurable: true });
      canvasElement.dispatchEvent(downEvent);

      // ポインター移動
      const moveEvent = new PointerEvent('pointermove', {
        pointerId: 1,
        pointerType: 'touch',
        pressure: 0.7,
        buttons: 1,
      });
      Object.defineProperty(moveEvent, 'offsetX', { value: 150, configurable: true });
      Object.defineProperty(moveEvent, 'offsetY', { value: 150, configurable: true });
      canvasElement.dispatchEvent(moveEvent);

      expect(receivedEvents).toHaveLength(2);
      
      const startEvent = receivedEvents[0];
      expect(startEvent.type).toBe('start');
      expect(startEvent.position.canvasX).toBeCloseTo(256, 4); // 50 / 200 * 1024
      expect(startEvent.position.canvasY).toBeCloseTo(256, 4); // 50 / 200 * 1024

      const moveEventData = receivedEvents[1];
      expect(moveEventData.type).toBe('move');
      expect(moveEventData.deviceType).toBe('touch');
      expect(moveEventData.pressure).toBeCloseTo(0.7, 6);
      expect(moveEventData.position.canvasX).toBeCloseTo(768, 4); // 150 / 200 * 1024
      expect(moveEventData.position.canvasY).toBeCloseTo(768, 4); // 150 / 200 * 1024
    });

    it('should handle pointer up event correctly', () => {
      // ポインターダウン
      const downEvent = new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'mouse',
        buttons: 1,
      });
      Object.defineProperty(downEvent, 'offsetX', { value: 100, configurable: true });
      Object.defineProperty(downEvent, 'offsetY', { value: 100, configurable: true });
      canvasElement.dispatchEvent(downEvent);

      // ポインターアップ
      const upEvent = new PointerEvent('pointerup', {
        pointerId: 1,
        pointerType: 'mouse',
        pressure: 0,
        buttons: 0,
      });
      Object.defineProperty(upEvent, 'offsetX', { value: 100, configurable: true });
      Object.defineProperty(upEvent, 'offsetY', { value: 100, configurable: true });
      canvasElement.dispatchEvent(upEvent);

      expect(receivedEvents).toHaveLength(2);
      
      const endEvent = receivedEvents[1];
      expect(endEvent.type).toBe('end');
      expect(endEvent.deviceType).toBe('mouse');
      expect(endEvent.pressure).toBe(0.5); // Normalized to 0.5 for mouse events when pressure is 0
      
      expect(inputHandler.isCurrentlyCapturing()).toBe(false);
      expect(inputHandler.getActivePointerCount()).toBe(0);
    });

    it('should ignore move events without active pointers', () => {
      // ポインターダウンなしで移動イベントを送信
      const moveEvent = new PointerEvent('pointermove', {
        pointerId: 1,
        pointerType: 'mouse',
      });
      Object.defineProperty(moveEvent, 'offsetX', { value: 100, configurable: true });
      Object.defineProperty(moveEvent, 'offsetY', { value: 100, configurable: true });
      canvasElement.dispatchEvent(moveEvent);

      expect(receivedEvents).toHaveLength(0);
      expect(inputHandler.isCurrentlyCapturing()).toBe(false);
    });

    it('should handle multiple simultaneous pointers', () => {
      // 最初のポインター
      const pointer1Down = new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'touch',
      });
      Object.defineProperty(pointer1Down, 'offsetX', { value: 75, configurable: true });
      Object.defineProperty(pointer1Down, 'offsetY', { value: 100, configurable: true });
      canvasElement.dispatchEvent(pointer1Down);

      // 2番目のポインター
      const pointer2Down = new PointerEvent('pointerdown', {
        pointerId: 2,
        pointerType: 'touch',
      });
      Object.defineProperty(pointer2Down, 'offsetX', { value: 125, configurable: true });
      Object.defineProperty(pointer2Down, 'offsetY', { value: 150, configurable: true });
      canvasElement.dispatchEvent(pointer2Down);

      expect(receivedEvents).toHaveLength(2);
      expect(inputHandler.getActivePointerCount()).toBe(2);
      expect(inputHandler.isCurrentlyCapturing()).toBe(true);

      // 最初のポインターを離す
      const pointer1Up = new PointerEvent('pointerup', {
        pointerId: 1,
        pointerType: 'touch',
      });
      Object.defineProperty(pointer1Up, 'offsetX', { value: 75, configurable: true });
      Object.defineProperty(pointer1Up, 'offsetY', { value: 100, configurable: true });
      canvasElement.dispatchEvent(pointer1Up);

      expect(receivedEvents).toHaveLength(3);
      expect(inputHandler.getActivePointerCount()).toBe(1);
      expect(inputHandler.isCurrentlyCapturing()).toBe(true);

      // 2番目のポインターを離す
      const pointer2Up = new PointerEvent('pointerup', {
        pointerId: 2,
        pointerType: 'touch',
      });
      Object.defineProperty(pointer2Up, 'offsetX', { value: 125, configurable: true });
      Object.defineProperty(pointer2Up, 'offsetY', { value: 150, configurable: true });
      canvasElement.dispatchEvent(pointer2Up);

      expect(receivedEvents).toHaveLength(4);
      expect(inputHandler.getActivePointerCount()).toBe(0);
      expect(inputHandler.isCurrentlyCapturing()).toBe(false);
    });

    it('should handle pointer cancel events', () => {
      // ポインターダウン
      const downEvent = new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'touch',
      });
      Object.defineProperty(downEvent, 'offsetX', { value: 100, configurable: true });
      Object.defineProperty(downEvent, 'offsetY', { value: 125, configurable: true });
      canvasElement.dispatchEvent(downEvent);

      expect(inputHandler.getActivePointerCount()).toBe(1);

      // ポインターキャンセル
      const cancelEvent = new PointerEvent('pointercancel', {
        pointerId: 1,
      });
      canvasElement.dispatchEvent(cancelEvent);

      expect(inputHandler.getActivePointerCount()).toBe(0);
      expect(inputHandler.isCurrentlyCapturing()).toBe(false);
    });
  });

  describe('Device Type Detection', () => {
    it('should correctly identify pen input', () => {
      const penEvent = new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'pen',
        pressure: 0.9,
        tiltX: 15,
        tiltY: -10,
      });
      Object.defineProperty(penEvent, 'offsetX', { value: 100, configurable: true });
      Object.defineProperty(penEvent, 'offsetY', { value: 125, configurable: true });

      canvasElement.dispatchEvent(penEvent);

      expect(receivedEvents).toHaveLength(1);
      const event = receivedEvents[0];
      expect(event.deviceType).toBe('pen');
      expect(event.pressure).toBeCloseTo(0.9, 6);
      expect(event.tiltX).toBe(15);
      expect(event.tiltY).toBe(-10);
    });

    it('should correctly identify touch input', () => {
      const touchEvent = new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'touch',
        pressure: 1.0,
      });
      Object.defineProperty(touchEvent, 'offsetX', { value: 100, configurable: true });
      Object.defineProperty(touchEvent, 'offsetY', { value: 125, configurable: true });

      canvasElement.dispatchEvent(touchEvent);

      expect(receivedEvents).toHaveLength(1);
      const event = receivedEvents[0];
      expect(event.deviceType).toBe('touch');
      expect(event.tiltX).toBeUndefined();
      expect(event.tiltY).toBeUndefined();
    });

    it('should correctly identify mouse input', () => {
      const mouseEvent = new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'mouse',
        buttons: 1,
      });
      Object.defineProperty(mouseEvent, 'offsetX', { value: 100, configurable: true });
      Object.defineProperty(mouseEvent, 'offsetY', { value: 125, configurable: true });

      canvasElement.dispatchEvent(mouseEvent);

      expect(receivedEvents).toHaveLength(1);
      const event = receivedEvents[0];
      expect(event.deviceType).toBe('mouse');
      expect(event.buttons).toBe(1);
    });
  });

  describe('Pressure Normalization', () => {
    it('should normalize pressure values correctly', () => {
      // 各テストケースを個別にテスト
      
      // Test case 1: 0.0 pressure
      receivedEvents = [];
      const event1 = new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'pen',
        pressure: 0.0,
      });
      Object.defineProperty(event1, 'offsetX', { value: 100, configurable: true });
      Object.defineProperty(event1, 'offsetY', { value: 125, configurable: true });
      canvasElement.dispatchEvent(event1);
      expect(receivedEvents[0].pressure).toBe(0.5); // 0.0 pressure is normalized to 0.5
      
      // Test case 2: 0.5 pressure  
      receivedEvents = [];
      const event2 = new PointerEvent('pointerdown', {
        pointerId: 2,
        pointerType: 'pen',
        pressure: 0.5,
      });
      Object.defineProperty(event2, 'offsetX', { value: 100, configurable: true });
      Object.defineProperty(event2, 'offsetY', { value: 125, configurable: true });
      canvasElement.dispatchEvent(event2);
      expect(receivedEvents[0].pressure).toBeCloseTo(0.5, 6);
      
      // Test case 3: 1.0 pressure
      receivedEvents = [];
      const event3 = new PointerEvent('pointerdown', {
        pointerId: 3,
        pointerType: 'pen',
        pressure: 1.0,
      });
      Object.defineProperty(event3, 'offsetX', { value: 100, configurable: true });
      Object.defineProperty(event3, 'offsetY', { value: 125, configurable: true });
      canvasElement.dispatchEvent(event3);
      expect(receivedEvents[0].pressure).toBeCloseTo(1.0, 6);
      
      // Test case 4: undefined pressure (no property)
      receivedEvents = [];
      const event4 = new PointerEvent('pointerdown', {
        pointerId: 4,
        pointerType: 'pen',
        // pressure property omitted
      });
      Object.defineProperty(event4, 'offsetX', { value: 100, configurable: true });
      Object.defineProperty(event4, 'offsetY', { value: 125, configurable: true });
      canvasElement.dispatchEvent(event4);
      expect(receivedEvents[0].pressure).toBe(0.5); // Default value
    });

    it('should clamp pressure values to valid range', () => {
      const event = new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'pen',
        pressure: 1.5, // 範囲外の値
      });
      Object.defineProperty(event, 'offsetX', { value: 100, configurable: true });
      Object.defineProperty(event, 'offsetY', { value: 125, configurable: true });

      canvasElement.dispatchEvent(event);

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].pressure).toBe(1.0); // クランプされる
    });
  });

  describe('Coordinate Transformation Integration', () => {
    it('should transform device coordinates to canvas coordinates', () => {
      const event = new PointerEvent('pointerdown', {
        pointerId: 1,
      });
      // Canvas element left/top edge coordinates
      Object.defineProperty(event, 'offsetX', { value: 0, configurable: true });
      Object.defineProperty(event, 'offsetY', { value: 0, configurable: true });

      canvasElement.dispatchEvent(event);

      expect(receivedEvents).toHaveLength(1);
      const receivedEvent = receivedEvents[0];
      expect(receivedEvent.position.canvasX).toBeCloseTo(0, 4);
      expect(receivedEvent.position.canvasY).toBeCloseTo(0, 4);
    });

    it('should handle coordinate transformation correctly', () => {
      const event = new PointerEvent('pointerdown', {
        pointerId: 1,
      });
      // Canvas element left/top edge coordinates
      Object.defineProperty(event, 'offsetX', { value: 0, configurable: true });
      Object.defineProperty(event, 'offsetY', { value: 0, configurable: true });

      canvasElement.dispatchEvent(event);

      expect(receivedEvents).toHaveLength(1);
      const receivedEvent = receivedEvents[0];
      expect(receivedEvent.position.canvasX).toBeCloseTo(0, 4);
      expect(receivedEvent.position.canvasY).toBeCloseTo(0, 4);
    });

    it('should handle view transform updates', () => {
      const viewTransform: ViewTransformState = {
        zoom: 2.0,
        panOffset: { canvasX: 100, canvasY: 200 },
        rotation: 0,
      };

      inputHandler.updateViewTransform(viewTransform);

      // ビュー変換が適用された座標変換が動作することを確認
      const transform = inputHandler.getCoordinateTransform();
      expect(transform).toBeDefined();
    });
  });

  describe('Event Prevention and Cleanup', () => {
    it('should prevent default behavior on touch events', () => {
      const touchEvent = new Event('touchstart');
      const preventDefaultSpy = vi.spyOn(touchEvent, 'preventDefault');

      canvasElement.dispatchEvent(touchEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should prevent context menu', () => {
      const contextMenuEvent = new Event('contextmenu');
      const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');

      canvasElement.dispatchEvent(contextMenuEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should clean up resources on destroy', () => {
      const removeEventListenerSpy = vi.spyOn(canvasElement, 'removeEventListener');

      inputHandler.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalled();
      expect(inputHandler.getActivePointerCount()).toBe(0);
      expect(inputHandler.isCurrentlyCapturing()).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle events outside canvas bounds', () => {
      const event = new PointerEvent('pointerdown', {
        pointerId: 1,
      });
      // Simulate coordinates outside the canvas bounds (negative offset)
      Object.defineProperty(event, 'offsetX', { value: -25, configurable: true });
      Object.defineProperty(event, 'offsetY', { value: -25, configurable: true });

      canvasElement.dispatchEvent(event);

      expect(receivedEvents).toHaveLength(1);
      const receivedEvent = receivedEvents[0];
      // 座標変換でクランプされる
      expect(receivedEvent.position.canvasX).toBe(0);
      expect(receivedEvent.position.canvasY).toBe(0);
    });

    it('should handle rapid successive events', () => {
      const events = [
        { event: new PointerEvent('pointerdown', { pointerId: 1 }), offsetX: 75, offsetY: 100 },
        { event: new PointerEvent('pointermove', { pointerId: 1 }), offsetX: 85, offsetY: 110 },
        { event: new PointerEvent('pointermove', { pointerId: 1 }), offsetX: 95, offsetY: 120 },
        { event: new PointerEvent('pointermove', { pointerId: 1 }), offsetX: 105, offsetY: 130 },
        { event: new PointerEvent('pointerup', { pointerId: 1 }), offsetX: 115, offsetY: 140 },
      ];

      events.forEach(({ event, offsetX, offsetY }) => {
        Object.defineProperty(event, 'offsetX', { value: offsetX, configurable: true });
        Object.defineProperty(event, 'offsetY', { value: offsetY, configurable: true });
        canvasElement.dispatchEvent(event);
      });

      expect(receivedEvents).toHaveLength(5);
      expect(receivedEvents[0].type).toBe('start');
      expect(receivedEvents[1].type).toBe('move');
      expect(receivedEvents[2].type).toBe('move');
      expect(receivedEvents[3].type).toBe('move');
      expect(receivedEvents[4].type).toBe('end');
    });

    it('should maintain event order with overlapping pointers', () => {
      const events = [
        { event: new PointerEvent('pointerdown', { pointerId: 1 }), offsetX: 75, offsetY: 100 },
        { event: new PointerEvent('pointerdown', { pointerId: 2 }), offsetX: 125, offsetY: 150 },
        { event: new PointerEvent('pointermove', { pointerId: 1 }), offsetX: 80, offsetY: 105 },
        { event: new PointerEvent('pointermove', { pointerId: 2 }), offsetX: 130, offsetY: 155 },
        { event: new PointerEvent('pointerup', { pointerId: 1 }), offsetX: 85, offsetY: 110 },
        { event: new PointerEvent('pointerup', { pointerId: 2 }), offsetX: 135, offsetY: 160 },
      ];

      events.forEach(({ event, offsetX, offsetY }) => {
        Object.defineProperty(event, 'offsetX', { value: offsetX, configurable: true });
        Object.defineProperty(event, 'offsetY', { value: offsetY, configurable: true });
        canvasElement.dispatchEvent(event);
      });

      expect(receivedEvents).toHaveLength(6);
      
      // イベントが正しい順序で処理されている
      expect(receivedEvents[0].type).toBe('start');
      expect(receivedEvents[1].type).toBe('start');
      expect(receivedEvents[2].type).toBe('move');
      expect(receivedEvents[3].type).toBe('move');
      expect(receivedEvents[4].type).toBe('end');
      expect(receivedEvents[5].type).toBe('end');
    });
  });
});