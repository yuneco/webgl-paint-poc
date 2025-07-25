/**
 * 状態変更監視専門モジュール
 * ストア購読管理と状態変更時のコールバック処理を担当
 */

import { drawingStore } from '../store/drawingStore';
import { viewStore } from '../store/viewStore';
import type { SymmetryState, ViewState } from '../types/state';

/**
 * 状態変更コールバック関数の型定義
 */
export interface StateChangeCallbacks {
  onSymmetryChange?: (symmetryState: SymmetryState) => void;
  onViewChange?: (viewState: ViewState) => void;
}

/**
 * 状態変更監視専門クラス
 * 複数ストアの購読管理のみに責任を限定
 */
export class StateSubscriptionManager {
  private subscriptions: Array<() => void> = [];
  private callbacks: StateChangeCallbacks;
  private isDebugEnabled: () => boolean;

  constructor(
    callbacks: StateChangeCallbacks,
    isDebugEnabled: () => boolean
  ) {
    this.callbacks = callbacks;
    this.isDebugEnabled = isDebugEnabled;
  }

  /**
   * 状態変更の監視を設定
   * PaintApp.setupStateSubscriptions()から移植
   */
  setupSubscriptions(): void {
    // 対称設定の変更を監視
    const symmetryUnsubscribe = drawingStore.subscribe(
      (state) => state.symmetry,
      (symmetryState) => {
        if (this.isDebugEnabled()) {
          console.log('Symmetry state changed:', symmetryState);
        }
        
        // 対称設定変更時のコールバック実行
        if (this.callbacks.onSymmetryChange) {
          this.callbacks.onSymmetryChange(symmetryState);
        }
      }
    );
    this.subscriptions.push(symmetryUnsubscribe);

    // ビュー状態の変更を監視
    const viewUnsubscribe = viewStore.subscribe(
      (state) => state.view,
      (viewState) => {
        if (this.isDebugEnabled()) {
          console.log('View state changed:', viewState);
        }
        
        // ビュー変更時のコールバック実行
        if (this.callbacks.onViewChange) {
          this.callbacks.onViewChange(viewState);
        }
      }
    );
    this.subscriptions.push(viewUnsubscribe);
  }

  /**
   * 特定のストア変更を個別に購読
   * より細かい購読制御が必要な場合に使用
   */
  subscribeToSymmetryChanges(callback: (symmetryState: SymmetryState) => void): () => void {
    const unsubscribe = drawingStore.subscribe(
      (state) => state.symmetry,
      callback
    );
    this.subscriptions.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * ビュー状態変更を個別に購読
   */
  subscribeToViewChanges(callback: (viewState: ViewState) => void): () => void {
    const unsubscribe = viewStore.subscribe(
      (state) => state.view,
      callback
    );
    this.subscriptions.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * 描画状態変更を監視（リアルタイム描画用）
   */
  subscribeToDrawingState(callback: (isDrawing: boolean, currentStrokeLength: number) => void): () => void {
    const unsubscribe = drawingStore.subscribe(
      (state) => ({ 
        isDrawing: state.drawingEngine.isDrawing, 
        strokeLength: state.drawingEngine.currentStroke.length 
      }),
      (newState, prevState) => {
        // 描画開始/終了、またはストローク点数変更時にコールバック
        if (newState.isDrawing !== prevState?.isDrawing || 
            newState.strokeLength !== prevState?.strokeLength) {
          callback(newState.isDrawing, newState.strokeLength);
        }
      }
    );
    this.subscriptions.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * カスタム購読の追加
   * より柔軟な購読パターンに対応
   */
  addCustomSubscription(unsubscribeFunc: () => void): void {
    this.subscriptions.push(unsubscribeFunc);
  }

  /**
   * 全ての購読を解除
   */
  cleanup(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];
    
    if (this.isDebugEnabled()) {
      console.log('StateSubscriptionManager cleanup completed');
    }
  }

  /**
   * 現在アクティブな購読数を取得（デバッグ用）
   */
  getActiveSubscriptionCount(): number {
    return this.subscriptions.length;
  }

  /**
   * 購読状態の確認（デバッグ用）
   */
  isActive(): boolean {
    return this.subscriptions.length > 0;
  }
}