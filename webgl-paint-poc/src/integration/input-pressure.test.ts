/**
 * 筆圧処理の統合テスト
 * 実際のユーザー操作をシミュレートして問題を検知する
 */

import { InputEventHandler } from '../input/InputEventHandler';
import { InputProcessor } from '../input/InputProcessor';
import type { CanvasBounds } from '../types/coordinates';

describe('Pressure Processing Integration', () => {
  const mockCanvas = document.createElement('canvas');
  const canvasBounds: CanvasBounds = { left: 0, top: 0, width: 500, height: 500 };
  
  describe('筆圧非対応デバイス', () => {
    it('should generate visible strokes for pressure-insensitive devices', () => {
      const inputHandler = new InputEventHandler(mockCanvas, canvasBounds);
      const inputProcessor = new InputProcessor(mockCanvas, canvasBounds);
      
      const events: any[] = [];
      inputProcessor.setEventCallback((event) => events.push(event));
      
      // Simulate pointer events with pressure = 0 (trackpad/mouse)
      const mockPointerEvents = [
        { pressure: 0, clientX: 100, clientY: 100, pointerId: 1, pointerType: 'mouse', buttons: 1 },
        { pressure: 0, clientX: 200, clientY: 100, pointerId: 1, pointerType: 'mouse', buttons: 1 },
        { pressure: 0, clientX: 300, clientY: 100, pointerId: 1, pointerType: 'mouse', buttons: 0 }
      ];
      
      // Process events through the pipeline
      mockPointerEvents.forEach((mockEvent, index) => {
        const eventType = index === 0 ? 'pointerdown' : 
                         index === mockPointerEvents.length - 1 ? 'pointerup' : 'pointermove';
        
        // Manually trigger the handler (since we can't dispatch real events in test)
        const normalizedEvent = {
          position: { canvasX: mockEvent.clientX, canvasY: mockEvent.clientY },
          pressure: mockEvent.pressure,
          timestamp: performance.now(),
          type: index === 0 ? 'start' : index === mockPointerEvents.length - 1 ? 'end' : 'move',
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
      const inputProcessor = new InputProcessor(mockCanvas, canvasBounds);
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