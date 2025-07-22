/**
 * 座標系の型定義
 * 各座標系を明確に区別してtype safetyを確保
 */

/**
 * デバイス座標系（ブラウザのビューポート基準）
 * - 原点: ブラウザウィンドウの左上角
 * - 単位: ピクセル (px)
 * - Y軸: 下向きが正
 */
export interface DeviceCoordinates {
  /** デバイスX座標（ピクセル） */
  deviceX: number;
  /** デバイスY座標（ピクセル） */
  deviceY: number;
}

/**
 * Canvas座標系（内部データ保存用の論理座標）
 * - 原点: キャンバス左上角
 * - 単位: 論理ピクセル
 * - 範囲: 0 ～ 1024
 * - Y軸: 下向きが正
 * - 対称中心: (512, 512)
 */
export interface CanvasCoordinates {
  /** Canvas X座標（0-1024） */
  canvasX: number;
  /** Canvas Y座標（0-1024） */
  canvasY: number;
}

/**
 * ビュー座標系（ズーム・パン・回転適用後）
 * - 原点: ビュー変換後の座標
 * - 単位: 変換後の論理ピクセル
 * - Y軸: 下向きが正
 */
export interface ViewCoordinates {
  /** ビューX座標（変換後） */
  viewX: number;
  /** ビューY座標（変換後） */
  viewY: number;
}

/**
 * WebGL正規化座標系（GPU描画用）
 * - 原点: 画面中央
 * - 範囲: -1.0 ～ +1.0
 * - Y軸: 上向きが正（Canvas座標系と逆）
 */
export interface WebGLCoordinates {
  /** WebGL正規化X座標（-1.0 ～ 1.0） */
  webglX: number;
  /** WebGL正規化Y座標（-1.0 ～ 1.0） */
  webglY: number;
}

/**
 * 汎用2Dポイント（座標系に依存しない）
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * ビュー変換の状態
 */
export interface ViewTransformState {
  /** ズームレベル（1.0 = 100%） */
  zoom: number;
  /** パンオフセット（Canvas座標系） */
  panOffset: CanvasCoordinates;
  /** 回転角度（ラジアン） */
  rotation: number;
}

/**
 * Canvas要素の境界情報
 */
export interface CanvasBounds {
  /** Canvas要素の左端位置（デバイス座標） */
  left: number;
  /** Canvas要素の上端位置（デバイス座標） */
  top: number;
  /** Canvas要素の表示幅（ピクセル） */
  width: number;
  /** Canvas要素の表示高さ（ピクセル） */
  height: number;
}

// 定数定義

/** Canvas座標系のサイズ（固定値） */
export const CANVAS_SIZE = 1024;

/** Canvas座標系の中心点（対称変換の基準） */
export const CANVAS_CENTER: CanvasCoordinates = {
  canvasX: 512,
  canvasY: 512,
};

/** WebGL座標系の原点 */
export const WEBGL_ORIGIN: WebGLCoordinates = {
  webglX: 0,
  webglY: 0,
};

/**
 * 座標系変換のエラー型
 */
export class CoordinateTransformError extends Error {
  constructor(
    message: string,
    public readonly sourceCoordinate?: unknown,
    public readonly transformType?: string
  ) {
    super(message);
    this.name = 'CoordinateTransformError';
  }
}

/**
 * 座標値の有効性チェック関数
 */
export const CoordinateValidation = {
  /**
   * Canvas座標が有効範囲内かチェック
   */
  isValidCanvasCoordinates(coords: CanvasCoordinates): boolean {
    return (
      coords.canvasX >= 0 &&
      coords.canvasX <= CANVAS_SIZE &&
      coords.canvasY >= 0 &&
      coords.canvasY <= CANVAS_SIZE
    );
  },

  /**
   * WebGL座標が有効範囲内かチェック
   */
  isValidWebGLCoordinates(coords: WebGLCoordinates): boolean {
    return (
      coords.webglX >= -1.0 &&
      coords.webglX <= 1.0 &&
      coords.webglY >= -1.0 &&
      coords.webglY <= 1.0
    );
  },

  /**
   * デバイス座標が非負値かチェック
   */
  isValidDeviceCoordinates(coords: DeviceCoordinates): boolean {
    return coords.deviceX >= 0 && coords.deviceY >= 0;
  },
};