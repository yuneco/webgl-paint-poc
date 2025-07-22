/**
 * ステート管理統合WebGLレンダラー
 * Zustandストアと連携する描画エンジン
 */

import type { WebGLRenderer } from './renderer';
import { initializeRenderer, renderStroke, renderStrokes, setDrawingColor, clearCanvas } from './renderer';
import { renderStrokeWithSymmetry, renderStrokesWithSymmetry, type SymmetryConfig } from '../symmetry/symmetryRenderer';
import { coreStore, coreSelectors } from '../store/coreStore';
import type { StrokeData } from '../types/core';

/**
 * ステート管理統合レンダラー
 */
export class StateRenderer {
  private renderer: WebGLRenderer | null = null;
  private isInitialized = false;

  /**
   * レンダラーの初期化
   */
  initialize(canvasId: string): void {
    try {
      this.renderer = initializeRenderer(canvasId);
      this.isInitialized = true;

      // ストアに初期化状態を反映
      const coreState = coreStore.getState();
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      if (canvas) {
        coreState.initializeEngine({
          width: canvas.width,
          height: canvas.height,
        });
      }

      // 初期色設定を適用
      this.syncColorFromStore();

      console.log('StateRenderer initialized successfully');
    } catch (error) {
      console.error('StateRenderer initialization failed:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * レンダラーが使用可能かチェック
   */
  private ensureRenderer(): WebGLRenderer {
    if (!this.renderer || !this.isInitialized) {
      throw new Error('StateRenderer is not initialized. Call initialize() first.');
    }
    return this.renderer;
  }

  /**
   * ストアの色設定をレンダラーに同期
   */
  syncColorFromStore(): void {
    const renderer = this.ensureRenderer();
    const color = coreSelectors.color();
    setDrawingColor(renderer, color[0], color[1], color[2], color[3]);
  }

  /**
   * ストアの設定に基づいて単一ストロークを描画
   */
  renderStrokeWithState(stroke: StrokeData): void {
    const renderer = this.ensureRenderer();
    
    // 色設定を同期
    this.syncColorFromStore();
    
    // 対称設定を取得
    const symmetryState = coreSelectors.symmetry();
    const symmetryConfig: SymmetryConfig = {
      enabled: symmetryState.enabled,
      axisCount: symmetryState.axisCount,
      centerPoint: symmetryState.centerPoint,
    };

    // 対称描画の実行
    if (symmetryConfig.enabled) {
      renderStrokeWithSymmetry(renderer, stroke, symmetryConfig);
    } else {
      renderStroke(renderer, stroke);
    }
  }

  /**
   * ストアの設定に基づいて複数ストロークを描画
   */
  renderStrokesWithState(strokes: StrokeData[]): void {
    const renderer = this.ensureRenderer();
    
    // 色設定を同期
    this.syncColorFromStore();
    
    // 対称設定を取得
    const symmetryState = coreSelectors.symmetry();
    const symmetryConfig: SymmetryConfig = {
      enabled: symmetryState.enabled,
      axisCount: symmetryState.axisCount,
      centerPoint: symmetryState.centerPoint,
    };

    // 対称描画の実行
    if (symmetryConfig.enabled) {
      renderStrokesWithSymmetry(renderer, strokes, symmetryConfig);
    } else {
      renderStrokes(renderer, strokes);
    }
  }

  /**
   * ストアの履歴に基づいて全描画内容をレンダリング
   */
  renderFromHistory(): void {
    const renderer = this.ensureRenderer();
    const strokes = coreSelectors.strokes();
    
    // キャンバスをクリア
    clearCanvas(renderer);
    
    // 履歴からすべてのストロークを描画
    if (strokes.length > 0) {
      this.renderStrokesWithState(strokes);
    }
  }

  /**
   * ストローク追加と描画
   */
  addStrokeAndRender(stroke: StrokeData): void {
    // ストアに履歴を追加
    const coreState = coreStore.getState();
    coreState.addStroke(stroke);
    
    // 新しいストロークを描画
    this.renderStrokeWithState(stroke);
  }

  /**
   * キャンバスクリア
   */
  clear(): void {
    const renderer = this.ensureRenderer();
    clearCanvas(renderer);
    
    // ストアの履歴もクリア
    const coreState = coreStore.getState();
    coreState.clearHistory();
  }

  /**
   * アンドゥ操作と再描画
   */
  undo(): void {
    const coreState = coreStore.getState();
    if (coreSelectors.canUndo()) {
      coreState.undo();
      this.renderFromHistory();
    }
  }

  /**
   * リドゥ操作と再描画
   */
  redo(): void {
    const coreState = coreStore.getState();
    if (coreSelectors.canRedo()) {
      coreState.redo();
      this.renderFromHistory();
    }
  }

  /**
   * 対称設定変更時の再描画
   */
  onSymmetryChange(): void {
    this.renderFromHistory();
  }

  /**
   * 色設定変更時の同期
   */
  onColorChange(): void {
    this.syncColorFromStore();
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    if (this.renderer) {
      // WebGLリソースのクリーンアップ（必要に応じて実装）
      this.renderer = null;
    }
    this.isInitialized = false;

    // ストアのクリーンアップ状態を反映
    const coreState = coreStore.getState();
    coreState.cleanup();
  }

  /**
   * レンダラーの取得（デバッグ・拡張用）
   */
  getRenderer(): WebGLRenderer | null {
    return this.renderer;
  }

  /**
   * 初期化状態の取得
   */
  getInitializedState(): boolean {
    return this.isInitialized;
  }
}

/**
 * グローバルStateRendererインスタンス
 * アプリケーション全体で共有
 */
export const stateRenderer = new StateRenderer();

/**
 * ストア変更の監視とレンダラーの自動同期
 */
export const setupStoreSubscriptions = () => {
  // 対称設定の変更を監視
  coreStore.subscribe(
    (state) => state.symmetry,
    () => {
      if (stateRenderer.getInitializedState()) {
        stateRenderer.onSymmetryChange();
      }
    }
  );

  // 色設定の変更を監視
  coreStore.subscribe(
    (state) => state.drawingEngine.color,
    () => {
      if (stateRenderer.getInitializedState()) {
        stateRenderer.onColorChange();
      }
    }
  );

  console.log('Store subscriptions set up for StateRenderer');
};