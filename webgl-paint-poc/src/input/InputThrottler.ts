/**
 * 入力座標の間引き処理
 * 高頻度・近接入力の最適化とパフォーマンス向上
 */

import type { CanvasCoordinates } from '../types/coordinates';
import type { NormalizedInputEvent } from './InputEventHandler';

/**
 * 間引き設定
 */
export interface ThrottleConfig {
  /** 最小時間間隔 (ms) */
  minTimeInterval: number;
  /** 最小移動距離 (Canvas座標単位) */
  minDistance: number;
  /** 最大バッファサイズ */
  maxBufferSize: number;
  /** 強制フラッシュ間隔 (ms) */
  forceFlushInterval: number;
}

/**
 * デフォルト間引き設定
 */
export const DEFAULT_THROTTLE_CONFIG: ThrottleConfig = {
  minTimeInterval: 8, // 120 FPS相当
  minDistance: 1.0, // 1ピクセル相当に変更（より多くのmoveイベントを通す）
  maxBufferSize: 32,
  forceFlushInterval: 16, // 60 FPS相当
};

/**
 * 入力イベントの間引き処理クラス
 */
export class InputThrottler {
  private config: ThrottleConfig;
  private buffer: NormalizedInputEvent[] = [];
  private lastProcessedEvent?: NormalizedInputEvent;
  private lastFlushTime: number = 0;
  private forceFlushTimer?: number;
  
  constructor(config: ThrottleConfig = DEFAULT_THROTTLE_CONFIG) {
    this.config = config;
  }

  /**
   * 入力イベントを処理し、間引きされたイベントを返す
   */
  processEvent(event: NormalizedInputEvent): NormalizedInputEvent[] {
    // 開始イベントは常に通す
    if (event.type === 'start') {
      this.clearBuffer();
      this.lastProcessedEvent = event;
      this.lastFlushTime = event.timestamp;
      this.startForceFlushTimer();
      return [event];
    }

    // 終了イベントは常に通し、バッファをフラッシュ
    if (event.type === 'end') {
      const bufferedEvents = this.flushBuffer();
      this.clearBuffer();
      this.stopForceFlushTimer();
      return [...bufferedEvents, event];
    }

    // 移動イベントの間引き処理
    if (event.type === 'move') {
      return this.processMoveEvent(event);
    }

    return [event];
  }

  /**
   * 移動イベントの間引き処理
   */
  private processMoveEvent(event: NormalizedInputEvent): NormalizedInputEvent[] {
    // 時間間隔チェック
    if (this.lastProcessedEvent && 
        event.timestamp - this.lastProcessedEvent.timestamp < this.config.minTimeInterval) {
      this.addToBuffer(event);
      return this.checkForceFlush(event.timestamp);
    }

    // 距離チェック
    if (this.lastProcessedEvent && 
        this.calculateDistance(event.position, this.lastProcessedEvent.position) < this.config.minDistance) {
      this.addToBuffer(event);
      return this.checkForceFlush(event.timestamp);
    }

    // イベントを通す
    const bufferedEvents = this.flushBuffer();
    this.lastProcessedEvent = event;
    this.lastFlushTime = event.timestamp;
    
    return [...bufferedEvents, event];
  }

  /**
   * 座標間の距離を計算
   */
  private calculateDistance(pos1: CanvasCoordinates, pos2: CanvasCoordinates): number {
    const dx = pos1.canvasX - pos2.canvasX;
    const dy = pos1.canvasY - pos2.canvasY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * バッファにイベントを追加
   */
  private addToBuffer(event: NormalizedInputEvent): void {
    this.buffer.push(event);
    
    // バッファサイズ制限
    if (this.buffer.length > this.config.maxBufferSize) {
      this.buffer.shift(); // 古いイベントを削除
    }
  }

  /**
   * 強制フラッシュのチェック
   */
  private checkForceFlush(currentTime: number): NormalizedInputEvent[] {
    if (currentTime - this.lastFlushTime >= this.config.forceFlushInterval) {
      return this.flushBuffer();
    }
    return [];
  }

  /**
   * バッファをフラッシュして最新イベントを返す
   */
  private flushBuffer(): NormalizedInputEvent[] {
    if (this.buffer.length === 0) {
      return [];
    }

    // バッファから最新のイベントのみを取得
    const latestEvent = this.buffer[this.buffer.length - 1];
    this.buffer = [];
    this.lastProcessedEvent = latestEvent;
    this.lastFlushTime = latestEvent.timestamp;
    
    return [latestEvent];
  }

  /**
   * バッファをクリア
   */
  private clearBuffer(): void {
    this.buffer = [];
    this.lastProcessedEvent = undefined;
  }

  /**
   * 強制フラッシュタイマーを開始
   */
  private startForceFlushTimer(): void {
    this.stopForceFlushTimer();
    
    this.forceFlushTimer = window.setInterval(() => {
      if (this.buffer.length > 0) {
        this.flushBuffer();
      }
    }, this.config.forceFlushInterval);
  }

  /**
   * 強制フラッシュタイマーを停止
   */
  private stopForceFlushTimer(): void {
    if (this.forceFlushTimer !== undefined) {
      window.clearInterval(this.forceFlushTimer);
      this.forceFlushTimer = undefined;
    }
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<ThrottleConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): ThrottleConfig {
    return { ...this.config };
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    bufferSize: number;
    lastProcessedTime?: number;
    lastFlushTime: number;
  } {
    return {
      bufferSize: this.buffer.length,
      lastProcessedTime: this.lastProcessedEvent?.timestamp,
      lastFlushTime: this.lastFlushTime,
    };
  }

  /**
   * リソースを破棄
   */
  destroy(): void {
    this.stopForceFlushTimer();
    this.clearBuffer();
  }
}