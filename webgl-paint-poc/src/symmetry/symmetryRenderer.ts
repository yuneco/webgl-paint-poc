/**
 * 対称ストローク生成と描画統合システム
 * 単一ストロークから8軸放射対称の複数ストロークを生成し、WebGL描画システムに統合
 */

import * as CoreTypes from '../types/core';
import * as Transform from './transform';
import type { WebGLRenderer } from '../webgl/renderer';
import { renderStroke, renderStrokes } from '../webgl/renderer';

type StrokeData = CoreTypes.StrokeData;
type StrokePoint = CoreTypes.StrokePoint;

/**
 * 対称軸設定
 */
export interface SymmetryConfig {
  /** 対称描画を有効にするか */
  enabled: boolean;
  /** 軸数（8軸固定） */
  axisCount: number;
  /** 対称中心点 */
  centerPoint: Transform.Point2D;
}

/**
 * 対称ストローク生成結果
 */
export interface SymmetricStrokes {
  /** 元のストローク */
  original: StrokeData;
  /** 対称変換されたストローク配列 */
  symmetricStrokes: StrokeData[];
  /** 使用された軸数 */
  axisCount: number;
}

/**
 * デフォルト対称設定（8軸放射対称）
 */
export const DEFAULT_SYMMETRY_CONFIG: SymmetryConfig = {
  enabled: true,
  axisCount: 8,
  centerPoint: Transform.SYMMETRY_CENTER
};

/**
 * 単一ストロークポイントから対称ポイント配列を生成
 * @param point 元のストロークポイント
 * @param axisCount 対称軸数
 * @returns 対称変換されたポイント配列
 */
export function generateSymmetricPoints(point: StrokePoint, axisCount: number): StrokePoint[] {
  const symmetricPoints: StrokePoint[] = [];
  
  // 軸0から軸(axisCount-1)まで変換
  for (let axisIndex = 0; axisIndex < axisCount; axisIndex++) {
    const transformedPoint = Transform.transformStrokePointByAxis(point, axisIndex);
    symmetricPoints.push(transformedPoint);
  }
  
  return symmetricPoints;
}

/**
 * 単一ストロークから対称ストローク配列を生成
 * @param originalStroke 元のストローク
 * @param config 対称設定
 * @returns 対称ストローク生成結果
 */
export function generateSymmetricStrokes(
  originalStroke: StrokeData, 
  config: SymmetryConfig = DEFAULT_SYMMETRY_CONFIG
): SymmetricStrokes {
  if (!config.enabled) {
    return {
      original: originalStroke,
      symmetricStrokes: [originalStroke],
      axisCount: 1
    };
  }

  const symmetricStrokes: StrokeData[] = [];
  
  // 各対称軸についてストローク全体を変換
  for (let axisIndex = 0; axisIndex < config.axisCount; axisIndex++) {
    // Transform each point in the stroke
    const transformedPoints: StrokePoint[] = originalStroke.points.map(point => 
      Transform.transformStrokePointByAxis(point, axisIndex)
    );

    // Create new stroke data with transformed points
    const symmetricStroke: StrokeData = {
      id: `${originalStroke.id}_axis_${axisIndex}`,
      points: transformedPoints,
      timestamp: originalStroke.timestamp,
      metadata: {
        ...originalStroke.metadata,
        symmetryAxis: axisIndex,
        originalStrokeId: originalStroke.id
      }
    };

    symmetricStrokes.push(symmetricStroke);
  }

  return {
    original: originalStroke,
    symmetricStrokes,
    axisCount: config.axisCount
  };
}

/**
 * 複数のストロークから対称ストロークセットを生成
 * @param originalStrokes 元のストローク配列
 * @param config 対称設定
 * @returns 対称ストローク配列（元と対称変換されたもの全て含む）
 */
export function generateAllSymmetricStrokes(
  originalStrokes: StrokeData[], 
  config: SymmetryConfig = DEFAULT_SYMMETRY_CONFIG
): StrokeData[] {
  if (!config.enabled) {
    return originalStrokes;
  }

  const allStrokes: StrokeData[] = [];
  
  for (const originalStroke of originalStrokes) {
    const result = generateSymmetricStrokes(originalStroke, config);
    allStrokes.push(...result.symmetricStrokes);
  }
  
  return allStrokes;
}

/**
 * 単一ストローク対称描画
 */
export function renderStrokeWithSymmetry(
  renderer: WebGLRenderer, 
  stroke: StrokeData, 
  config: SymmetryConfig = DEFAULT_SYMMETRY_CONFIG
): void {
  if (!config.enabled) {
    renderStroke(renderer, stroke);
    return;
  }

  const result = generateSymmetricStrokes(stroke, config);
  renderStrokes(renderer, result.symmetricStrokes);
}

/**
 * 複数ストローク対称描画
 */
export function renderStrokesWithSymmetry(
  renderer: WebGLRenderer, 
  strokes: StrokeData[], 
  config: SymmetryConfig = DEFAULT_SYMMETRY_CONFIG
): void {
  if (!config.enabled) {
    renderStrokes(renderer, strokes);
    return;
  }

  const symmetricStrokes = generateAllSymmetricStrokes(strokes, config);
  renderStrokes(renderer, symmetricStrokes);
}

/**
 * 対称軸数変更時の動作確認用関数
 * @param stroke テストストローク
 * @param axisCount1 最初の軸数
 * @param axisCount2 変更後の軸数
 * @returns 軸数変更結果の比較
 */
export function compareAxisCountResults(
  stroke: StrokeData, 
  axisCount1: number, 
  axisCount2: number
): {
  result1: SymmetricStrokes;
  result2: SymmetricStrokes;
  different: boolean;
} {
  const config1: SymmetryConfig = { axisCount: axisCount1, enabled: true, centerPoint: Transform.SYMMETRY_CENTER };
  const config2: SymmetryConfig = { axisCount: axisCount2, enabled: true, centerPoint: Transform.SYMMETRY_CENTER };
  
  const result1 = generateSymmetricStrokes(stroke, config1);
  const result2 = generateSymmetricStrokes(stroke, config2);
  
  return {
    result1,
    result2,
    different: result1.symmetricStrokes.length !== result2.symmetricStrokes.length
  };
}

/**
 * 対称性の一貫性テスト
 */
export function testSymmetryConsistency(testPoint: Transform.Point2D, epsilon: number = 1e-6): boolean {
  const strokePoint: StrokePoint = { x: testPoint.x, y: testPoint.y, pressure: 1.0, timestamp: 1000 };
  const symmetricPoints = generateSymmetricPoints(strokePoint, 8);
  
  // All symmetric points should be equidistant from center
  const originalDistance = Math.sqrt(
    Math.pow(testPoint.x - Transform.SYMMETRY_CENTER.x, 2) + 
    Math.pow(testPoint.y - Transform.SYMMETRY_CENTER.y, 2)
  );

  return symmetricPoints.every(point => {
    const distance = Math.sqrt(
      Math.pow(point.x - Transform.SYMMETRY_CENTER.x, 2) + 
      Math.pow(point.y - Transform.SYMMETRY_CENTER.y, 2)
    );
    return Math.abs(distance - originalDistance) < epsilon;
  });
}

/**
 * 対称情報取得（デバッグ用）
 */
export function getSymmetryInfo(): {
  axisCount: number;
  axisAngles: number[];
  centerPoint: Transform.Point2D;
} {
  return {
    axisCount: Transform.AXIS_COUNT,
    axisAngles: Transform.getAllSymmetryAxisAngles(),
    centerPoint: Transform.SYMMETRY_CENTER
  };
}