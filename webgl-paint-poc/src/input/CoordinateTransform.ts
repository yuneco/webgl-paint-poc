/**
 * 座標変換レイヤー
 * PointerEvent座標 → Canvas座標 → WebGL座標の変換を管理
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
 * 座標変換インターface
 */
export interface ICoordinateTransform {
  // 基本変換
  pointerToCanvas(pointerCoords: PointerCoordinates): CanvasCoordinates;
  canvasToPointer(canvasCoords: CanvasCoordinates): PointerCoordinates;
  canvasToWebGL(canvasCoords: CanvasCoordinates): WebGLCoordinates;
  webGLToCanvas(webglCoords: WebGLCoordinates): CanvasCoordinates;
  
  // ビュー変換
  canvasToView(canvasCoords: CanvasCoordinates): ViewCoordinates;
  viewToCanvas(viewCoords: ViewCoordinates): CanvasCoordinates;
  
  // 設定更新
  updateViewTransform(viewState: ViewTransformState): void;
  
  // デバッグ用
  getTransformMatrices(): {
    pointerToCanvas: Matrix3x3;
    canvasToWebGL: Matrix3x3;
    canvasToView: Matrix3x3;
  };
}

/**
 * 座標変換の実装クラス
 */
export class CoordinateTransform implements ICoordinateTransform {
  private pointerToCanvasMatrix: Matrix3x3 = new Matrix3x3();
  private canvasToPointerMatrix: Matrix3x3 = new Matrix3x3();
  private canvasToWebGLMatrix: Matrix3x3 = new Matrix3x3();
  private webGLToCanvasMatrix: Matrix3x3 = new Matrix3x3();
  private canvasToViewMatrix: Matrix3x3 = new Matrix3x3();
  private viewToCanvasMatrix: Matrix3x3 = new Matrix3x3();
  
  private canvasElement: HTMLCanvasElement;
  private viewTransform: ViewTransformState;

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
    
    // 初期変換行列を計算
    this.updateTransformMatrices();
  }


  /**
   * ビュー変換状態を更新
   */
  updateViewTransform(viewState: ViewTransformState): void {
    this.viewTransform = viewState;
    this.updateCanvasViewTransform();
  }

  /**
   * PointerEvent座標 → Canvas座標
   */
  pointerToCanvas(pointerCoords: PointerCoordinates): CanvasCoordinates {
    try {
      const point = this.pointerToCanvasMatrix.transformPoint(
        pointerCoords.offsetX,
        pointerCoords.offsetY
      );
      
      return {
        canvasX: Math.max(0, Math.min(1024, point.x)),
        canvasY: Math.max(0, Math.min(1024, point.y)),
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
   * Canvas座標 → PointerEvent座標
   */
  canvasToPointer(canvasCoords: CanvasCoordinates): PointerCoordinates {
    try {
      const point = this.canvasToPointerMatrix.transformPoint(
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
   * Canvas座標 → WebGL座標
   */
  canvasToWebGL(canvasCoords: CanvasCoordinates): WebGLCoordinates {
    try {
      const point = this.canvasToWebGLMatrix.transformPoint(
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
   * WebGL座標 → Canvas座標
   */
  webGLToCanvas(webglCoords: WebGLCoordinates): CanvasCoordinates {
    try {
      const point = this.webGLToCanvasMatrix.transformPoint(
        webglCoords.webglX,
        webglCoords.webglY
      );
      
      return {
        canvasX: Math.max(0, Math.min(1024, point.x)),
        canvasY: Math.max(0, Math.min(1024, point.y)),
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
   * Canvas座標 → ビュー座標
   */
  canvasToView(canvasCoords: CanvasCoordinates): ViewCoordinates {
    try {
      const point = this.canvasToViewMatrix.transformPoint(
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
   * ビュー座標 → Canvas座標
   */
  viewToCanvas(viewCoords: ViewCoordinates): CanvasCoordinates {
    try {
      const point = this.viewToCanvasMatrix.transformPoint(
        viewCoords.viewX,
        viewCoords.viewY
      );
      
      return {
        canvasX: Math.max(0, Math.min(1024, point.x)),
        canvasY: Math.max(0, Math.min(1024, point.y)),
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

  /**
   * デバッグ用変換行列取得
   */
  getTransformMatrices() {
    return {
      pointerToCanvas: this.pointerToCanvasMatrix.clone(),
      canvasToWebGL: this.canvasToWebGLMatrix.clone(),
      canvasToView: this.canvasToViewMatrix.clone(),
    };
  }

  /**
   * 全変換行列を更新
   */
  private updateTransformMatrices(): void {
    this.updatePointerCanvasTransform();
    this.updateCanvasWebGLTransform();
    this.updateCanvasViewTransform();
  }

  /**
   * PointerEvent ↔ Canvas座標の変換行列を更新
   */
  private updatePointerCanvasTransform(): void {
    // Canvas要素の表示サイズを論理サイズ(1024x1024)にスケール
    // offsetX/Y はすでにCanvas要素内の相対座標なので、直接スケールするだけ
    const scaleX = 1024 / this.canvasElement.offsetWidth;
    const scaleY = 1024 / this.canvasElement.offsetHeight;
    
    this.pointerToCanvasMatrix = Matrix3x3.scale(scaleX, scaleY);
    this.canvasToPointerMatrix = this.pointerToCanvasMatrix.inverse();
  }

  /**
   * Canvas ↔ WebGL座標の変換行列を更新
   */
  private updateCanvasWebGLTransform(): void {
    // Canvas座標(0-1024) → WebGL座標(-1～1)
    // webglX = (canvasX / 1024) * 2 - 1
    // webglY = -((canvasY / 1024) * 2 - 1) = -(canvasY * (2/1024) - 1)
    this.canvasToWebGLMatrix = Matrix3x3.translation(-1, 1)
      .multiply(Matrix3x3.scale(2/1024, -2/1024));
    
    this.webGLToCanvasMatrix = this.canvasToWebGLMatrix.inverse();
  }

  /**
   * Canvas ↔ ビュー座標の変換行列を更新
   */
  private updateCanvasViewTransform(): void {
    const { zoom, panOffset, rotation } = this.viewTransform;
    const centerX = 512;
    const centerY = 512;
    
    // ビュー変換の順序: パン → 回転 → ズーム（中心点周り）
    const panMatrix = Matrix3x3.translation(panOffset.canvasX, panOffset.canvasY);
    const rotationMatrix = Matrix3x3.rotationAround(rotation, centerX, centerY);
    
    // ズームは中心点周りに適用
    const zoomMatrix = Matrix3x3.translation(centerX, centerY)
      .multiply(Matrix3x3.scale(zoom, zoom))
      .multiply(Matrix3x3.translation(-centerX, -centerY));
    
    // Canvas → View変換: パン → 回転 → ズーム（中心点周り）
    this.canvasToViewMatrix = zoomMatrix
      .multiply(rotationMatrix)
      .multiply(panMatrix);
    
    this.viewToCanvasMatrix = this.canvasToViewMatrix.inverse();
  }
}