/**
 * デバッグ情報管理専門モジュール  
 * デバッグUI作成、リアルタイム統計更新、デバッグ状態集約を担当
 */

import { systemSelectors } from '../store/systemStore';
import { drawingSelectors } from '../store/drawingStore';
import { viewSelectors } from '../store/viewStore';

/**
 * 入力統計情報の型定義
 */
interface InputStats {
  inputHandler: {
    isCapturing: boolean;
    activePointerCount: number;
  };
  throttler: {
    bufferSize: number;
  };
  processor: {
    totalEventsProcessed: number;
  };
}

/**
 * デバッグ情報管理専門クラス
 * デバッグ表示とパフォーマンス監視のみに責任を限定
 */
export class DebugManager {
  private debugContainer: HTMLElement | null = null;
  private updateIntervalId: number | null = null;
  private isDebugEnabled: () => boolean;
  private getInputStats: () => InputStats;

  constructor(
    isDebugEnabled: () => boolean,
    getInputStats: () => InputStats
  ) {
    this.isDebugEnabled = isDebugEnabled;
    this.getInputStats = getInputStats;
  }

  /**
   * デバッグ情報の設定
   * PaintApp.setupDebugInfo()から移植
   */
  setupDebugInfo(): void {
    if (!this.isDebugEnabled()) return;

    // デバッグ情報表示用の要素を作成
    this.debugContainer = document.createElement('div');
    this.debugContainer.id = 'paint-debug-info';
    this.debugContainer.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 1000;
      max-width: 300px;
    `;
    document.body.appendChild(this.debugContainer);

    // デバッグ情報を定期更新
    this.updateIntervalId = window.setInterval(() => {
      if (this.debugContainer) {
        this.updateDebugInfo(this.debugContainer);
      }
    }, 100);
  }

  /**
   * デバッグ情報を更新
   * PaintApp.updateDebugInfo()から移植
   */
  private updateDebugInfo(container: HTMLElement): void {
    const drawingState = drawingSelectors.drawingEngine();
    const symmetryState = drawingSelectors.symmetry();
    const historyState = drawingSelectors.history();
    const viewState = viewSelectors.view();
    const inputStats = this.getInputStats();
    
    const debugInfo = {
      'Drawing': {
        'Strokes': historyState.strokes.slice(0, historyState.historyIndex).length,
        'Is Drawing': drawingState.isDrawing,
        'Current Points': drawingState.currentStroke.length,
      },
      'Symmetry': {
        'Enabled': symmetryState.enabled,
        'Axis Count': symmetryState.axisCount,
        'Center': symmetryState.centerPoint 
          ? `(${symmetryState.centerPoint.x}, ${symmetryState.centerPoint.y})` 
          : '(512, 512)',
      },
      'Input': {
        'Capturing': inputStats.inputHandler.isCapturing,
        'Active Pointers': inputStats.inputHandler.activePointerCount,
        'Buffer Size': inputStats.throttler.bufferSize,
        'Total Events': inputStats.processor.totalEventsProcessed,
      },
      'View': {
        'Zoom': viewState.zoom?.toFixed(2) || '1.00',
        'Pan': viewState.transform?.panOffset 
          ? `(${viewState.transform.panOffset.canvasX.toFixed(0)}, ${viewState.transform.panOffset.canvasY.toFixed(0)})`
          : '(0, 0)',
        'Rotation': viewState.transform?.rotation
          ? `${(viewState.transform.rotation * 180 / Math.PI).toFixed(1)}°`
          : '0.0°',
      },
    };

    container.innerHTML = `<pre>${this.formatObject(debugInfo)}</pre>`;
  }

  /**
   * オブジェクトを見やすい形式でフォーマット
   * PaintApp.formatObject()から移植
   */
  private formatObject(obj: any, indent: number = 0): string {
    const prefix = '  '.repeat(indent);
    return Object.entries(obj)
      .map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return `${prefix}${key}:\n${this.formatObject(value, indent + 1)}`;
        }
        return `${prefix}${key}: ${value}`;
      })
      .join('\n');
  }

  /**
   * 現在の状態を取得（デバッグ用）
   * PaintApp.getDebugState()から移植
   */
  getDebugState(): any {
    const drawingState = drawingSelectors.drawingEngine();
    const historyState = drawingSelectors.history();
    const symmetryState = drawingSelectors.symmetry();
    const viewState = viewSelectors.view();
    const systemConfig = systemSelectors.appConfig();
    const performance = systemSelectors.performance();
    const inputStats = this.getInputStats();

    return {
      isDrawing: drawingState.isDrawing,
      currentStrokePoints: drawingState.currentStroke.length,
      totalStrokes: historyState.strokes.slice(0, historyState.historyIndex).length,
      symmetry: {
        enabled: symmetryState.enabled,
        axisCount: symmetryState.axisCount,
        centerPoint: symmetryState.centerPoint,
      },
      view: {
        zoom: viewState.zoom,
        pan: viewState.pan,
        rotation: viewState.rotation,
        transform: viewState.transform,
      },
      performance,
      config: systemConfig,
      inputStats,
    };
  }

  /**
   * パフォーマンス統計を更新
   * 新規追加機能
   */
  updatePerformanceStats(stats: {
    fps?: number;
    frameTime?: number;
    inputDelay?: number;
    memoryUsage?: number;
  }): void {
    // TODO: systemStore経由で更新する必要がある
    if (stats.fps !== undefined) {
      // systemStore.updateFPS(stats.fps);
    }
    if (stats.frameTime !== undefined) {
      // systemStore.updateFrameTime(stats.frameTime);
    }
    if (stats.inputDelay !== undefined) {
      // systemStore.updateInputDelay(stats.inputDelay);
    }
    if (stats.memoryUsage !== undefined) {
      // systemStore.updateMemoryUsage(stats.memoryUsage);
    }
  }

  /**
   * デバッグ情報要素を削除
   * cleanup処理として呼び出される
   */
  cleanup(): void {
    // デバッグ情報要素を削除
    if (this.debugContainer) {
      this.debugContainer.remove();
      this.debugContainer = null;
    }

    // 更新インターバルを停止
    if (this.updateIntervalId !== null) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
    }
    
    if (this.isDebugEnabled()) {
      console.log('DebugManager cleanup completed');
    }
  }

  /**
   * デバッグモードの状態確認
   */
  isEnabled(): boolean {
    return this.isDebugEnabled();
  }

  /**
   * デバッグ情報の表示/非表示切り替え
   */
  toggleVisibility(): void {
    if (!this.debugContainer) return;

    const isVisible = this.debugContainer.style.display !== 'none';
    this.debugContainer.style.display = isVisible ? 'none' : 'block';
  }
}