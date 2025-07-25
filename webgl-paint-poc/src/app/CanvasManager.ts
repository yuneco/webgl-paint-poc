/**
 * Canvas/DOM設定専門モジュール
 * Canvas要素の初期化、サイズ調整、CSS設定を担当
 */

import type { AppConfigState } from '../types/state';

/**
 * Canvas管理専門クラス
 * DOM操作とCanvas設定のみに責任を限定
 */
export class CanvasManager {
  private canvas: HTMLCanvasElement | null = null;
  private getConfig: () => AppConfigState;

  constructor(getConfig: () => AppConfigState) {
    this.getConfig = getConfig;
  }

  /**
   * Canvas要素を初期化
   * PaintApp.initializeCanvas()から移植
   */
  initializeCanvas(): HTMLCanvasElement {
    const config = this.getConfig();
    const canvas = document.getElementById(config.canvasId) as HTMLCanvasElement;
    
    if (!canvas) {
      throw new Error(`Canvas element with id "${config.canvasId}" not found`);
    }
    
    // Canvas論理サイズを設定（固定値）
    canvas.width = 1024;
    canvas.height = 1024;
    
    // Canvas表示サイズを設定
    this.updateCanvasDisplaySize(canvas, config.displaySize);
    
    // Canvas基本スタイルを設定
    this.applyCanvasStyles(canvas);
    
    this.canvas = canvas;
    return canvas;
  }

  /**
   * Canvas表示サイズを更新
   * PaintApp.updateDisplaySize()から移植
   */
  updateDisplaySize(size: { width: number; height: number }): void {
    if (!this.canvas) {
      throw new Error('Canvas not initialized. Call initializeCanvas() first.');
    }

    this.updateCanvasDisplaySize(this.canvas, size);
  }

  /**
   * Canvas表示サイズを設定（内部ヘルパー）
   */
  private updateCanvasDisplaySize(
    canvas: HTMLCanvasElement, 
    size: { width: number; height: number }
  ): void {
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
  }

  /**
   * Canvas基本スタイルを適用（内部ヘルパー）
   */
  private applyCanvasStyles(canvas: HTMLCanvasElement): void {
    canvas.style.border = '1px solid #ccc';
    canvas.style.cursor = 'crosshair';
  }

  /**
   * 現在のCanvas要素を取得
   */
  getCanvas(): HTMLCanvasElement {
    if (!this.canvas) {
      throw new Error('Canvas not initialized. Call initializeCanvas() first.');
    }
    return this.canvas;
  }

  /**
   * Canvas要素の存在確認
   */
  isInitialized(): boolean {
    return this.canvas !== null;
  }

  /**
   * Canvas要素の解放
   */
  cleanup(): void {
    this.canvas = null;
  }
}