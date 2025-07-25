/**
 * ストア統合ヘルパーと細粒度セレクター
 * 複数ストア間の協調と性能最適化のための購読管理
 */

import type { DrawingStoreState } from './drawingStore';
import type { ViewStoreState } from './viewStore';
import type { SystemStoreState } from './systemStore';
import { drawingStore, drawingSelectors } from './drawingStore';
import { viewStore, viewSelectors } from './viewStore';
import { systemStore, systemSelectors } from './systemStore';

// =============================================================================
// 細粒度購読ヘルパー
// =============================================================================

/**
 * 描画ストア用購読ヘルパー
 */
export const useDrawingState = <T>(selector: (state: DrawingStoreState) => T): T => {
  return selector(drawingStore.getState());
};

/**
 * ビューストア用購読ヘルパー  
 */
export const useViewState = <T>(selector: (state: ViewStoreState) => T): T => {
  return selector(viewStore.getState());
};

/**
 * システムストア用購読ヘルパー
 */
export const useSystemState = <T>(selector: (state: SystemStoreState) => T): T => {
  return selector(systemStore.getState());
};

// =============================================================================
// 複数ストア統合ヘルパー
// =============================================================================

/**
 * 複数ストアの統合状態型
 */
export interface CombinedStoreState {
  drawing: DrawingStoreState;
  view: ViewStoreState;
  system: SystemStoreState;
}

/**
 * 複数ストア統合アクセスヘルパー
 * 複数のストアにまたがる状態が必要な場合に使用
 */
export const useCombinedState = <T>(
  selector: (stores: CombinedStoreState) => T
): T => {
  return selector({
    drawing: drawingStore.getState(),
    view: viewStore.getState(),
    system: systemStore.getState(),
  });
};

// =============================================================================
// 統合セレクター（後方互換性）
// =============================================================================

/**
 * 既存のcoreSelectorsパターンを維持する統合セレクター
 * 既存コードの段階的移行を支援
 */
export const combinedSelectors = {
  // Drawing Engine Selectors
  ...drawingSelectors,
  
  // View Selectors
  ...viewSelectors,
  
  // System Selectors
  ...systemSelectors,
  
  // 複合セレクター（複数ストアにまたがる情報）
  debugInfo: () => {
    const drawing = drawingStore.getState();
    const view = viewStore.getState();
    const system = systemStore.getState();
    
    return {
      drawing: {
        isDrawing: drawing.drawingEngine.isDrawing,
        currentStrokePoints: drawing.drawingEngine.currentStroke.length,
        totalStrokes: drawing.history.strokes.length,
      },
      symmetry: {
        enabled: drawing.symmetry.enabled,
        axisCount: drawing.symmetry.axisCount,
        centerPoint: drawing.symmetry.centerPoint,
      },
      view: {
        zoom: view.view.zoom,
        pan: view.view.pan,
        rotation: view.view.rotation,
      },
      input: {
        eventCount: view.inputProcessor.eventCount,
        lastEvent: view.inputProcessor.lastEvent,
      },
      performance: system.performance,
      config: system.appConfig,
    };
  },
};

// =============================================================================
// ストア購読管理ヘルパー
// =============================================================================

/**
 * 購読管理ヘルパー
 * 複数のストア購読を効率的に管理
 */
export class StoreSubscriptionManager {
  private subscriptions: Array<() => void> = [];

  /**
   * 描画ストアの変更を購読
   */
  subscribeDrawing<T>(
    selector: (state: DrawingStoreState) => T,
    callback: (value: T, previousValue: T) => void
  ): () => void {
    const unsubscribe = drawingStore.subscribe(selector, callback);
    this.subscriptions.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * ビューストアの変更を購読
   */
  subscribeView<T>(
    selector: (state: ViewStoreState) => T,
    callback: (value: T, previousValue: T) => void
  ): () => void {
    const unsubscribe = viewStore.subscribe(selector, callback);
    this.subscriptions.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * システムストアの変更を購読
   */
  subscribeSystem<T>(
    selector: (state: SystemStoreState) => T,
    callback: (value: T, previousValue: T) => void
  ): () => void {
    const unsubscribe = systemStore.subscribe(selector, callback);
    this.subscriptions.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * 全ての購読を解除
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];
  }
}

// =============================================================================
// ストア間協調ヘルパー
// =============================================================================

/**
 * 初期化協調ヘルパー
 * 複数ストアの初期化順序を管理
 */
export const initializeStores = (config: {
  canvasSize: { width: number; height: number };
  displaySize: { width: number; height: number };
  canvasId: string;
  enableDebug: boolean;
}) => {
  // システム設定を最初に設定
  systemStore.getState().updateConfig({
    canvasId: config.canvasId,
    displaySize: config.displaySize,
    enableDebug: config.enableDebug,
  });

  // 描画エンジンを初期化
  drawingStore.getState().initializeEngine(config.canvasSize);

  // 入力処理セッションを開始
  viewStore.getState().setSessionStartTime(Date.now());
};

/**
 * 全ストアリセットヘルパー
 */
export const resetAllStores = () => {
  drawingStore.getState().reset();
  viewStore.getState().reset();
  systemStore.getState().reset();
};

// =============================================================================
// デバッグ用ヘルパー
// =============================================================================

/**
 * 全ストア状態を取得（デバッグ用）
 */
export const getAllStoreStates = () => ({
  drawing: drawingStore.getState(),
  view: viewStore.getState(),
  system: systemStore.getState(),
});

/**
 * ストア変更履歴追跡（開発時のみ）
 */
export const enableStoreChangeLogging = () => {
  if (process.env.NODE_ENV !== 'development') return;

  drawingStore.subscribe(
    (state) => state,
    (state) => console.log('DrawingStore changed:', state)
  );

  viewStore.subscribe(
    (state) => state,
    (state) => console.log('ViewStore changed:', state)
  );

  systemStore.subscribe(
    (state) => state,
    (state) => console.log('SystemStore changed:', state)
  );
};