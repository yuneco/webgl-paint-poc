/**
 * 描画ロジック統合専門モジュール
 * 入力イベント処理、ストロークライフサイクル、対称描画の統合管理
 */

import { WebGLRenderer } from '../webgl/WebGLRenderer';
import { generateSymmetricStrokes } from '../symmetry/symmetryRenderer';
import { drawingStore, drawingSelectors } from '../store/drawingStore';
import type { DrawingStoreState } from '../store/drawingStore';
import type { NormalizedInputEvent } from '../input/InputEventHandler';
import type { StrokeData, StrokePoint } from '../types/core';

/**
 * 描画統合管理専門クラス

 * 入力→描画変換とレンダリング統合のみに責任を限定
 */
export class DrawingCoordinator {
  private renderer: WebGLRenderer;
  private isDebugEnabled: () => boolean;

  constructor(
    renderer: WebGLRenderer,
    _getDrawingState: () => DrawingStoreState,
    isDebugEnabled: () => boolean
  ) {
    this.renderer = renderer;
    this.isDebugEnabled = isDebugEnabled;
  }

  /**
   * 入力イベントハンドラー
   * PaintApp.handleInputEvent()から移植
   */
  handleInputEvent(event: NormalizedInputEvent): void {
    if (this.isDebugEnabled()) {
      console.log('Input event:', event);
    }

    switch (event.type) {
      case 'start':
        this.startStroke(event);
        break;
      case 'move':
        this.continueStroke(event);
        break;
      case 'end':
        this.endStroke(event);
        break;
    }
  }

  /**
   * ストローク開始処理
   * PaintApp.startStroke()から移植
   */
  private startStroke(event: NormalizedInputEvent): void {
    const strokePoint = this.eventToStrokePoint(event);
    drawingStore.getState().startDrawing(strokePoint);
    
    if (this.isDebugEnabled()) {
      console.log('Stroke started at:', event.position);
    }
  }

  /**
   * ストローク継続処理
   * PaintApp.continueStroke()から移植
   */
  private continueStroke(event: NormalizedInputEvent): void {
    const state = drawingStore.getState();
    if (!state.drawingEngine.isDrawing) return;
    
    const strokePoint = this.eventToStrokePoint(event);
    state.continueDrawing(strokePoint);
    
    // リアルタイム描画
    this.renderCurrentStroke();
    
    const updatedState = drawingStore.getState();
    if (this.isDebugEnabled() && updatedState.drawingEngine.currentStroke.length % 5 === 0) {
      console.log(`Stroke continues, ${updatedState.drawingEngine.currentStroke.length} points`);
    }
  }

  /**
   * ストローク終了処理
   * PaintApp.endStroke()から移植
   */
  private endStroke(event: NormalizedInputEvent): void {
    const state = drawingStore.getState();
    if (!state.drawingEngine.isDrawing) return;
    
    const strokePoint = this.eventToStrokePoint(event);
    state.endDrawing(strokePoint);
    
    // 最終描画
    this.render();
    
    if (this.isDebugEnabled()) {
      console.log('Stroke completed at:', event.position);
    }
  }

  /**
   * 入力イベントをStrokePointに変換
   * PaintApp.eventToStrokePoint()から移植
   */
  private eventToStrokePoint(event: NormalizedInputEvent): StrokePoint {
    return {
      x: event.position.canvasX,
      y: event.position.canvasY,
      pressure: event.pressure,
      timestamp: event.timestamp,
    };
  }

  /**
   * 現在のストロークをリアルタイム描画
   * PaintApp.renderCurrentStroke()から移植
   */
  private renderCurrentStroke(): void {
    const state = drawingStore.getState();
    const currentStroke = state.drawingEngine.currentStroke;
    
    if (currentStroke.length < 2) return;
    
    // 既存の描画をクリア
    this.renderer.clear();
    
    // 保存済みストロークを描画
    this.renderSavedStrokes();
    
    // 現在のストロークを描画
    const tempStrokeData: StrokeData = {
      id: 'temp_stroke',
      points: [...currentStroke],
      timestamp: Date.now(),
      metadata: {
        timestamp: Date.now(),
        deviceType: 'unknown',
        totalPoints: currentStroke.length,
      },
    };
    
    this.renderStrokeWithSymmetry(tempStrokeData);
  }

  /**
   * 保存済みストロークを描画
   * PaintApp.renderSavedStrokes()から移植
   */
  private renderSavedStrokes(): void {
    const strokes = drawingSelectors.strokes();
    
    for (const stroke of strokes) {
      this.renderStrokeWithSymmetry(stroke);
    }
  }

  /**
   * 対称変換ありでストロークを描画
   * PaintApp.renderStrokeWithSymmetry()から移植
   */
  private renderStrokeWithSymmetry(stroke: StrokeData): void {
    const symmetryConfig = drawingSelectors.symmetry();
    
    if (symmetryConfig.enabled && symmetryConfig.axisCount > 1) {
      // 対称描画
      const symmetryStrokes = generateSymmetricStrokes(
        stroke,
        symmetryConfig
      ).symmetricStrokes;
      
      if (this.isDebugEnabled()) {
        console.log('Symmetry strokes:', symmetryStrokes);
        console.log('Symmetry config:', symmetryConfig);
        console.log('Symmetry strokes count:', symmetryStrokes.length);
        symmetryStrokes.forEach((symStroke: StrokeData, index: number) => {
          console.log(`Symmetry stroke ${index}:`, symStroke.points.map((p: StrokePoint) => `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`));
        });
      }
      
      // すべての対称ストロークを描画
      for (const symStroke of symmetryStrokes) {
        this.renderer.renderStroke(symStroke);
      }
    } else {
      // 通常描画
      this.renderer.renderStroke(stroke);
    }
  }

  /**
   * 全体を再描画
   * PaintApp.render()から移植
   */
  render(): void {
    this.renderer.clear();
    this.renderSavedStrokes();
  }

  /**
   * キャンバスをクリア
   * 描画関連の状態クリアのみを担当
   */
  clearCanvas(): void {
    drawingStore.getState().clearHistory();
    this.renderer.clear();
    
    if (this.isDebugEnabled()) {
      console.log('Canvas cleared');
    }
  }

  /**
   * 対称設定を更新
   * 描画設定変更のみを担当
   */
  updateSymmetry(enabled: boolean, axisCount?: number): void {
    const store = drawingStore.getState();
    store.setSymmetryEnabled(enabled);
    
    if (axisCount !== undefined) {
      store.setAxisCount(Math.max(2, Math.min(8, axisCount)));
    }
    
    if (this.isDebugEnabled()) {
      console.log('Symmetry updated:', { enabled, axisCount });
    }
  }
}