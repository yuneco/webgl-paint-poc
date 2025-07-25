/**
 * アプリケーションのステート型定義
 * コアステートとUIステートを明確に分離
 */

import type { StrokeData, StrokePoint } from './core';
import type { ViewTransformState } from './coordinates';
import type { NormalizedInputEvent } from '../input/InputEventHandler';

// =============================================================================
// CORE STATE - アプリケーションの本質的な状態
// このステートはUIの変更に影響されず、描画エンジンの核となる設定
// =============================================================================

/**
 * 描画エンジンの設定
 */
export interface DrawingEngineState {
  /** WebGLレンダラーが初期化済みか */
  isInitialized: boolean;
  /** キャンバスサイズ */
  canvasSize: { width: number; height: number };
  /** 現在の描画色（RGBA 0-1） */
  color: [number, number, number, number];
  /** ブラシサイズ（ピクセル） */
  brushSize: number;
  /** ブラシの不透明度（0-1） */
  opacity: number;
  /** 現在描画中かどうか */
  isDrawing: boolean;
  /** 現在描画中のストローク */
  currentStroke: StrokePoint[];
}

/**
 * 対称描画の設定
 */
export interface SymmetryState {
  /** 対称描画が有効か */
  enabled: boolean;
  /** 対称軸数 */
  axisCount: number;
  /** 対称の中心点 */
  centerPoint: { x: number; y: number };
}

/**
 * キャンバスとビューの状態
 */
export interface ViewState {
  /** ズームレベル（1.0 = 100%） */
  zoom: number;
  /** パン位置 */
  pan: { x: number; y: number };
  /** 回転角度（ラジアン） */
  rotation: number;
  /** ビュー変換状態 */
  transform: ViewTransformState;
}

/**
 * 描画データの履歴管理
 */
export interface DrawingHistoryState {
  /** 現在のストローク履歴 */
  strokes: StrokeData[];
  /** アンドゥ/リドゥ用のヒストリーインデックス */
  historyIndex: number;
  /** ヒストリーの最大保持数 */
  maxHistorySize: number;
}

/**
 * パフォーマンス監視の状態
 */
export interface PerformanceState {
  /** 現在のFPS */
  fps: number;
  /** フレーム時間（ms） */
  frameTime: number;
  /** 入力遅延（ms） */
  inputDelay: number;
  /** メモリ使用量（MB） */
  memoryUsage: number;
}

/**
 * アプリケーション設定の状態
 */
export interface AppConfigState {
  /** Canvas要素のID */
  canvasId: string;
  /** Canvas表示サイズ */
  displaySize: { width: number; height: number };
  /** デバッグモードを有効にするか */
  enableDebug: boolean;
}

/**
 * 入力処理の状態
 */
export interface InputProcessorState {
  /** 最後に処理されたイベント */
  lastEvent?: NormalizedInputEvent;
  /** 処理されたイベントの総数 */
  eventCount: number;
  /** 入力処理開始時刻 */
  sessionStartTime?: number;
}

/**
 * コアアプリケーションステート
 * UIに依存しない、アプリケーションの本質的な状態
 */
export interface CoreState {
  drawingEngine: DrawingEngineState;
  symmetry: SymmetryState;
  view: ViewState;
  history: DrawingHistoryState;
  performance: PerformanceState;
  appConfig: AppConfigState;
  inputProcessor: InputProcessorState;
}

// =============================================================================
// UI STATE - デモ・表示用の状態
// UIの変更や実験的な機能に対応するため、コアステートから分離
// =============================================================================

/**
 * デモUI用の設定
 */
export interface DemoUIState {
  /** 選択されている描画モード */
  selectedDrawingMode: 'line' | 'curve' | 'arc' | 'multi';
  /** 色選択UI用の色名 */
  selectedColorName: 'black' | 'red' | 'blue' | 'green' | 'orange' | 'purple';
  /** デモ用のテストパターン表示状態 */
  showTestPatterns: boolean;
}

/**
 * パフォーマンス表示UI用の設定
 */
export interface PerformanceUIState {
  /** メトリクス表示の可視性 */
  showMetrics: boolean;
  /** 詳細メトリクス表示 */
  showDetailedMetrics: boolean;
  /** メトリクス更新頻度（ms） */
  metricsUpdateInterval: number;
}

/**
 * デバッグ・開発用のUI設定
 */
export interface DebugUIState {
  /** デバッグ情報の表示 */
  showDebugInfo: boolean;
  /** 対称軸の可視化 */
  showSymmetryAxes: boolean;
  /** グリッド表示 */
  showGrid: boolean;
}

/**
 * UIアプリケーションステート
 * 頻繁に変更される可能性があるUI関連の状態
 */
export interface UIState {
  demo: DemoUIState;
  performance: PerformanceUIState;
  debug: DebugUIState;
}

// =============================================================================
// COMBINED STATE - 完全なアプリケーション状態
// =============================================================================

/**
 * アプリケーション全体の状態
 */
export interface AppState {
  core: CoreState;
  ui: UIState;
}

// =============================================================================
// STATE ACTIONS - 状態変更のアクション定義
// =============================================================================

/**
 * 描画エンジン関連のアクション
 */
export interface DrawingEngineActions {
  initializeEngine: (canvasSize: { width: number; height: number }) => void;
  setColor: (color: [number, number, number, number]) => void;
  setBrushSize: (size: number) => void;
  setOpacity: (opacity: number) => void;
  cleanup: () => void;
  // 描画セッション管理
  startDrawing: (point: StrokePoint) => void;
  continueDrawing: (point: StrokePoint) => void;
  endDrawing: (point: StrokePoint) => void;
  cancelDrawing: () => void;
}

/**
 * 対称描画関連のアクション
 */
export interface SymmetryActions {
  toggleSymmetry: () => void;
  setSymmetryEnabled: (enabled: boolean) => void;
  setAxisCount: (count: number) => void;
  setCenterPoint: (point: { x: number; y: number }) => void;
}

/**
 * ビュー関連のアクション
 */
export interface ViewActions {
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setRotation: (rotation: number) => void;
  resetView: () => void;
}

/**
 * 履歴管理関連のアクション
 */
export interface HistoryActions {
  addStroke: (stroke: StrokeData) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

/**
 * UI関連のアクション
 */
export interface UIActions {
  setDrawingMode: (mode: DemoUIState['selectedDrawingMode']) => void;
  setColorName: (colorName: DemoUIState['selectedColorName']) => void;
  toggleMetrics: () => void;
  toggleDebugInfo: () => void;
  toggleSymmetryAxes: () => void;
}

/**
 * パフォーマンス監視関連のアクション
 */
export interface PerformanceActions {
  updateFPS: (fps: number) => void;
  updateFrameTime: (frameTime: number) => void;
  updateInputDelay: (delay: number) => void;
  updateMemoryUsage: (usage: number) => void;
}

/**
 * アプリケーション設定関連のアクション
 */
export interface AppConfigActions {
  setCanvasId: (canvasId: string) => void;
  setDisplaySize: (size: { width: number; height: number }) => void;
  setDebugMode: (enabled: boolean) => void;
  updateConfig: (config: Partial<AppConfigState>) => void;
}

/**
 * 入力処理関連のアクション
 */
export interface InputProcessorActions {
  updateLastEvent: (event: NormalizedInputEvent) => void;
  incrementEventCount: () => void;
  resetInputProcessor: () => void;
  setSessionStartTime: (timestamp: number) => void;
}

/**
 * 全アクションの統合
 */
export interface AppActions {
  drawing: DrawingEngineActions;
  symmetry: SymmetryActions;
  view: ViewActions;
  history: HistoryActions;
  ui: UIActions;
  performance: PerformanceActions;
  appConfig: AppConfigActions;
  inputProcessor: InputProcessorActions;
}