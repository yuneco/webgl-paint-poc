// Core data types for WebGL Symmetry Paint PoC

export interface StrokePoint {
  x: number; // Canvas座標 (0-1024)
  y: number; // Canvas座標 (0-1024)
  pressure: number; // 筆圧 (0.0-1.0)
  timestamp: number; // ミリ秒タイムスタンプ
}

export interface StrokeData {
  id: string;
  points: StrokePoint[];
  symmetryMode: SymmetryMode;
  timestamp: number;
  completed: boolean;
}

export const SymmetryMode = {
  NONE: 'none',
  RADIAL_8: 'radial_8', // 8軸放射対称
} as const;

export type SymmetryMode = typeof SymmetryMode[keyof typeof SymmetryMode];

export interface SymmetryConfig {
  mode: SymmetryMode;
  origin: { x: number; y: number }; // 対称原点 (固定: 512, 512)
  axisCount: number; // 対称軸数 (固定: 8)
}

export interface ViewState {
  zoomLevel: number; // ズームレベル (0.1-2.0)
  panOffset: { x: number; y: number }; // パン オフセット
  canvasSize: { width: number; height: number }; // Canvas サイズ (固定: 1024x1024)
  tilingEnabled: boolean; // タイリング表示有効/無効
}

export interface DrawingState {
  currentStroke: StrokePoint[];
  completedStrokes: StrokeData[];
  symmetryConfig: SymmetryConfig;
  isDrawing: boolean;
}

export interface PerformanceState {
  fps: number;
  memoryUsage: MemoryInfo;
  inputLatency: number; // ミリ秒
  frameMetrics: FrameMetrics;
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  webglMemoryUsage: number; // 推定値
}

export interface FrameMetrics {
  renderTime: number; // 描画時間 (ミリ秒)
  bufferUpdateTime: number; // バッファ更新時間 (ミリ秒)
  totalFrameTime: number; // 総フレーム時間 (ミリ秒)
}

export interface PerformanceMetrics {
  fps: number;
  inputLatency: number;
  memoryUsage: MemoryInfo;
  frameMetrics: FrameMetrics;
}

export interface AppState {
  drawing: DrawingState;
  view: ViewState;
  performance: PerformanceState;
}

// WebGL specific types
export interface VertexData {
  position: [number, number]; // 頂点座標 (正規化座標 -1.0 to 1.0)
  pressure: number; // 筆圧値 (0.0-1.0)
  symmetryIndex: number; // 対称軸インデックス (0-7)
}

export interface TilePosition {
  offsetX: number;
  offsetY: number;
  scale: number;
}

// Constants
export const CANVAS_SIZE = 1024;
export const SYMMETRY_ORIGIN = { x: 512, y: 512 };
export const SYMMETRY_AXIS_COUNT = 8;
export const TARGET_FPS = 60;
export const MAX_INPUT_LATENCY_MS = 16;

// Default configurations
export const DEFAULT_SYMMETRY_CONFIG: SymmetryConfig = {
  mode: SymmetryMode.RADIAL_8,
  origin: SYMMETRY_ORIGIN,
  axisCount: SYMMETRY_AXIS_COUNT,
};

export const DEFAULT_VIEW_STATE: ViewState = {
  zoomLevel: 1.0,
  panOffset: { x: 0, y: 0 },
  canvasSize: { width: CANVAS_SIZE, height: CANVAS_SIZE },
  tilingEnabled: false,
};

export const DEFAULT_DRAWING_STATE: DrawingState = {
  currentStroke: [],
  completedStrokes: [],
  symmetryConfig: DEFAULT_SYMMETRY_CONFIG,
  isDrawing: false,
};