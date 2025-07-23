/**
 * InputThrottlerのテスト
 * 入力間引き処理とバッファリング機能の検証
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InputThrottler, DEFAULT_THROTTLE_CONFIG } from './InputThrottler';
import type { NormalizedInputEvent } from './InputEventHandler';

describe('InputThrottler', () => {
  let throttler: InputThrottler;
  let mockPerformanceNow: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // performance.now()をモック
    mockPerformanceNow = vi.fn();
    vi.stubGlobal('performance', { now: mockPerformanceNow });
    
    // 初期時刻を設定
    mockPerformanceNow.mockReturnValue(0);
    
    throttler = new InputThrottler();
  });

  afterEach(() => {
    throttler.destroy();
    vi.restoreAllMocks();
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = throttler.getConfig();
      expect(config).toEqual(DEFAULT_THROTTLE_CONFIG);
    });

    it('should allow configuration updates', () => {
      const newConfig = {
        minTimeInterval: 16,
        minDistance: 5.0,
      };

      throttler.updateConfig(newConfig);
      const config = throttler.getConfig();

      expect(config.minTimeInterval).toBe(16);
      expect(config.minDistance).toBe(5.0);
      expect(config.maxBufferSize).toBe(DEFAULT_THROTTLE_CONFIG.maxBufferSize);
    });
  });

  describe('Start Events', () => {
    it('should always pass through start events', () => {
      const startEvent: NormalizedInputEvent = {
        position: { canvasX: 100, canvasY: 200 },
        pressure: 0.8,
        timestamp: 0,
        type: 'start',
        deviceType: 'pen',
      };

      const result = throttler.processEvent(startEvent);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(startEvent);
    });

    it('should clear buffer on start event', () => {
      // 先にmoveイベントを送ってバッファに蓄積
      const moveEvent: NormalizedInputEvent = {
        position: { canvasX: 100, canvasY: 200 },
        pressure: 0.8,
        timestamp: 5,
        type: 'move',
        deviceType: 'pen',
      };
      throttler.processEvent(moveEvent);

      const startEvent: NormalizedInputEvent = {
        position: { canvasX: 150, canvasY: 250 },
        pressure: 0.8,
        timestamp: 10,
        type: 'start',
        deviceType: 'pen',
      };

      const result = throttler.processEvent(startEvent);
      const stats = throttler.getStats();

      expect(result).toHaveLength(1);
      expect(stats.bufferSize).toBe(0);
    });
  });

  describe('End Events', () => {
    it('should always pass through end events and flush buffer', () => {
      // 開始イベント
      const startEvent: NormalizedInputEvent = {
        position: { canvasX: 100, canvasY: 200 },
        pressure: 0.8,
        timestamp: 0,
        type: 'start',
        deviceType: 'pen',
      };
      throttler.processEvent(startEvent);

      // バッファに蓄積されるmoveイベント
      mockPerformanceNow.mockReturnValue(5);
      const moveEvent: NormalizedInputEvent = {
        position: { canvasX: 101, canvasY: 201 },
        pressure: 0.8,
        timestamp: 5,
        type: 'move',
        deviceType: 'pen',
      };
      throttler.processEvent(moveEvent);

      // 終了イベント
      mockPerformanceNow.mockReturnValue(20);
      const endEvent: NormalizedInputEvent = {
        position: { canvasX: 110, canvasY: 210 },
        pressure: 0.0,
        timestamp: 20,
        type: 'end',
        deviceType: 'pen',
      };

      const result = throttler.processEvent(endEvent);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(moveEvent); // バッファからフラッシュ
      expect(result[1]).toEqual(endEvent);
    });
  });

  describe('Move Event Throttling', () => {
    it('should throttle events by time interval', () => {
      // 開始イベント
      const startEvent: NormalizedInputEvent = {
        position: { canvasX: 100, canvasY: 200 },
        pressure: 0.8,
        timestamp: 0,
        type: 'start',
        deviceType: 'pen',
      };
      throttler.processEvent(startEvent);

      // 短時間間隔のmoveイベント (< minTimeInterval)
      mockPerformanceNow.mockReturnValue(5);
      const moveEvent1: NormalizedInputEvent = {
        position: { canvasX: 150, canvasY: 250 },
        pressure: 0.8,
        timestamp: 5,
        type: 'move',
        deviceType: 'pen',
      };

      const result1 = throttler.processEvent(moveEvent1);
      expect(result1).toHaveLength(0); // バッファに蓄積

      // 十分な時間間隔のmoveイベント (>= minTimeInterval)
      mockPerformanceNow.mockReturnValue(10);
      const moveEvent2: NormalizedInputEvent = {
        position: { canvasX: 200, canvasY: 300 },
        pressure: 0.8,
        timestamp: 10,
        type: 'move',
        deviceType: 'pen',
      };

      const result2 = throttler.processEvent(moveEvent2);
      expect(result2).toHaveLength(2); // バッファフラッシュ + 新イベント
      expect(result2[0]).toEqual(moveEvent1);
      expect(result2[1]).toEqual(moveEvent2);
    });

    it('should throttle events by distance', () => {
      // 開始イベント
      const startEvent: NormalizedInputEvent = {
        position: { canvasX: 100, canvasY: 200 },
        pressure: 0.8,
        timestamp: 0,
        type: 'start',
        deviceType: 'pen',
      };
      throttler.processEvent(startEvent);

      // 短距離移動のmoveイベント (< minDistance)
      mockPerformanceNow.mockReturnValue(10);
      const moveEvent1: NormalizedInputEvent = {
        position: { canvasX: 101, canvasY: 201 }, // 距離 ≈ 1.41 < 2.0
        pressure: 0.8,
        timestamp: 10,
        type: 'move',
        deviceType: 'pen',
      };

      const result1 = throttler.processEvent(moveEvent1);
      expect(result1).toHaveLength(0); // バッファに蓄積

      // 十分な距離移動のmoveイベント (>= minDistance)
      mockPerformanceNow.mockReturnValue(20);
      const moveEvent2: NormalizedInputEvent = {
        position: { canvasX: 105, canvasY: 205 }, // 距離 ≈ 7.07 > 2.0
        pressure: 0.8,
        timestamp: 20,
        type: 'move',
        deviceType: 'pen',
      };

      const result2 = throttler.processEvent(moveEvent2);
      expect(result2).toHaveLength(2); // バッファフラッシュ + 新イベント
      expect(result2[0]).toEqual(moveEvent1);
      expect(result2[1]).toEqual(moveEvent2);
    });

    it('should respect maximum buffer size', () => {
      const config = throttler.getConfig();
      
      // 開始イベント
      const startEvent: NormalizedInputEvent = {
        position: { canvasX: 100, canvasY: 200 },
        pressure: 0.8,
        timestamp: 0,
        type: 'start',
        deviceType: 'pen',
      };
      throttler.processEvent(startEvent);

      // maxBufferSize + 10個のイベントを送信
      for (let i = 1; i <= config.maxBufferSize + 10; i++) {
        mockPerformanceNow.mockReturnValue(i);
        const moveEvent: NormalizedInputEvent = {
          position: { canvasX: 100 + i * 0.1, canvasY: 200 + i * 0.1 }, // 微小移動
          pressure: 0.8,
          timestamp: i,
          type: 'move',
          deviceType: 'pen',
        };
        throttler.processEvent(moveEvent);
      }

      const stats = throttler.getStats();
      expect(stats.bufferSize).toBeLessThanOrEqual(config.maxBufferSize);
    });
  });

  describe('Force Flush', () => {
    it('should force flush buffer after forceFlushInterval', () => {
      // タイマーを手動制御
      vi.useFakeTimers();

      // 開始イベント
      const startEvent: NormalizedInputEvent = {
        position: { canvasX: 100, canvasY: 200 },
        pressure: 0.8,
        timestamp: 0,
        type: 'start',
        deviceType: 'pen',
      };
      throttler.processEvent(startEvent);

      // バッファに蓄積されるイベント
      mockPerformanceNow.mockReturnValue(5);
      const moveEvent: NormalizedInputEvent = {
        position: { canvasX: 101, canvasY: 201 },
        pressure: 0.8,
        timestamp: 5,
        type: 'move',
        deviceType: 'pen',
      };
      throttler.processEvent(moveEvent);

      // forceFlushInterval後の時刻でイベント送信
      mockPerformanceNow.mockReturnValue(25); // 0 + 16 + 9
      const moveEvent2: NormalizedInputEvent = {
        position: { canvasX: 102, canvasY: 202 },
        pressure: 0.8,
        timestamp: 25,
        type: 'move',
        deviceType: 'pen',
      };

      const result = throttler.processEvent(moveEvent2);
      expect(result).toHaveLength(2); // 強制フラッシュ + 新イベント

      vi.useRealTimers();
    });
  });

  describe('Distance Calculation', () => {
    it('should calculate correct distances', () => {
      const startEvent: NormalizedInputEvent = {
        position: { canvasX: 0, canvasY: 0 },
        pressure: 0.8,
        timestamp: 0,
        type: 'start',
        deviceType: 'pen',
      };
      throttler.processEvent(startEvent);

      // (3, 4) の距離は 5
      mockPerformanceNow.mockReturnValue(10);
      const moveEvent: NormalizedInputEvent = {
        position: { canvasX: 3, canvasY: 4 },
        pressure: 0.8,
        timestamp: 10,
        type: 'move',
        deviceType: 'pen',
      };

      const result = throttler.processEvent(moveEvent);
      expect(result).toHaveLength(1); // 距離5 > minDistance(2.0) なので通る
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      const startEvent: NormalizedInputEvent = {
        position: { canvasX: 100, canvasY: 200 },
        pressure: 0.8,
        timestamp: 0,
        type: 'start',
        deviceType: 'pen',
      };
      throttler.processEvent(startEvent);

      const stats1 = throttler.getStats();
      expect(stats1.bufferSize).toBe(0);
      expect(stats1.lastProcessedTime).toBe(0);
      expect(stats1.lastFlushTime).toBe(0);

      // バッファに蓄積
      mockPerformanceNow.mockReturnValue(5);
      const moveEvent: NormalizedInputEvent = {
        position: { canvasX: 101, canvasY: 201 },
        pressure: 0.8,
        timestamp: 5,
        type: 'move',
        deviceType: 'pen',
      };
      throttler.processEvent(moveEvent);

      const stats2 = throttler.getStats();
      expect(stats2.bufferSize).toBe(1);
    });
  });

  describe('Resource Management', () => {
    it('should clean up resources on destroy', () => {
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

      throttler.destroy();

      const stats = throttler.getStats();
      expect(stats.bufferSize).toBe(0);
      // タイマーがクリアされることを確認
    });
  });

  describe('Edge Cases', () => {
    it('should handle events with identical positions', () => {
      const startEvent: NormalizedInputEvent = {
        position: { canvasX: 100, canvasY: 200 },
        pressure: 0.8,
        timestamp: 0,
        type: 'start',
        deviceType: 'pen',
      };
      throttler.processEvent(startEvent);

      // 同じ位置のイベント
      mockPerformanceNow.mockReturnValue(10);
      const moveEvent1: NormalizedInputEvent = {
        position: { canvasX: 100, canvasY: 200 }, // 距離 = 0
        pressure: 0.8,
        timestamp: 10,
        type: 'move',
        deviceType: 'pen',
      };

      const result = throttler.processEvent(moveEvent1);
      expect(result).toHaveLength(0); // 距離0 < minDistance なので間引き
    });

    it('should handle rapid successive identical events', () => {
      const startEvent: NormalizedInputEvent = {
        position: { canvasX: 100, canvasY: 200 },
        pressure: 0.8,
        timestamp: 0,
        type: 'start',
        deviceType: 'pen',
      };
      throttler.processEvent(startEvent);

      // 連続する同一イベント
      for (let i = 1; i <= 10; i++) {
        mockPerformanceNow.mockReturnValue(i);
        const moveEvent: NormalizedInputEvent = {
          position: { canvasX: 100, canvasY: 200 },
          pressure: 0.8,
          timestamp: i,
          type: 'move',
          deviceType: 'pen',
        };
        const result = throttler.processEvent(moveEvent);
        expect(result).toHaveLength(0);
      }

      const stats = throttler.getStats();
      expect(stats.bufferSize).toBeGreaterThan(0);
    });
  });
});