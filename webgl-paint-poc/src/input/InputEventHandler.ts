/**
 * Pointer Events API統合と入力イベント正規化
 * マウス、タッチ、ペンの入力を統一的に処理
 */

import { CoordinateTransform } from './CoordinateTransform';
import type {
  DeviceCoordinates,
  CanvasCoordinates,
  CanvasBounds,
  ViewTransformState,
} from '../types/coordinates';

/**
 * 正規化された入力イベントデータ
 */
export interface NormalizedInputEvent {
  /** Canvas座標系での位置 */
  position: CanvasCoordinates;
  /** 筆圧 (0.0 - 1.0) */
  pressure: number;
  /** タイムスタンプ */
  timestamp: number;
  /** イベントタイプ */
  type: 'start' | 'move' | 'end';
  /** 入力デバイスタイプ */
  deviceType: 'mouse' | 'pen' | 'touch';
  /** ボタン状態 (マウス・ペンのみ) */
  buttons?: number;
  /** Tilt情報 (ペンのみ) */
  tiltX?: number;
  tiltY?: number;
}

/**
 * 入力イベントハンドラーのコールバック
 */
export type InputEventCallback = (event: NormalizedInputEvent) => void;

/**
 * Pointer Events APIを使用した入力イベント処理
 */
export class InputEventHandler {
  private canvasElement: HTMLCanvasElement;
  private coordinateTransform: CoordinateTransform;
  private eventCallback?: InputEventCallback;
  private isCapturing: boolean = false;
  private activePointers: Map<number, { startTime: number; startPosition: CanvasCoordinates }> = new Map();

  constructor(
    canvasElement: HTMLCanvasElement,
    canvasBounds: CanvasBounds,
    viewTransform: ViewTransformState = {
      zoom: 1.0,
      panOffset: { canvasX: 0, canvasY: 0 },
      rotation: 0,
    }
  ) {
    this.canvasElement = canvasElement;
    this.coordinateTransform = new CoordinateTransform(canvasBounds, viewTransform);
    
    this.setupEventListeners();
  }

  /**
   * 入力イベントコールバックを設定
   */
  setEventCallback(callback: InputEventCallback): void {
    this.eventCallback = callback;
  }

  /**
   * Canvas要素の境界を更新
   */
  updateCanvasBounds(bounds: CanvasBounds): void {
    this.coordinateTransform.updateCanvasBounds(bounds);
  }

  /**
   * ビュー変換を更新
   */
  updateViewTransform(viewTransform: ViewTransformState): void {
    this.coordinateTransform.updateViewTransform(viewTransform);
  }

  /**
   * イベントリスナーを破棄
   */
  destroy(): void {
    this.removeEventListeners();
    this.activePointers.clear();
  }

  /**
   * Pointer Eventsのセットアップ
   */
  private setupEventListeners(): void {
    // Pointer Events API のサポート確認
    if (!('PointerEvent' in window)) {
      console.warn('Pointer Events API is not supported, falling back to mouse events');
      this.setupMouseEvents();
      return;
    }

    // Pointer Events
    this.canvasElement.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.canvasElement.addEventListener('pointermove', this.handlePointerMove.bind(this));
    this.canvasElement.addEventListener('pointerup', this.handlePointerUp.bind(this));
    this.canvasElement.addEventListener('pointercancel', this.handlePointerCancel.bind(this));
    
    // ブラウザのデフォルト動作を無効化
    this.canvasElement.addEventListener('touchstart', this.preventDefault);
    this.canvasElement.addEventListener('touchmove', this.preventDefault);
    this.canvasElement.addEventListener('touchend', this.preventDefault);
    
    // コンテキストメニューを無効化 (右クリック対応)
    this.canvasElement.addEventListener('contextmenu', this.preventDefault);
  }

  /**
   * フォールバック用マウスイベント
   */
  private setupMouseEvents(): void {
    this.canvasElement.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvasElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvasElement.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvasElement.addEventListener('contextmenu', this.preventDefault);
  }

  /**
   * イベントリスナーを削除
   */
  private removeEventListeners(): void {
    // Pointer Events
    this.canvasElement.removeEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.canvasElement.removeEventListener('pointermove', this.handlePointerMove.bind(this));
    this.canvasElement.removeEventListener('pointerup', this.handlePointerUp.bind(this));
    this.canvasElement.removeEventListener('pointercancel', this.handlePointerCancel.bind(this));
    
    // Touch Events
    this.canvasElement.removeEventListener('touchstart', this.preventDefault);
    this.canvasElement.removeEventListener('touchmove', this.preventDefault);
    this.canvasElement.removeEventListener('touchend', this.preventDefault);
    
    // Mouse Events (fallback)
    this.canvasElement.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvasElement.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvasElement.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // コンテキストメニュー
    this.canvasElement.removeEventListener('contextmenu', this.preventDefault);
  }

  /**
   * Pointer Down イベントハンドラー
   */
  private handlePointerDown(event: PointerEvent): void {
    event.preventDefault();
    
    // ポインターをキャプチャ
    this.canvasElement.setPointerCapture(event.pointerId);
    
    const deviceCoords: DeviceCoordinates = {
      deviceX: event.clientX,
      deviceY: event.clientY,
    };
    
    const canvasCoords = this.coordinateTransform.deviceToCanvas(deviceCoords);
    
    // アクティブポインターを記録
    this.activePointers.set(event.pointerId, {
      startTime: performance.now(),
      startPosition: canvasCoords,
    });
    
    const normalizedEvent: NormalizedInputEvent = {
      position: canvasCoords,
      pressure: this.normalizePressure(event.pressure),
      timestamp: performance.now(),
      type: 'start',
      deviceType: this.getDeviceType(event.pointerType),
      buttons: event.buttons,
    };
    
    // Tilt情報は有効な値の場合のみ追加
    if (event.tiltX !== undefined && event.tiltX !== 0) {
      normalizedEvent.tiltX = event.tiltX;
    }
    if (event.tiltY !== undefined && event.tiltY !== 0) {
      normalizedEvent.tiltY = event.tiltY;
    }
    
    this.isCapturing = true;
    this.eventCallback?.(normalizedEvent);
  }

  /**
   * Pointer Move イベントハンドラー
   */
  private handlePointerMove(event: PointerEvent): void {
    if (!this.activePointers.has(event.pointerId)) {
      return;
    }
    
    event.preventDefault();
    
    const deviceCoords: DeviceCoordinates = {
      deviceX: event.clientX,
      deviceY: event.clientY,
    };
    
    const canvasCoords = this.coordinateTransform.deviceToCanvas(deviceCoords);
    
    const normalizedEvent: NormalizedInputEvent = {
      position: canvasCoords,
      pressure: this.normalizePressure(event.pressure),
      timestamp: performance.now(),
      type: 'move',
      deviceType: this.getDeviceType(event.pointerType),
      buttons: event.buttons,
    };
    
    // Tilt情報は有効な値の場合のみ追加
    if (event.tiltX !== undefined && event.tiltX !== 0) {
      normalizedEvent.tiltX = event.tiltX;
    }
    if (event.tiltY !== undefined && event.tiltY !== 0) {
      normalizedEvent.tiltY = event.tiltY;
    }
    
    this.eventCallback?.(normalizedEvent);
  }

  /**
   * Pointer Up イベントハンドラー
   */
  private handlePointerUp(event: PointerEvent): void {
    if (!this.activePointers.has(event.pointerId)) {
      return;
    }
    
    event.preventDefault();
    
    // ポインターキャプチャを解放
    this.canvasElement.releasePointerCapture(event.pointerId);
    
    const deviceCoords: DeviceCoordinates = {
      deviceX: event.clientX,
      deviceY: event.clientY,
    };
    
    const canvasCoords = this.coordinateTransform.deviceToCanvas(deviceCoords);
    
    const normalizedEvent: NormalizedInputEvent = {
      position: canvasCoords,
      pressure: this.normalizePressure(event.pressure),
      timestamp: performance.now(),
      type: 'end',
      deviceType: this.getDeviceType(event.pointerType),
      buttons: event.buttons,
    };
    
    // Tilt情報は有効な値の場合のみ追加
    if (event.tiltX !== undefined && event.tiltX !== 0) {
      normalizedEvent.tiltX = event.tiltX;
    }
    if (event.tiltY !== undefined && event.tiltY !== 0) {
      normalizedEvent.tiltY = event.tiltY;
    }
    
    this.activePointers.delete(event.pointerId);
    this.isCapturing = this.activePointers.size > 0;
    
    this.eventCallback?.(normalizedEvent);
  }

  /**
   * Pointer Cancel イベントハンドラー
   */
  private handlePointerCancel(event: PointerEvent): void {
    if (!this.activePointers.has(event.pointerId)) {
      return;
    }
    
    this.canvasElement.releasePointerCapture(event.pointerId);
    this.activePointers.delete(event.pointerId);
    this.isCapturing = this.activePointers.size > 0;
  }

  /**
   * マウスダウンイベントハンドラー (フォールバック)
   */
  private handleMouseDown(event: MouseEvent): void {
    event.preventDefault();
    
    const deviceCoords: DeviceCoordinates = {
      deviceX: event.clientX,
      deviceY: event.clientY,
    };
    
    const canvasCoords = this.coordinateTransform.deviceToCanvas(deviceCoords);
    
    const normalizedEvent: NormalizedInputEvent = {
      position: canvasCoords,
      pressure: event.buttons > 0 ? 1.0 : 0.0, // マウスの場合は押下状態で1.0
      timestamp: performance.now(),
      type: 'start',
      deviceType: 'mouse',
      buttons: event.buttons,
    };
    
    this.isCapturing = true;
    this.eventCallback?.(normalizedEvent);
  }

  /**
   * マウス移動イベントハンドラー (フォールバック)
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.isCapturing) {
      return;
    }
    
    event.preventDefault();
    
    const deviceCoords: DeviceCoordinates = {
      deviceX: event.clientX,
      deviceY: event.clientY,
    };
    
    const canvasCoords = this.coordinateTransform.deviceToCanvas(deviceCoords);
    
    const normalizedEvent: NormalizedInputEvent = {
      position: canvasCoords,
      pressure: event.buttons > 0 ? 1.0 : 0.0,
      timestamp: performance.now(),
      type: 'move',
      deviceType: 'mouse',
      buttons: event.buttons,
    };
    
    this.eventCallback?.(normalizedEvent);
  }

  /**
   * マウスアップイベントハンドラー (フォールバック)
   */
  private handleMouseUp(event: MouseEvent): void {
    if (!this.isCapturing) {
      return;
    }
    
    event.preventDefault();
    
    const deviceCoords: DeviceCoordinates = {
      deviceX: event.clientX,
      deviceY: event.clientY,
    };
    
    const canvasCoords = this.coordinateTransform.deviceToCanvas(deviceCoords);
    
    const normalizedEvent: NormalizedInputEvent = {
      position: canvasCoords,
      pressure: 0.0, // マウスアップ時は筆圧0
      timestamp: performance.now(),
      type: 'end',
      deviceType: 'mouse',
      buttons: event.buttons,
    };
    
    this.isCapturing = false;
    this.eventCallback?.(normalizedEvent);
  }

  /**
   * デフォルトイベント阻止
   */
  private preventDefault(event: Event): void {
    event.preventDefault();
  }

  /**
   * 筆圧値を正規化 (0.0 - 1.0)
   */
  private normalizePressure(pressure?: number): number {
    if (pressure === undefined) {
      return 0.5; // デフォルト筆圧
    }
    
    // 筆圧値は通常0.0-1.0の範囲だが、デバイスによって異なる場合がある
    // 筆圧非対応デバイスで0.0が来ても最小値0.3を保証
    const normalizedPressure = Math.max(0.0, Math.min(1.0, pressure));
    return normalizedPressure === 0.0 ? 0.5 : normalizedPressure;
  }

  /**
   * デバイスタイプを正規化
   */
  private getDeviceType(pointerType: string): 'mouse' | 'pen' | 'touch' {
    switch (pointerType) {
      case 'pen':
        return 'pen';
      case 'touch':
        return 'touch';
      case 'mouse':
      default:
        return 'mouse';
    }
  }

  /**
   * 現在キャプチャ中かどうかを取得
   */
  public isCurrentlyCapturing(): boolean {
    return this.isCapturing;
  }

  /**
   * アクティブなポインター数を取得
   */
  public getActivePointerCount(): number {
    return this.activePointers.size;
  }

  /**
   * 座標変換インスタンスを取得（デバッグ用）
   */
  public getCoordinateTransform(): CoordinateTransform {
    return this.coordinateTransform;
  }
}