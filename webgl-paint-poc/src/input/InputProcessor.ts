/**
 * 入力処理の統合レイヤー
 * InputEventHandler + InputThrottler の統合と、追加の正規化処理
 */

import { InputEventHandler, type InputEventCallback, type NormalizedInputEvent } from './InputEventHandler';
import { InputThrottler, type ThrottleConfig, DEFAULT_THROTTLE_CONFIG } from './InputThrottler';
import type { ViewTransformState } from '../types/coordinates';
import { coreStore } from '../store/coreStore';

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
        lastEventTime: coreStore.getState().inputProcessor.lastEvent?.timestamp,
        totalEventsProcessed: coreStore.getState().inputProcessor.eventCount,
      },
    };
  }

  /**
   * リソースを破棄
   */
  destroy(): void {
    this.inputHandler.destroy();
    this.throttler.destroy();
    coreStore.getState().resetInputProcessor();
    this.finalCallback = undefined;
  }


  /**
   * 生の入力イベントを処理
   */
  private handleRawInputEvent(event: NormalizedInputEvent): void {
    // イベントカウンターを更新
    coreStore.getState().incrementEventCount();

    // 間引き処理を適用
    const throttledEvents = this.throttler.processEvent(event);

    // 各間引き済みイベントを処理
    for (const throttledEvent of throttledEvents) {
      const processedEvent = processInputEvent(throttledEvent, this.config);
      if (processedEvent) {
        // ストアの状態を更新
        coreStore.getState().updateLastEvent(processedEvent);
        this.finalCallback?.(processedEvent);
      }
    }
  }




  /**
   * デバッグ用: 座標変換のデバッグ情報を取得
   */
  public getCoordinateTransformDebugInfo() {
    return this.inputHandler.getCoordinateTransformDebugInfo();
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
      lastEvent: coreStore.getState().inputProcessor.lastEvent,
    };
  }
}

// =============================================================================
// PURE FUNCTIONS FOR INPUT PROCESSING
// InputProcessorクラスから抽出された純粋関数
// =============================================================================

/**
 * 個別イベントの追加処理（純粋関数）
 * @param event 処理対象のイベント
 * @param config 入力処理設定
 * @returns 処理されたイベント、またはフィルタされた場合はnull
 */
export function processInputEvent(
  event: NormalizedInputEvent,
  config: InputProcessorConfig
): NormalizedInputEvent | null {
  const lastEvent = coreStore.getState().inputProcessor.lastEvent;
  
  // 重複除去フィルタ
  if (config.enableDuplicateFiltering && isDuplicateInputEvent(event, lastEvent, config.minPressureChange)) {
    return null;
  }

  // 筆圧変化フィルタ（moveイベントのみ）
  if (event.type === 'move' && isMinimalPressureChangeEvent(event, lastEvent, config.minPressureChange)) {
    return null;
  }

  return event;
}

/**
 * 重複イベントチェック（純粋関数）
 * @param event 現在のイベント
 * @param lastEvent 前回のイベント
 * @param minPressureChange 最小筆圧変化量
 * @returns 重複している場合はtrue
 */
export function isDuplicateInputEvent(
  event: NormalizedInputEvent,
  lastEvent: NormalizedInputEvent | undefined,
  minPressureChange: number
): boolean {
  if (!lastEvent) {
    return false;
  }

  // 同じタイプで同じ位置・筆圧のイベントは重複とみなす
  return (
    lastEvent.type === event.type &&
    lastEvent.position.canvasX === event.position.canvasX &&
    lastEvent.position.canvasY === event.position.canvasY &&
    Math.abs(lastEvent.pressure - event.pressure) < minPressureChange
  );
}

/**
 * 最小筆圧変化チェック（純粋関数）
 * @param event 現在のイベント
 * @param lastEvent 前回のイベント
 * @param minPressureChange 最小筆圧変化量
 * @returns 筆圧変化が最小値未満の場合はtrue
 */
export function isMinimalPressureChangeEvent(
  event: NormalizedInputEvent,
  lastEvent: NormalizedInputEvent | undefined,
  minPressureChange: number
): boolean {
  if (!lastEvent || event.type !== 'move') {
    return false;
  }

  // 筆圧非対応デバイス（pressure = 0.5）の場合はフィルタリングしない
  if (event.pressure === 0.5 && lastEvent.pressure === 0.5) {
    return false;
  }

  // 位置は変わったが筆圧変化が少ない場合
  const pressureChange = Math.abs(lastEvent.pressure - event.pressure);
  return pressureChange < minPressureChange;
}