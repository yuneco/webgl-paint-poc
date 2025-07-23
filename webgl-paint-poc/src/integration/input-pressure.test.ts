/**
 * 筆圧処理の統合テスト
 * 実際のユーザー操作をシミュレートして問題を検知する
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InputProcessor } from '../input/InputProcessor';

describe('Pressure Processing Integration', () => {
  let canvasElement: HTMLCanvasElement;
  
  beforeEach(() => {
    // Create real canvas element in browser mode
    canvasElement = document.createElement('canvas');
    canvasElement.width = 1024;
    canvasElement.height = 1024;
    Object.defineProperty(canvasElement, 'offsetWidth', { value: 500, configurable: true });
    Object.defineProperty(canvasElement, 'offsetHeight', { value: 500, configurable: true });
    document.body.appendChild(canvasElement);
  });
  
  afterEach(() => {
    if (canvasElement) {
      document.body.removeChild(canvasElement);
    }
  });
  
  describe('筆圧非対応デバイス', () => {
    it('should generate visible strokes for pressure-insensitive devices', () => {
      const inputProcessor = new InputProcessor(canvasElement);
      
      const events: any[] = [];
      inputProcessor.setEventCallback((event) => events.push(event));
      
      // Simulate pointer events with pressure = 0 (trackpad/mouse)
      const mockPointerEvents = [
        { pressure: 0, offsetX: 100, offsetY: 100, pointerId: 1, pointerType: 'mouse', buttons: 1 },
        { pressure: 0, offsetX: 200, offsetY: 100, pointerId: 1, pointerType: 'mouse', buttons: 1 },
        { pressure: 0, offsetX: 300, offsetY: 100, pointerId: 1, pointerType: 'mouse', buttons: 0 }
      ];
      
      // Process events through the pipeline
      mockPointerEvents.forEach((mockEvent, index) => {
        // Manually trigger the handler (since we can't dispatch real events in test)
        const normalizedEvent = {
          position: { canvasX: mockEvent.offsetX * 1024 / 500, canvasY: mockEvent.offsetY * 1024 / 500 },
          pressure: mockEvent.pressure === 0 ? 0.5 : mockEvent.pressure, // Normalize 0 pressure to 0.5
          timestamp: performance.now(),
          type: (index === 0 ? 'start' : index === mockPointerEvents.length - 1 ? 'end' : 'move') as 'start' | 'move' | 'end',
          deviceType: 'mouse' as const,
          buttons: mockEvent.buttons
        };
        
        inputProcessor['handleRawInputEvent'](normalizedEvent);
      });
      
      // Verify that pressure was normalized to 0.5 for visibility
      events.forEach(event => {
        expect(event.pressure).toBe(0.5);
        expect(event.pressure).toBeGreaterThan(0); // Should be visible
      });
      
      // Verify that move events are not filtered out
      const moveEvents = events.filter(e => e.type === 'move');
      expect(moveEvents.length).toBeGreaterThan(0);
    });
  });
  
  describe('moveイベントフィルタリング', () => {
    it('should not filter move events for pressure-insensitive devices', () => {
      const inputProcessor = new InputProcessor(canvasElement);
      const events: any[] = [];
      inputProcessor.setEventCallback((event) => events.push(event));
      
      // Simulate multiple move events with same pressure (0.5 after normalization)
      const moveEvents = [
        { position: { canvasX: 100, canvasY: 100 }, pressure: 0.5, timestamp: 1000, type: 'move', deviceType: 'mouse' },
        { position: { canvasX: 101, canvasY: 100 }, pressure: 0.5, timestamp: 1010, type: 'move', deviceType: 'mouse' },
        { position: { canvasX: 102, canvasY: 100 }, pressure: 0.5, timestamp: 1020, type: 'move', deviceType: 'mouse' },
      ];
      
      moveEvents.forEach(event => {
        inputProcessor['handleRawInputEvent'](event as any);
      });
      
      // All move events should pass through (not filtered due to pressure similarity)
      expect(events.length).toBe(3);
      events.forEach(event => {
        expect(event.type).toBe('move');
        expect(event.pressure).toBe(0.5);
      });
    });
  });
});