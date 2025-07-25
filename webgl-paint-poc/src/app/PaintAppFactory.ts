/**
 * PaintAppファクトリー
 * モジュール組み立てと依存関係解決を担当
 */

import { WebGLRenderer } from '../webgl/WebGLRenderer';
import { InputProcessor } from '../input/InputProcessor';
import { ExtendedInputProcessor, DEFAULT_EXTENDED_INPUT_PROCESSOR_CONFIG } from '../input/ExtendedInputProcessor';
import { CanvasManager } from './CanvasManager';
import { DrawingCoordinator } from './DrawingCoordinator';
import { DebugManager } from './DebugManager';
import { StateSubscriptionManager } from './StateSubscriptionManager';
import { PaintApp } from './PaintApp';
import { drawingStore } from '../store/drawingStore';
import { systemStore } from '../store/systemStore';
import { initializeStores } from '../store/storeHelpers';
import type { PaintAppConfig } from './PaintApp';
import type { ViewState } from '../types/state';

/**
 * PaintApp組み立て用のファクトリークラス
 * 依存関係の解決と初期化順序を管理
 */
export class PaintAppFactory {
  /**
   * PaintAppインスタンスを作成
   */
  static create(config: PaintAppConfig): PaintApp {
    // 1. ストアの初期化
    initializeStores({
      canvasSize: { width: 1024, height: 1024 },
      displaySize: config.displaySize,
      canvasId: config.canvasId,
      enableDebug: config.enableDebug,
    });

    // 2. Canvas管理の初期化
    const canvasManager = new CanvasManager(() => systemStore.getState().appConfig);
    const canvas = canvasManager.initializeCanvas();

    // 3. WebGL描画エンジンの初期化
    const renderer = new WebGLRenderer(canvas);

    // 4. 入力処理の初期化（Task 6.6統合: ExtendedInputProcessor使用）
    const inputProcessor = new ExtendedInputProcessor(canvas, undefined, {
      ...DEFAULT_EXTENDED_INPUT_PROCESSOR_CONFIG,
      enableQualityMonitoring: config.enableDebug
    });

    // 5. 描画統合管理の初期化
    const drawingCoordinator = new DrawingCoordinator(
      renderer,
      () => drawingStore.getState(),
      () => systemStore.getState().appConfig.enableDebug
    );

    // 6. デバッグ管理の初期化
    const debugManager = new DebugManager(
      () => systemStore.getState().appConfig.enableDebug,
      () => inputProcessor.getStats()
    );

    // 7. 状態購読管理の初期化
    const stateSubscriptionManager = new StateSubscriptionManager(
      {
        onSymmetryChange: () => {
          // 対称設定変更時に再描画
          drawingCoordinator.render();
        },
        onViewChange: (viewState: ViewState) => {
          // ビュー変換を入力処理に反映
          inputProcessor.updateViewTransform(viewState.transform);
          drawingCoordinator.render();
        },
      },
      () => systemStore.getState().appConfig.enableDebug
    );

    // 8. 入力イベントの配線
    inputProcessor.setEventCallback(drawingCoordinator.handleInputEvent.bind(drawingCoordinator));

    // 9. PaintApp本体の組み立て
    const paintApp = new PaintApp({
      canvasManager,
      drawingCoordinator,
      debugManager,
      stateSubscriptionManager,
      inputProcessor,
      renderer,
    });

    // 10. 初期化完了処理
    PaintAppFactory.finalizeInitialization(paintApp, config);

    return paintApp;
  }

  /**
   * 初期化完了処理
   */
  private static finalizeInitialization(paintApp: PaintApp, config: PaintAppConfig): void {
    // 状態購読の開始
    paintApp.startStateSubscriptions();

    // 初期描画
    paintApp.render();

    // デバッグ機能の初期化（デバッグモード時のみ）
    if (config.enableDebug) {
      paintApp.initializeDebugMode();
    }
  }

  /**
   * 開発/テスト用のファクトリーメソッド
   * モック可能な依存関係を受け取る
   */
  static createWithDependencies(dependencies: {
    canvasManager: CanvasManager;
    drawingCoordinator: DrawingCoordinator;
    debugManager: DebugManager;
    stateSubscriptionManager: StateSubscriptionManager;
    inputProcessor: InputProcessor;
    renderer: WebGLRenderer;
  }): PaintApp {
    return new PaintApp(dependencies);
  }

  /**
   * テスト用の最小構成PaintApp作成
   */
  static createMinimal(canvas: HTMLCanvasElement): PaintApp {
    const renderer = new WebGLRenderer(canvas);
    const inputProcessor = new InputProcessor(canvas);
    
    const canvasManager = new CanvasManager(() => systemStore.getState().appConfig);
    const drawingCoordinator = new DrawingCoordinator(
      renderer,
      () => drawingStore.getState(),
      () => false // デバッグ無効
    );
    const debugManager = new DebugManager(
      () => false,
      () => inputProcessor.getStats()
    );
    const stateSubscriptionManager = new StateSubscriptionManager(
      {},
      () => false
    );

    return new PaintApp({
      canvasManager,
      drawingCoordinator,
      debugManager,
      stateSubscriptionManager,
      inputProcessor,
      renderer,
    });
  }

  /**
   * 設定検証
   */
  private static validateConfig(config: PaintAppConfig): void {
    if (!config.canvasId) {
      throw new Error('canvasId is required');
    }
    if (!config.displaySize || config.displaySize.width <= 0 || config.displaySize.height <= 0) {
      throw new Error('Valid displaySize is required');
    }
  }

  /**
   * 設定付きPaintApp作成（設定検証あり）
   */
  static createWithValidation(config: PaintAppConfig): PaintApp {
    PaintAppFactory.validateConfig(config);
    return PaintAppFactory.create(config);
  }
}