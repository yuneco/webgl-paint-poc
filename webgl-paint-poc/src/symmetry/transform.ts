// 対称変換の数学的実装

import * as CoreTypes from '../types/core';

type StrokePoint = CoreTypes.StrokePoint;

// 対称変換のヘルパー型定義
export interface Point2D {
  x: number;
  y: number;
}

export interface TransformMatrix {
  m00: number; m01: number; m02: number;
  m10: number; m11: number; m12: number;
  m20: number; m21: number; m22: number;
}

export interface SymmetryTransform {
  axisIndex: number;
  angle: number; // ラジアン
  matrix: TransformMatrix;
}

// 定数
export const SYMMETRY_CENTER: Point2D = { x: 512, y: 512 };
export const AXIS_COUNT = 8;
export const ANGLE_INCREMENT = Math.PI / 4; // 45度 = π/4 ラジアン

/**
 * 度をラジアンに変換
 */
export function degreesToRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * ラジアンを度に変換
 */
export function radiansToDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

/**
 * 8軸対称の各軸の角度を計算 (ラジアン)
 * 軸0: 0度 (右), 軸1: 45度, 軸2: 90度 (上), ..., 軸7: 315度
 */
export function calculateSymmetryAxisAngle(axisIndex: number): number {
  if (axisIndex < 0 || axisIndex >= AXIS_COUNT) {
    throw new Error(`Invalid axis index: ${axisIndex}. Must be 0-${AXIS_COUNT - 1}`);
  }
  return axisIndex * ANGLE_INCREMENT;
}

/**
 * すべての対称軸角度を取得
 */
export function getAllSymmetryAxisAngles(): number[] {
  const angles = [];
  for (let i = 0; i < AXIS_COUNT; i++) {
    angles.push(calculateSymmetryAxisAngle(i));
  }
  return angles;
}

/**
 * 2D回転行列を作成
 */
export function createRotationMatrix(angle: number): TransformMatrix {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  return {
    m00: cos,  m01: -sin, m02: 0,
    m10: sin,  m11: cos,  m12: 0,
    m20: 0,    m21: 0,    m22: 1
  };
}

/**
 * 2D平行移動行列を作成
 */
export function createTranslationMatrix(tx: number, ty: number): TransformMatrix {
  return {
    m00: 1, m01: 0, m02: tx,
    m10: 0, m11: 1, m12: ty,
    m20: 0, m21: 0, m22: 1
  };
}

/**
 * 指定角度の直線に対する反射行列を作成
 */
export function createReflectionMatrix(lineAngle: number = Math.PI/2): TransformMatrix {
  const cos2a = Math.cos(2 * lineAngle);
  const sin2a = Math.sin(2 * lineAngle);
  
  return {
    m00: cos2a,  m01: sin2a,  m02: 0,
    m10: sin2a,  m11: -cos2a, m12: 0,
    m20: 0,      m21: 0,      m22: 1
  };
}

/**
 * 行列の乗算
 */
export function multiplyMatrices(a: TransformMatrix, b: TransformMatrix): TransformMatrix {
  return {
    m00: a.m00 * b.m00 + a.m01 * b.m10 + a.m02 * b.m20,
    m01: a.m00 * b.m01 + a.m01 * b.m11 + a.m02 * b.m21,
    m02: a.m00 * b.m02 + a.m01 * b.m12 + a.m02 * b.m22,
    
    m10: a.m10 * b.m00 + a.m11 * b.m10 + a.m12 * b.m20,
    m11: a.m10 * b.m01 + a.m11 * b.m11 + a.m12 * b.m21,
    m12: a.m10 * b.m02 + a.m11 * b.m12 + a.m12 * b.m22,
    
    m20: a.m20 * b.m00 + a.m21 * b.m10 + a.m22 * b.m20,
    m21: a.m20 * b.m01 + a.m21 * b.m11 + a.m22 * b.m21,
    m22: a.m20 * b.m02 + a.m21 * b.m12 + a.m22 * b.m22
  };
}

/**
 * 点に変換行列を適用
 */
export function applyTransformToPoint(point: Point2D, matrix: TransformMatrix): Point2D {
  return {
    x: matrix.m00 * point.x + matrix.m01 * point.y + matrix.m02,
    y: matrix.m10 * point.x + matrix.m11 * point.y + matrix.m12
  };
}

/**
 * 8軸放射対称の変換行列を生成
 * 各軸について反射対称変換を行う
 */
export function create8AxisSymmetryTransform(axisIndex: number): SymmetryTransform {
  if (axisIndex < 0 || axisIndex >= AXIS_COUNT) {
    throw new Error(`Invalid axis index: ${axisIndex}. Must be 0-${AXIS_COUNT - 1}`);
  }

  const angle = calculateSymmetryAxisAngle(axisIndex);
  
  // 変換手順:
  // 1. 中心点を原点に移動  
  // 2. 指定角度の反射軸で反射
  // 3. 中心点を元の位置に戻す
  
  const centerToOrigin = createTranslationMatrix(-SYMMETRY_CENTER.x, -SYMMETRY_CENTER.y);
  const reflectionLineAngle = angle + Math.PI/2; // 反射軸は法線に垂直
  const reflection = createReflectionMatrix(reflectionLineAngle);
  const originToCenter = createTranslationMatrix(SYMMETRY_CENTER.x, SYMMETRY_CENTER.y);
  
  // 行列の合成（右から左に適用される）
  let matrix = centerToOrigin;
  matrix = multiplyMatrices(reflection, matrix);
  matrix = multiplyMatrices(originToCenter, matrix);
  
  return {
    axisIndex,
    angle,
    matrix
  };
}

/**
 * 全8軸の対称変換を生成
 */
export function createAll8AxisSymmetryTransforms(): SymmetryTransform[] {
  const transforms = [];
  for (let i = 0; i < AXIS_COUNT; i++) {
    transforms.push(create8AxisSymmetryTransform(i));
  }
  return transforms;
}

/**
 * 点を指定軸で対称変換
 */
export function transformPointByAxis(point: Point2D, axisIndex: number): Point2D {
  const transform = create8AxisSymmetryTransform(axisIndex);
  return applyTransformToPoint(point, transform.matrix);
}

/**
 * 点を全軸で対称変換（8つの対称点を生成）
 */
export function transformPointToAllSymmetries(point: Point2D): Point2D[] {
  const symmetricPoints = [];
  for (let i = 0; i < AXIS_COUNT; i++) {
    const transformedPoint = transformPointByAxis(point, i);
    symmetricPoints.push(transformedPoint);
  }
  return symmetricPoints;
}

/**
 * StrokePointを指定軸で対称変換（圧力とタイムスタンプは保持）
 */
export function transformStrokePointByAxis(strokePoint: StrokePoint, axisIndex: number): StrokePoint {
  const transformedPoint = transformPointByAxis(
    { x: strokePoint.x, y: strokePoint.y },
    axisIndex
  );
  
  return {
    x: transformedPoint.x,
    y: transformedPoint.y,
    pressure: strokePoint.pressure, // 圧力は保持
    timestamp: strokePoint.timestamp // タイムスタンプは保持
  };
}

/**
 * StrokePointを全軸で対称変換
 */
export function transformStrokePointToAllSymmetries(strokePoint: StrokePoint): StrokePoint[] {
  const symmetricPoints = [];
  for (let i = 0; i < AXIS_COUNT; i++) {
    const transformedPoint = transformStrokePointByAxis(strokePoint, i);
    symmetricPoints.push(transformedPoint);
  }
  return symmetricPoints;
}

/**
 * 数値の等価性チェック（浮動小数点誤差を考慮）
 */
export function isNearlyEqual(a: number, b: number, epsilon: number = 1e-10): boolean {
  return Math.abs(a - b) < epsilon;
}

/**
 * 点の等価性チェック（浮動小数点誤差を考慮）
 */
export function arePointsNearlyEqual(a: Point2D, b: Point2D, epsilon: number = 1e-10): boolean {
  return isNearlyEqual(a.x, b.x, epsilon) && isNearlyEqual(a.y, b.y, epsilon);
}

/**
 * 変換行列の等価性チェック（浮動小数点誤差を考慮）
 */
export function areMatricesNearlyEqual(a: TransformMatrix, b: TransformMatrix, epsilon: number = 1e-10): boolean {
  return (
    isNearlyEqual(a.m00, b.m00, epsilon) && isNearlyEqual(a.m01, b.m01, epsilon) && isNearlyEqual(a.m02, b.m02, epsilon) &&
    isNearlyEqual(a.m10, b.m10, epsilon) && isNearlyEqual(a.m11, b.m11, epsilon) && isNearlyEqual(a.m12, b.m12, epsilon) &&
    isNearlyEqual(a.m20, b.m20, epsilon) && isNearlyEqual(a.m21, b.m21, epsilon) && isNearlyEqual(a.m22, b.m22, epsilon)
  );
}