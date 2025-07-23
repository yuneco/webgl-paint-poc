/**
 * 入力処理の統合レイヤー
 * InputEventHandler + InputThrottler の統合と、追加の正規化処理
 */

import { InputEventHandler, type InputEventCallback, type NormalizedInputEvent } from './InputEventHandler';
import { InputThrottler, type ThrottleConfig, DEFAULT_THROTTLE_CONFIG } from './InputThrottler';
import type { ViewTransformState } from '../types/coordinates';

/**
 * 入力処理設定
 */
export interface InputProcessorConfig {
  /** 間引き設定 */
  throttle: ThrottleConfig;
  /** 重複除去を有効にするか */
  enableDuplicateFiltering: boolean;
  /** 最小筆圧変化量 */
  minPressureChange: number;
}

/**
 * デフォルト入力処理設定
 */
export const DEFAULT_INPUT_PROCESSOR_CONFIG: InputProcessorConfig = {
  throttle: DEFAULT_THROTTLE_CONFIG,
  enableDuplicateFiltering: true,
  minPressureChange: 0.01, // 1%の筆圧変化
};

/**
 * 統合入力処理クラス
 */
export class InputProcessor {
  private inputHandler: InputEventHandler;
  private throttler: InputThrottler;
  private config: InputProcessorConfig;
  private finalCallback?: InputEventCallback;
  private lastEvent?: NormalizedInputEvent;

  constructor(
    canvasElement: HTMLCanvasElement,
    viewTransform?: ViewTransformState,
    config: InputProcessorConfig = DEFAULT_INPUT_PROCESSOR_CONFIG
  ) {
    this.config = config;
    this.throttler = new InputThrottler(config.throttle);
    
    // InputEventHandlerを初期化
    this.inputHandler = new InputEventHandler(canvasElement, viewTransform);
    
    // 内部処理チェーンを設定
    this.inputHandler.setEventCallback(this.handleRawInputEvent.bind(this));
  }

  /**
   * 最終的な入力イベントコールバックを設定
   */
  setEventCallback(callback: InputEventCallback): void {
    this.finalCallback = callback;
  }


  /**
   * ビュー変換を更新
   */
  updateViewTransform(viewTransform: ViewTransformState): void {
    this.inputHandler.updateViewTransform(viewTransform);
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<InputProcessorConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.throttle) {
      this.throttler.updateConfig(config.throttle);
    }
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): InputProcessorConfig {
    return { ...this.config };
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    inputHandler: {
      isCapturing: boolean;
      activePointerCount: number;
    };
    throttler: {
      bufferSize: number;
      lastProcessedTime?: number;
      lastFlushTime: number;
    };
    processor: {
      lastEventTime?: number;
      totalEventsProcessed: number;
    };
  } {
    return {
      inputHandler: {
        isCapturing: this.inputHandler.isCurrentlyCapturing(),
        activePointerCount: this.inputHandler.getActivePointerCount(),
      },
      throttler: this.throttler.getStats(),
      processor: {
        lastEventTime: this.lastEvent?.timestamp,
        totalEventsProcessed: this.eventCount,
      },
    };
  }

  /**
   * リソースを破棄
   */
  destroy(): void {
    this.inputHandler.destroy();
    this.throttler.destroy();
    this.lastEvent = undefined;
    this.finalCallback = undefined;
  }

  private eventCount: number = 0;

  /**
   * 生の入力イベントを処理
   */
  private handleRawInputEvent(event: NormalizedInputEvent): void {
    this.eventCount++;

    // 間引き処理を適用
    const throttledEvents = this.throttler.processEvent(event);

    // 各間引き済みイベントを処理
    for (const throttledEvent of throttledEvents) {
      const processedEvent = this.processEvent(throttledEvent);
      if (processedEvent) {
        this.lastEvent = processedEvent;
        this.finalCallback?.(processedEvent);
      }
    }
  }

  /**
   * 個別イベントの追加処理
   */
  private processEvent(event: NormalizedInputEvent): NormalizedInputEvent | null {
    // 重複除去フィルタ
    if (this.config.enableDuplicateFiltering && this.isDuplicateEvent(event)) {
      return null;
    }

    // 筆圧変化フィルタ（moveイベントのみ）
    if (event.type === 'move' && this.isMinimalPressureChange(event)) {
      return null;
    }

    return event;
  }

  /**
   * 重複イベントチェック
   */
  private isDuplicateEvent(event: NormalizedInputEvent): boolean {
    if (!this.lastEvent) {
      return false;
    }

    // 同じタイプで同じ位置・筆圧のイベントは重複とみなす
    return (
      this.lastEvent.type === event.type &&
      this.lastEvent.position.canvasX === event.position.canvasX &&
      this.lastEvent.position.canvasY === event.position.canvasY &&
      Math.abs(this.lastEvent.pressure - event.pressure) < this.config.minPressureChange
    );
  }

  /**
   * 最小筆圧変化チェック
   */
  private isMinimalPressureChange(event: NormalizedInputEvent): boolean {
    if (!this.lastEvent || event.type !== 'move') {
      return false;
    }

    // 筆圧非対応デバイス（pressure = 0.5）の場合はフィルタリングしない
    if (event.pressure === 0.5 && this.lastEvent.pressure === 0.5) {
      return false;
    }

    // 位置は変わったが筆圧変化が少ない場合
    const pressureChange = Math.abs(this.lastEvent.pressure - event.pressure);
    return pressureChange < this.config.minPressureChange;
  }

  /**
   * デバッグ用: 座標変換インスタンスを取得
   */
  public getCoordinateTransform() {
    return this.inputHandler.getCoordinateTransform();
  }

  /**
   * デバッグ用: 現在の処理状態を取得
   */
  public getDebugInfo(): {
    config: InputProcessorConfig;
    stats: ReturnType<InputProcessor['getStats']>;
    lastEvent?: NormalizedInputEvent;
  } {
    return {
      config: this.getConfig(),
      stats: this.getStats(),
      lastEvent: this.lastEvent,
    };
  }
}