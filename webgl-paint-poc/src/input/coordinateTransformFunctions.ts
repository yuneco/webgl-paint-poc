/**
 * 座標変換の純粋関数実装
 * CoordinateTransformクラスの代替となる状態を持たない関数群
 */

import { Matrix3x3 } from '../math/Matrix3x3';
import type {
  PointerCoordinates,
  CanvasCoordinates,
  WebGLCoordinates,
  ViewCoordinates,
  ViewTransformState,
} from '../types/coordinates';
import { CoordinateTransformError } from '../types/coordinates';

/**
 * Canvas要素の表示サイズ情報
 */
export interface CanvasDisplayInfo {
  offsetWidth: number;
  offsetHeight: number;
  logicalWidth: number;
  logicalHeight: number;
}

/**
 * 座標変換に必要な全パラメータ
 */
export interface CoordinateTransformParams {
  canvasDisplay: CanvasDisplayInfo;
  viewTransform: ViewTransformState;
}

// =============================================================================
// MATRIX CALCULATION FUNCTIONS (PURE)
// 変換行列計算の純粋関数
// =============================================================================

/**
 * PointerEvent ↔ Canvas座標の変換行列を計算（純粋関数）
 */
export function createPointerCanvasTransformMatrices(canvasDisplay: CanvasDisplayInfo): {
  pointerToCanvas: Matrix3x3;
  canvasToPointer: Matrix3x3;
} {
  const scaleX = canvasDisplay.logicalWidth / canvasDisplay.offsetWidth;
  const scaleY = canvasDisplay.logicalHeight / canvasDisplay.offsetHeight;
  
  const pointerToCanvas = Matrix3x3.scale(scaleX, scaleY);
  const canvasToPointer = pointerToCanvas.inverse();
  
  return { pointerToCanvas, canvasToPointer };
}

/**
 * Canvas ↔ WebGL座標の変換行列を計算（純粋関数）
 */
export function createCanvasWebGLTransformMatrices(canvasDisplay: CanvasDisplayInfo): {
  canvasToWebGL: Matrix3x3;
  webGLToCanvas: Matrix3x3;
} {
  // Canvas座標(0-logical) → WebGL座標(-1～1)
  const logicalWidth = canvasDisplay.logicalWidth;
  const logicalHeight = canvasDisplay.logicalHeight;
  
  const canvasToWebGL = Matrix3x3.translation(-1, 1)
    .multiply(Matrix3x3.scale(2 / logicalWidth, -2 / logicalHeight));
  
  const webGLToCanvas = canvasToWebGL.inverse();
  
  return { canvasToWebGL, webGLToCanvas };
}

/**
 * Canvas ↔ ビュー座標の変換行列を計算（純粋関数）
 */
export function createCanvasViewTransformMatrices(
  canvasDisplay: CanvasDisplayInfo,
  viewTransform: ViewTransformState
): {
  canvasToView: Matrix3x3;
  viewToCanvas: Matrix3x3;
} {
  const { zoom, panOffset, rotation } = viewTransform;
  const centerX = canvasDisplay.logicalWidth / 2;
  const centerY = canvasDisplay.logicalHeight / 2;
  
  // ビュー変換の順序: パン → 回転 → ズーム（中心点周り）
  const panMatrix = Matrix3x3.translation(panOffset.canvasX, panOffset.canvasY);
  const rotationMatrix = Matrix3x3.rotationAround(rotation, centerX, centerY);
  
  // ズームは中心点周りに適用
  const zoomMatrix = Matrix3x3.translation(centerX, centerY)
    .multiply(Matrix3x3.scale(zoom, zoom))
    .multiply(Matrix3x3.translation(-centerX, -centerY));
  
  // Canvas → View変換: パン → 回転 → ズーム（中心点周り）
  const canvasToView = zoomMatrix
    .multiply(rotationMatrix)
    .multiply(panMatrix);
  
  const viewToCanvas = canvasToView.inverse();
  
  return { canvasToView, viewToCanvas };
}

// =============================================================================
// COORDINATE TRANSFORMATION FUNCTIONS (PURE)
// 座標変換の純粋関数
// =============================================================================

/**
 * PointerEvent座標 → Canvas座標（純粋関数）
 */
export function transformPointerToCanvas(
  pointerCoords: PointerCoordinates,
  canvasDisplay: CanvasDisplayInfo
): CanvasCoordinates {
  try {
    const { pointerToCanvas } = createPointerCanvasTransformMatrices(canvasDisplay);
    const point = pointerToCanvas.transformPoint(
      pointerCoords.offsetX,
      pointerCoords.offsetY
    );
    
    return {
      canvasX: Math.max(0, Math.min(canvasDisplay.logicalWidth, point.x)),
      canvasY: Math.max(0, Math.min(canvasDisplay.logicalHeight, point.y)),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CoordinateTransformError(
      `Failed to transform pointer to canvas coordinates: ${message}`,
      pointerCoords,
      'pointer-to-canvas'
    );
  }
}

/**
 * Canvas座標 → PointerEvent座標（純粋関数）
 */
export function transformCanvasToPointer(
  canvasCoords: CanvasCoordinates,
  canvasDisplay: CanvasDisplayInfo
): PointerCoordinates {
  try {
    const { canvasToPointer } = createPointerCanvasTransformMatrices(canvasDisplay);
    const point = canvasToPointer.transformPoint(
      canvasCoords.canvasX,
      canvasCoords.canvasY
    );
    
    return {
      offsetX: point.x,
      offsetY: point.y,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CoordinateTransformError(
      `Failed to transform canvas to pointer coordinates: ${message}`,
      canvasCoords,
      'canvas-to-pointer'
    );
  }
}

/**
 * Canvas座標 → WebGL座標（純粋関数）
 */
export function transformCanvasToWebGL(
  canvasCoords: CanvasCoordinates,
  canvasDisplay: CanvasDisplayInfo
): WebGLCoordinates {
  try {
    const { canvasToWebGL } = createCanvasWebGLTransformMatrices(canvasDisplay);
    const point = canvasToWebGL.transformPoint(
      canvasCoords.canvasX,
      canvasCoords.canvasY
    );
    
    return {
      webglX: Math.max(-1, Math.min(1, point.x)),
      webglY: Math.max(-1, Math.min(1, point.y)),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CoordinateTransformError(
      `Failed to transform canvas to WebGL coordinates: ${message}`,
      canvasCoords,
      'canvas-to-webgl'
    );
  }
}

/**
 * WebGL座標 → Canvas座標（純粋関数）
 */
export function transformWebGLToCanvas(
  webglCoords: WebGLCoordinates,
  canvasDisplay: CanvasDisplayInfo
): CanvasCoordinates {
  try {
    const { webGLToCanvas } = createCanvasWebGLTransformMatrices(canvasDisplay);
    const point = webGLToCanvas.transformPoint(
      webglCoords.webglX,
      webglCoords.webglY
    );
    
    return {
      canvasX: Math.max(0, Math.min(canvasDisplay.logicalWidth, point.x)),
      canvasY: Math.max(0, Math.min(canvasDisplay.logicalHeight, point.y)),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CoordinateTransformError(
      `Failed to transform WebGL to canvas coordinates: ${message}`,
      webglCoords,
      'webgl-to-canvas'
    );
  }
}

/**
 * Canvas座標 → ビュー座標（純粋関数）
 */
export function transformCanvasToView(
  canvasCoords: CanvasCoordinates,
  canvasDisplay: CanvasDisplayInfo,
  viewTransform: ViewTransformState
): ViewCoordinates {
  try {
    const { canvasToView } = createCanvasViewTransformMatrices(canvasDisplay, viewTransform);
    const point = canvasToView.transformPoint(
      canvasCoords.canvasX,
      canvasCoords.canvasY
    );
    
    return {
      viewX: point.x,
      viewY: point.y,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CoordinateTransformError(
      `Failed to transform canvas to view coordinates: ${message}`,
      canvasCoords,
      'canvas-to-view'
    );
  }
}

/**
 * ビュー座標 → Canvas座標（純粋関数）
 */
export function transformViewToCanvas(
  viewCoords: ViewCoordinates,
  canvasDisplay: CanvasDisplayInfo,
  viewTransform: ViewTransformState
): CanvasCoordinates {
  try {
    const { viewToCanvas } = createCanvasViewTransformMatrices(canvasDisplay, viewTransform);
    const point = viewToCanvas.transformPoint(
      viewCoords.viewX,
      viewCoords.viewY
    );
    
    return {
      canvasX: Math.max(0, Math.min(canvasDisplay.logicalWidth, point.x)),
      canvasY: Math.max(0, Math.min(canvasDisplay.logicalHeight, point.y)),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CoordinateTransformError(
      `Failed to transform view to canvas coordinates: ${message}`,
      viewCoords,
      'view-to-canvas'
    );
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// ユーティリティ関数
// =============================================================================

/**
 * HTMLCanvasElementからCanvasDisplayInfoを作成（純粋関数）
 */
export function createCanvasDisplayInfo(
  canvasElement: HTMLCanvasElement
): CanvasDisplayInfo {
  return {
    offsetWidth: canvasElement.offsetWidth,
    offsetHeight: canvasElement.offsetHeight,
    logicalWidth: canvasElement.width,
    logicalHeight: canvasElement.height,
  };
}

/**
 * 座標変換のデバッグ情報を取得（純粋関数）
 */
export function getTransformMatricesDebugInfo(
  canvasDisplay: CanvasDisplayInfo,
  viewTransform: ViewTransformState
): {
  pointerToCanvas: Matrix3x3;
  canvasToWebGL: Matrix3x3;
  canvasToView: Matrix3x3;
} {
  const { pointerToCanvas } = createPointerCanvasTransformMatrices(canvasDisplay);
  const { canvasToWebGL } = createCanvasWebGLTransformMatrices(canvasDisplay);
  const { canvasToView } = createCanvasViewTransformMatrices(canvasDisplay, viewTransform);
  
  return {
    pointerToCanvas: pointerToCanvas.clone(),
    canvasToWebGL: canvasToWebGL.clone(),
    canvasToView: canvasToView.clone(),
  };
}