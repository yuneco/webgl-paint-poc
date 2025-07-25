/**
 * メインペイントアプリケーション（簡素化版）
 * 各マネージャーへの委譲とライフサイクル管理のみを担当
 */

import { WebGLRenderer } from '../webgl/WebGLRenderer';
import { InputProcessor } from '../input/InputProcessor';
import { CanvasManager } from './CanvasManager';
import { DrawingCoordinator } from './DrawingCoordinator';
import { DebugManager } from './DebugManager';
import { StateSubscriptionManager } from './StateSubscriptionManager';

/**
 * アプリケーション設定
 */
export interface PaintAppConfig {
  /** Canvas要素のID */
  canvasId: string;
  /** Canvas表示サイズ */
  displaySize: { width: number; height: number };
  /** デバッグモードを有効にするか */
  enableDebug: boolean;
}

/**
 * PaintApp依存関係の型定義
 */
export interface PaintAppDependencies {
  canvasManager: CanvasManager;
  drawingCoordinator: DrawingCoordinator;
  debugManager: DebugManager;
  stateSubscriptionManager: StateSubscriptionManager;
  inputProcessor: InputProcessor;
  renderer: WebGLRenderer;
}

/**
 * メインペイントアプリケーションクラス（簡素化版）
 * 各マネージャーへの委譲とライフサイクル管理のみに責任を限定
 */
export class PaintApp {
  private managers: PaintAppDependencies;

  constructor(managers: PaintAppDependencies) {
    this.managers = managers;
  }

  /**
   * 状態購読の開始
   * 初期化時にファクトリーから呼び出される
   */
  startStateSubscriptions(): void {
    this.managers.stateSubscriptionManager.setupSubscriptions();
  }

  /**
   * 初期描画実行
   * 初期化時にファクトリーから呼び出される
   */
  render(): void {
    this.managers.drawingCoordinator.render();
  }

  /**
   * デバッグモード初期化
   * デバッグ有効時にファクトリーから呼び出される
   */
  initializeDebugMode(): void {
    this.managers.debugManager.setupDebugInfo();
  }

  // =============================================================================
  // 公開API（各マネージャーへの委譲）
  // =============================================================================

  /**
   * Canvas表示サイズを更新
   */
  updateDisplaySize(size: { width: number; height: number }): void {
    this.managers.canvasManager.updateDisplaySize(size);
  }

  /**
   * キャンバスをクリア
   */
  clearCanvas(): void {
    this.managers.drawingCoordinator.clearCanvas();
  }

  /**
   * 対称設定を更新
   */
  updateSymmetry(enabled: boolean, axisCount?: number): void {
    this.managers.drawingCoordinator.updateSymmetry(enabled, axisCount);
  }

  /**
   * 現在の状態を取得（デバッグ用）
   */
  getDebugState(): any {
    return this.managers.debugManager.getDebugState();
  }

  // =============================================================================
  // ライフサイクル管理
  // =============================================================================

  /**
   * アプリケーションを破棄
   */
  destroy(): void {
    // 各マネージャーのクリーンアップを実行
    this.managers.stateSubscriptionManager.cleanup();
    this.managers.debugManager.cleanup();
    this.managers.inputProcessor.destroy();
    this.managers.renderer.cleanup();
    this.managers.canvasManager.cleanup();
  }

  // =============================================================================
  // アクセサー（必要に応じて）
  // =============================================================================

  /**
   * Canvas要素を取得
   */
  getCanvas(): HTMLCanvasElement {
    return this.managers.canvasManager.getCanvas();
  }

  /**
   * WebGLRenderer を取得
   */
  getRenderer(): WebGLRenderer {
    return this.managers.renderer;
  }

  /**
   * 各マネージャーへの直接アクセス（高度な使用例向け）
   */
  getManagers(): PaintAppDependencies {
    return this.managers;
  }
}