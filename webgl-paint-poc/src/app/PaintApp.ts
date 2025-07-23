/**
 * メインペイントアプリケーション
 * 入力処理、描画エンジン、ステート管理の統合
 */

import { WebGLRenderer } from '../webgl/WebGLRenderer';
import { InputProcessor } from '../input/InputProcessor';
import { SymmetryRenderer } from '../symmetry/symmetryRenderer';
import { coreStore } from '../store/coreStore';
import type { NormalizedInputEvent } from '../input/InputEventHandler';
import type { StrokeData, StrokePoint } from '../types/core';

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
 * メインペイントアプリケーションクラス
 */
export class PaintApp {
  private canvas: HTMLCanvasElement;
  private renderer: WebGLRenderer;
  private inputProcessor: InputProcessor;
  private symmetryRenderer: SymmetryRenderer;
  
  private currentStroke: StrokePoint[] = [];
  private isDrawing: boolean = false;
  private config: PaintAppConfig;

  constructor(config: PaintAppConfig) {
    this.config = config;
    this.canvas = this.initializeCanvas();
    this.renderer = new WebGLRenderer(this.canvas);
    this.symmetryRenderer = new SymmetryRenderer();
    
    // Input処理の初期化
    this.inputProcessor = new InputProcessor(this.canvas);
    this.inputProcessor.setEventCallback(this.handleInputEvent.bind(this));
    
    // ステート変更の監視
    this.setupStateSubscriptions();
    
    // 初期描画
    this.render();
    
    if (this.config.enableDebug) {
      this.setupDebugInfo();
    }
  }

  /**
   * Canvas要素を初期化
   */
  private initializeCanvas(): HTMLCanvasElement {
    const canvas = document.getElementById(this.config.canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id "${this.config.canvasId}" not found`);
    }
    
    // Canvas論理サイズを設定
    canvas.width = 1024;
    canvas.height = 1024;
    
    // Canvas表示サイズを設定
    canvas.style.width = `${this.config.displaySize.width}px`;
    canvas.style.height = `${this.config.displaySize.height}px`;
    canvas.style.border = '1px solid #ccc';
    canvas.style.cursor = 'crosshair';
    
    return canvas;
  }


  /**
   * ステート変更の監視を設定
   */
  private setupStateSubscriptions(): void {
    // 対称設定の変更を監視
    coreStore.subscribe(
      (state) => state.symmetry,
      (symmetryState) => {
        if (this.config.enableDebug) {
          console.log('Symmetry state changed:', symmetryState);
        }
        // 対称設定変更時に再描画
        this.render();
      }
    );

    // ビュー状態の変更を監視
    coreStore.subscribe(
      (state) => state.view,
      (viewState) => {
        if (this.config.enableDebug) {
          console.log('View state changed:', viewState);
        }
        // ビュー変換を入力処理に反映
        this.inputProcessor.updateViewTransform(viewState.transform);
        this.render();
      }
    );
  }

  /**
   * 入力イベントハンドラー
   */
  private handleInputEvent(event: NormalizedInputEvent): void {
    if (this.config.enableDebug) {
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
   * ストローク開始
   */
  private startStroke(event: NormalizedInputEvent): void {
    this.isDrawing = true;
    this.currentStroke = [this.eventToStrokePoint(event)];
    
    // ストローク開始をステートに記録
    // Note: startStroke action is not implemented yet, skipping for now
    
    if (this.config.enableDebug) {
      console.log('Stroke started at:', event.position);
    }
  }

  /**
   * ストローク継続
   */
  private continueStroke(event: NormalizedInputEvent): void {
    if (!this.isDrawing) return;
    
    const strokePoint = this.eventToStrokePoint(event);
    this.currentStroke.push(strokePoint);
    
    // リアルタイム描画
    this.renderCurrentStroke();
    
    if (this.config.enableDebug && this.currentStroke.length % 5 === 0) {
      console.log(`Stroke continues, ${this.currentStroke.length} points`);
    }
  }

  /**
   * ストローク終了
   */
  private endStroke(event: NormalizedInputEvent): void {
    if (!this.isDrawing) return;
    
    const strokePoint = this.eventToStrokePoint(event);
    this.currentStroke.push(strokePoint);
    
    // ストロークデータを作成
    const strokeData: StrokeData = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      points: [...this.currentStroke],
      timestamp: Date.now(),
      metadata: {
        timestamp: Date.now(),
        deviceType: event.deviceType,
        totalPoints: this.currentStroke.length,
      },
    };
    
    // ストローク終了をステートに記録
    // For now, directly add to history
    const state = coreStore.getState();
    const newStrokes = [...state.history.strokes, strokeData];
    coreStore.setState((prevState) => ({
      ...prevState,
      history: {
        ...prevState.history,
        strokes: newStrokes,
        historyIndex: newStrokes.length,
      }
    }));
    
    this.isDrawing = false;
    this.currentStroke = [];
    
    // 最終描画
    this.render();
    
    if (this.config.enableDebug) {
      console.log('Stroke completed:', strokeData);
    }
  }

  /**
   * 入力イベントをStrokePointに変換
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
   */
  private renderCurrentStroke(): void {
    if (this.currentStroke.length < 2) return;
    
    // 既存の描画をクリア
    this.renderer.clear();
    
    // 保存済みストロークを描画
    this.renderSavedStrokes();
    
    // 現在のストロークを描画
    const tempStrokeData: StrokeData = {
      id: 'temp_stroke',
      points: [...this.currentStroke],
      timestamp: Date.now(),
      metadata: {
        timestamp: Date.now(),
        deviceType: 'unknown',
        totalPoints: this.currentStroke.length,
      },
    };
    
    this.renderStrokeWithSymmetry(tempStrokeData);
  }

  /**
   * 保存済みストロークを描画
   */
  private renderSavedStrokes(): void {
    const state = coreStore.getState();
    const strokes = state.history.strokes;
    
    for (const stroke of strokes) {
      this.renderStrokeWithSymmetry(stroke);
    }
  }

  /**
   * 対称変換ありでストロークを描画
   */
  private renderStrokeWithSymmetry(stroke: StrokeData): void {
    const state = coreStore.getState();
    const symmetryConfig = state.symmetry;
    
    if (symmetryConfig.enabled && symmetryConfig.axisCount > 1) {
      // 対称描画
      const symmetryResult = this.symmetryRenderer.generateSymmetryStrokes(
        stroke,
        symmetryConfig
      );
      
      if (this.config.enableDebug) {
        console.log('Symmetry result:', symmetryResult);
        console.log('Symmetry config:', symmetryConfig);
      }
      
      // 対称ストローク配列を取得 
      const symmetryStrokes = symmetryResult;
      
      if (this.config.enableDebug) {
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
   */
  private render(): void {
    this.renderer.clear();
    this.renderSavedStrokes();
  }

  /**
   * デバッグ情報の設定
   */
  private setupDebugInfo(): void {
    // デバッグ情報表示用の要素を作成
    const debugContainer = document.createElement('div');
    debugContainer.id = 'paint-debug-info';
    debugContainer.style.cssText = `
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
    document.body.appendChild(debugContainer);

    // デバッグ情報を定期更新
    setInterval(() => {
      this.updateDebugInfo(debugContainer);
    }, 100);
  }

  /**
   * デバッグ情報を更新
   */
  private updateDebugInfo(container: HTMLElement): void {
    const coreState = coreStore.getState();
    const inputStats = this.inputProcessor.getStats();
    
    const debugInfo = {
      'Drawing': {
        'Strokes': coreState.history.strokes.length,
        'Is Drawing': this.isDrawing,
        'Current Points': this.currentStroke.length,
      },
      'Symmetry': {
        'Enabled': coreState.symmetry.enabled,
        'Axis Count': coreState.symmetry.axisCount,
        'Center': coreState.symmetry.centerPoint ? `(${coreState.symmetry.centerPoint.x}, ${coreState.symmetry.centerPoint.y})` : '(512, 512)',
      },
      'Input': {
        'Capturing': inputStats.inputHandler.isCapturing,
        'Active Pointers': inputStats.inputHandler.activePointerCount,
        'Buffer Size': inputStats.throttler.bufferSize,
        'Total Events': inputStats.processor.totalEventsProcessed,
      },
      'View': {
        'Zoom': coreState.view?.transform?.zoom?.toFixed(2) || '1.00',
        'Pan': coreState.view?.transform?.panOffset 
          ? `(${coreState.view.transform.panOffset.canvasX.toFixed(0)}, ${coreState.view.transform.panOffset.canvasY.toFixed(0)})`
          : '(0, 0)',
        'Rotation': coreState.view?.transform?.rotation
          ? `${(coreState.view.transform.rotation * 180 / Math.PI).toFixed(1)}°`
          : '0.0°',
      },
    };

    const formatObject = (obj: any, indent: number = 0): string => {
      const prefix = '  '.repeat(indent);
      return Object.entries(obj)
        .map(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            return `${prefix}${key}:\n${formatObject(value, indent + 1)}`;
          }
          return `${prefix}${key}: ${value}`;
        })
        .join('\n');
    };

    container.innerHTML = `<pre>${formatObject(debugInfo)}</pre>`;
  }

  /**
   * Canvas表示サイズを更新
   */
  public updateDisplaySize(size: { width: number; height: number }): void {
    this.config.displaySize = size;
    this.canvas.style.width = `${size.width}px`;
    this.canvas.style.height = `${size.height}px`;
  }

  /**
   * キャンバスをクリア
   */
  public clearCanvas(): void {
    // Clear the history directly
    coreStore.setState((prevState) => ({
      ...prevState,
      history: {
        ...prevState.history,
        strokes: [],
        historyIndex: 0,
      }
    }));
    this.renderer.clear();
    
    if (this.config.enableDebug) {
      console.log('Canvas cleared');
    }
  }

  /**
   * 対称設定を更新
   */
  public updateSymmetry(enabled: boolean, axisCount?: number): void {
    // Update symmetry settings directly
    coreStore.setState((prevState) => ({
      ...prevState,
      symmetry: {
        ...prevState.symmetry,
        enabled: enabled !== undefined ? enabled : prevState.symmetry.enabled,
        axisCount: axisCount !== undefined ? Math.max(2, Math.min(8, axisCount)) : prevState.symmetry.axisCount,
      }
    }));
    
    if (this.config.enableDebug) {
      console.log('Symmetry updated:', { enabled, axisCount });
    }
  }

  /**
   * アプリケーションを破棄
   */
  public destroy(): void {
    this.inputProcessor.destroy();
    this.renderer.cleanup();
    
    // デバッグ情報要素を削除
    const debugContainer = document.getElementById('paint-debug-info');
    if (debugContainer) {
      debugContainer.remove();
    }
    
    if (this.config.enableDebug) {
      console.log('PaintApp destroyed');
    }
  }

  /**
   * 現在の状態を取得（デバッグ用）
   */
  public getDebugState(): any {
    return {
      isDrawing: this.isDrawing,
      currentStrokePoints: this.currentStroke.length,
      config: this.config,
      coreState: coreStore.getState(),
      inputStats: this.inputProcessor.getStats(),
    };
  }
}