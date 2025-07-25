/**
 * Pointer Events API統合と入力イベント正規化
 * マウス、タッチ、ペンの入力を統一的に処理
 */

import {
  getTransformMatricesDebugInfo,
  createCanvasDisplayInfo,
} from './coordinateTransformFunctions';
import {
  type InputEventCallback,
  type ActivePointerInfo,
  createNormalizedEventFromPointer,
  createNormalizedEventFromMouse,
  isPointerEventsSupported,
  preventDefault,
  isPointerActive,
  createActivePointerInfo,
} from './inputNormalizationUtils';

// Export types from inputNormalizationUtils for backward compatibility
export type { NormalizedInputEvent, InputEventCallback, ActivePointerInfo } from './inputNormalizationUtils';
import type {
  ViewTransformState,
} from '../types/coordinates';

/**
 * Pointer Events APIを使用した入力イベント処理
 */
export class InputEventHandler {
  private canvasElement: HTMLCanvasElement;
  private viewTransform: ViewTransformState;
  private eventCallback?: InputEventCallback;
  private isCapturing: boolean = false;
  private activePointers: Map<number, ActivePointerInfo> = new Map();

  constructor(
    canvasElement: HTMLCanvasElement,
    viewTransform: ViewTransformState = {
      zoom: 1.0,
      panOffset: { canvasX: 0, canvasY: 0 },
      rotation: 0,
    }
  ) {
    this.canvasElement = canvasElement;
    this.viewTransform = viewTransform;
    
    this.setupEventListeners();
  }

  /**
   * 入力イベントコールバックを設定
   */
  setEventCallback(callback: InputEventCallback): void {
    this.eventCallback = callback;
  }


  /**
   * ビュー変換を更新
   */
  updateViewTransform(viewTransform: ViewTransformState): void {
    this.viewTransform = viewTransform;
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
    if (!isPointerEventsSupported()) {
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
    this.canvasElement.addEventListener('touchstart', preventDefault);
    this.canvasElement.addEventListener('touchmove', preventDefault);
    this.canvasElement.addEventListener('touchend', preventDefault);
    
    // コンテキストメニューを無効化 (右クリック対応)
    this.canvasElement.addEventListener('contextmenu', preventDefault);
  }

  /**
   * フォールバック用マウスイベント
   */
  private setupMouseEvents(): void {
    this.canvasElement.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvasElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvasElement.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvasElement.addEventListener('contextmenu', preventDefault);
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
    this.canvasElement.removeEventListener('touchstart', preventDefault);
    this.canvasElement.removeEventListener('touchmove', preventDefault);
    this.canvasElement.removeEventListener('touchend', preventDefault);
    
    // Mouse Events (fallback)
    this.canvasElement.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvasElement.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvasElement.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // コンテキストメニュー
    this.canvasElement.removeEventListener('contextmenu', preventDefault);
  }

  /**
   * Pointer Down イベントハンドラー
   */
  private handlePointerDown(event: PointerEvent): void {
    event.preventDefault();
    
    // ポインターをキャプチャ
    this.canvasElement.setPointerCapture(event.pointerId);
    
    // 正規化されたイベントを作成
    const normalizedEvent = createNormalizedEventFromPointer(
      event,
      'start',
      this.canvasElement,
      this.viewTransform
    );
    
    // アクティブポインターを記録
    this.activePointers.set(event.pointerId, createActivePointerInfo(normalizedEvent.position));
    
    this.isCapturing = true;
    this.eventCallback?.(normalizedEvent);
  }

  /**
   * Pointer Move イベントハンドラー
   */
  private handlePointerMove(event: PointerEvent): void {
    if (!isPointerActive(event.pointerId, this.activePointers)) {
      return;
    }
    
    event.preventDefault();
    
    // 正規化されたイベントを作成
    const normalizedEvent = createNormalizedEventFromPointer(
      event,
      'move',
      this.canvasElement,
      this.viewTransform
    );
    
    this.eventCallback?.(normalizedEvent);
  }

  /**
   * Pointer Up イベントハンドラー
   */
  private handlePointerUp(event: PointerEvent): void {
    if (!isPointerActive(event.pointerId, this.activePointers)) {
      return;
    }
    
    event.preventDefault();
    
    // ポインターキャプチャを解放
    this.canvasElement.releasePointerCapture(event.pointerId);
    
    // 正規化されたイベントを作成
    const normalizedEvent = createNormalizedEventFromPointer(
      event,
      'end',
      this.canvasElement,
      this.viewTransform
    );
    
    this.activePointers.delete(event.pointerId);
    this.isCapturing = this.activePointers.size > 0;
    
    this.eventCallback?.(normalizedEvent);
  }

  /**
   * Pointer Cancel イベントハンドラー
   */
  private handlePointerCancel(event: PointerEvent): void {
    if (!isPointerActive(event.pointerId, this.activePointers)) {
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
    
    // 正規化されたイベントを作成
    const normalizedEvent = createNormalizedEventFromMouse(
      event,
      'start',
      this.canvasElement,
      this.viewTransform
    );
    
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
    
    // 正規化されたイベントを作成
    const normalizedEvent = createNormalizedEventFromMouse(
      event,
      'move',
      this.canvasElement,
      this.viewTransform
    );
    
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
    
    // 正規化されたイベントを作成
    const normalizedEvent = createNormalizedEventFromMouse(
      event,
      'end',
      this.canvasElement,
      this.viewTransform
    );
    
    this.isCapturing = false;
    this.eventCallback?.(normalizedEvent);
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
   * 座標変換のデバッグ情報を取得（デバッグ用）
   */
  public getCoordinateTransformDebugInfo() {
    const canvasDisplay = createCanvasDisplayInfo(this.canvasElement);
    return getTransformMatricesDebugInfo(canvasDisplay, this.viewTransform);
  }
}