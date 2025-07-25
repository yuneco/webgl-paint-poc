/**
 * 入力イベント正規化ユーティリティ
 * InputEventHandlerから分離されたステートレスな純粋関数群
 */

import type {
  PointerCoordinates,
  CanvasCoordinates,
  ViewTransformState,
} from '../types/coordinates';
import {
  transformPointerToCanvas,
  createCanvasDisplayInfo,
} from './coordinateTransformFunctions';

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

// =============================================================================
// PRESSURE NORMALIZATION (PURE FUNCTIONS)
// 筆圧正規化の純粋関数
// =============================================================================

/**
 * 筆圧値を正規化 (0.0 - 1.0)（純粋関数）
 * @param pressure 生の筆圧値
 * @returns 正規化された筆圧値
 */
export function normalizePressure(pressure?: number): number {
  if (pressure === undefined) {
    return 0.5; // デフォルト筆圧
  }
  
  // 筆圧値は通常0.0-1.0の範囲だが、デバイスによって異なる場合がある
  // 筆圧非対応デバイスで0.0が来ても最小値0.3を保証
  const normalizedPressure = Math.max(0.0, Math.min(1.0, pressure));
  return normalizedPressure === 0.0 ? 0.5 : normalizedPressure;
}

// =============================================================================
// DEVICE TYPE DETECTION (PURE FUNCTIONS)
// デバイスタイプ判定の純粋関数
// =============================================================================

/**
 * デバイスタイプを正規化（純粋関数）
 * @param pointerType PointerEventのpointerType
 * @returns 正規化されたデバイスタイプ
 */
export function getDeviceType(pointerType: string): 'mouse' | 'pen' | 'touch' {
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
 * マウスイベントからデバイスタイプを取得（純粋関数）
 * @returns マウスデバイスタイプ
 */
export function getMouseDeviceType(): 'mouse' {
  return 'mouse';
}

// =============================================================================
// EVENT NORMALIZATION (PURE FUNCTIONS)
// イベント正規化の純粋関数
// =============================================================================

/**
 * PointerEventからNormalizedInputEventを作成（純粋関数）
 * @param event PointerEvent
 * @param eventType イベントタイプ
 * @param canvasElement Canvas要素
 * @param viewTransform ビュー変換状態（将来のスケール・パン変換用）
 * @returns 正規化されたイベント
 */
export function createNormalizedEventFromPointer(
  event: PointerEvent,
  eventType: 'start' | 'move' | 'end',
  canvasElement: HTMLCanvasElement,
  _viewTransform: ViewTransformState
): NormalizedInputEvent {
  const pointerCoords: PointerCoordinates = {
    offsetX: event.offsetX,
    offsetY: event.offsetY,
  };
  
  const canvasDisplay = createCanvasDisplayInfo(canvasElement);
  const canvasCoords = transformPointerToCanvas(pointerCoords, canvasDisplay);
  
  const normalizedEvent: NormalizedInputEvent = {
    position: canvasCoords,
    pressure: normalizePressure(event.pressure),
    timestamp: performance.now(),
    type: eventType,
    deviceType: getDeviceType(event.pointerType),
    buttons: event.buttons,
  };
  
  // Tilt情報は有効な値の場合のみ追加
  if (event.tiltX !== undefined && event.tiltX !== 0) {
    normalizedEvent.tiltX = event.tiltX;
  }
  if (event.tiltY !== undefined && event.tiltY !== 0) {
    normalizedEvent.tiltY = event.tiltY;
  }
  
  return normalizedEvent;
}

/**
 * MouseEventからNormalizedInputEventを作成（純粋関数）
 * @param event MouseEvent
 * @param eventType イベントタイプ
 * @param canvasElement Canvas要素
 * @param viewTransform ビュー変換状態（将来のスケール・パン変換用）
 * @returns 正規化されたイベント
 */
export function createNormalizedEventFromMouse(
  event: MouseEvent,
  eventType: 'start' | 'move' | 'end',
  canvasElement: HTMLCanvasElement,
  _viewTransform: ViewTransformState
): NormalizedInputEvent {
  const pointerCoords: PointerCoordinates = {
    offsetX: event.offsetX,
    offsetY: event.offsetY,
  };
  
  const canvasDisplay = createCanvasDisplayInfo(canvasElement);
  const canvasCoords = transformPointerToCanvas(pointerCoords, canvasDisplay);
  
  // マウスイベントの筆圧: endイベント時は0.0、それ以外はボタン押下状態に基づく
  const pressure = eventType === 'end' ? 0.0 : (event.buttons > 0 ? normalizePressure(undefined) : 0.0);
  
  return {
    position: canvasCoords,
    pressure,
    timestamp: performance.now(),
    type: eventType,
    deviceType: getMouseDeviceType(),
    buttons: event.buttons,
  };
}

// =============================================================================
// DEVICE CAPABILITY DETECTION (PURE FUNCTIONS)
// デバイス機能判定の純粋関数
// =============================================================================

/**
 * Pointer Events APIサポート判定（純粋関数）
 * @returns サポートされている場合はtrue
 */
export function isPointerEventsSupported(): boolean {
  return 'PointerEvent' in window;
}

/**
 * デフォルトイベント阻止（純粋関数）
 * @param event イベント
 */
export function preventDefault(event: Event): void {
  event.preventDefault();
}

// =============================================================================
// EVENT STATE VALIDATION (PURE FUNCTIONS)
// イベント状態検証の純粋関数
// =============================================================================

/**
 * アクティブポインター情報の型定義
 */
export interface ActivePointerInfo {
  startTime: number;
  startPosition: CanvasCoordinates;
}

/**
 * ポインターがアクティブかチェック（純粋関数）
 * @param pointerId ポインターID
 * @param activePointers アクティブポインターマップ
 * @returns アクティブな場合はtrue
 */
export function isPointerActive(
  pointerId: number,
  activePointers: Map<number, ActivePointerInfo>
): boolean {
  return activePointers.has(pointerId);
}

/**
 * 新しいアクティブポインター情報を作成（純粋関数）
 * @param canvasCoords Canvas座標
 * @returns アクティブポインター情報
 */
export function createActivePointerInfo(canvasCoords: CanvasCoordinates): ActivePointerInfo {
  return {
    startTime: performance.now(),
    startPosition: canvasCoords,
  };
}