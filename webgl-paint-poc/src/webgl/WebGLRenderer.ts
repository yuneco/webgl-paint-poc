/**
 * WebGLレンダラークラス
 * 関数型WebGLレンダラーのクラス版ラッパー
 */

import { 
  initializeRenderer, 
  clearCanvas as clearCanvasFunc, 
  renderStroke as renderStrokeFunc,
  renderStrokes as renderStrokesFunc,
  renderStrokesAsPoints as renderStrokesAsPointsFunc,
  setDrawingColor as setDrawingColorFunc,
  cleanupRenderer as cleanupRendererFunc,
  type WebGLRenderer as WebGLRendererInterface 
} from './renderer';
import type { StrokeData } from '../types/paint';

/**
 * WebGLレンダラークラス
 */
export class WebGLRenderer {
  private renderer: WebGLRendererInterface;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Canvas要素にIDを設定（関数型レンダラーがIDを要求するため）
    if (!canvas.id) {
      canvas.id = `webgl-canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    this.renderer = initializeRenderer(canvas.id);
  }

  /**
   * キャンバスをクリア
   */
  clear(): void {
    clearCanvasFunc(this.renderer);
  }

  /**
   * 単一ストロークを描画
   */
  renderStroke(stroke: StrokeData): void {
    renderStrokeFunc(this.renderer, stroke);
  }

  /**
   * 複数ストロークを描画
   */
  renderStrokes(strokes: StrokeData[]): void {
    renderStrokesFunc(this.renderer, strokes);
  }

  /**
   * ストロークをポイントとして描画
   */
  renderStrokesAsPoints(strokes: StrokeData[]): void {
    renderStrokesAsPointsFunc(this.renderer, strokes);
  }

  /**
   * 描画色を設定
   */
  setDrawingColor(r: number, g: number, b: number, a: number = 1.0): void {
    setDrawingColorFunc(this.renderer, r, g, b, a);
  }

  /**
   * Canvas要素を取得
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * 内部WebGLレンダラーを取得（デバッグ用）
   */
  getInternalRenderer(): WebGLRendererInterface {
    return this.renderer;
  }

  /**
   * レンダラーのビューポートサイズを取得
   */
  getViewportSize(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }

  /**
   * WebGLコンテキストの情報を取得
   */
  getContextInfo(): {
    vendor: string;
    renderer: string;
    version: string;
    maxTextureSize: number;
  } {
    const gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
    if (!gl) {
      throw new Error('WebGL context not available');
    }

    return {
      vendor: gl.getParameter(gl.VENDOR) || 'Unknown',
      renderer: gl.getParameter(gl.RENDERER) || 'Unknown',
      version: gl.getParameter(gl.VERSION) || 'Unknown',
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0,
    };
  }

  /**
   * リソースをクリーンアップ
   */
  cleanup(): void {
    cleanupRendererFunc(this.renderer);
  }
}