/**
 * 3x3変換行列クラス
 * 2D座標変換（平行移動、回転、スケール）を効率的に処理
 * 
 * 行列形式:
 * [ m00  m01  m02 ]   [ scaleX   -sin    translateX ]
 * [ m10  m11  m12 ] = [   sin  scaleY   translateY ]
 * [ m20  m21  m22 ]   [     0      0            1  ]
 */

import type { Point2D } from '../types/coordinates';

export class Matrix3x3 {
  /**
   * 行列要素（行優先順序）
   * [m00 m01 m02]
   * [m10 m11 m12]
   * [m20 m21 m22]
   */
  public readonly elements: Float32Array;

  constructor(
    m00: number = 1, m01: number = 0, m02: number = 0,
    m10: number = 0, m11: number = 1, m12: number = 0,
    m20: number = 0, m21: number = 0, m22: number = 1
  ) {
    this.elements = new Float32Array([
      m00, m01, m02,
      m10, m11, m12,
      m20, m21, m22
    ]);
  }

  /**
   * 単位行列を作成
   */
  static identity(): Matrix3x3 {
    return new Matrix3x3();
  }

  /**
   * 平行移動行列を作成
   * @param translateX X方向の移動量
   * @param translateY Y方向の移動量
   */
  static translation(translateX: number, translateY: number): Matrix3x3 {
    return new Matrix3x3(
      1, 0, translateX,
      0, 1, translateY,
      0, 0, 1
    );
  }

  /**
   * スケール行列を作成
   * @param scaleX X方向のスケール
   * @param scaleY Y方向のスケール（省略時はscaleXと同じ）
   */
  static scale(scaleX: number, scaleY: number = scaleX): Matrix3x3 {
    return new Matrix3x3(
      scaleX, 0, 0,
      0, scaleY, 0,
      0, 0, 1
    );
  }

  /**
   * 回転行列を作成
   * @param angleRadians 回転角度（ラジアン）
   */
  static rotation(angleRadians: number): Matrix3x3 {
    const cos = Math.cos(angleRadians);
    const sin = Math.sin(angleRadians);
    
    return new Matrix3x3(
      cos, -sin, 0,
      sin, cos, 0,
      0, 0, 1
    );
  }

  /**
   * 指定点周りの回転行列を作成
   * @param angleRadians 回転角度（ラジアン）
   * @param centerX 回転中心のX座標
   * @param centerY 回転中心のY座標
   */
  static rotationAround(angleRadians: number, centerX: number, centerY: number): Matrix3x3 {
    // 回転中心を原点に移動 → 回転 → 元の位置に戻す
    return Matrix3x3.translation(centerX, centerY)
      .multiply(Matrix3x3.rotation(angleRadians))
      .multiply(Matrix3x3.translation(-centerX, -centerY));
  }

  /**
   * 行列の乗算
   * @param other 乗算する行列
   * @returns this * other の結果
   */
  multiply(other: Matrix3x3): Matrix3x3 {
    const a = this.elements;
    const b = other.elements;

    return new Matrix3x3(
      // 第1行
      a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
      a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
      a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
      
      // 第2行
      a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
      a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
      a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
      
      // 第3行
      a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
      a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
      a[6] * b[2] + a[7] * b[5] + a[8] * b[8]
    );
  }

  /**
   * 点の変換
   * @param x X座標
   * @param y Y座標
   * @returns 変換後の点
   */
  transformPoint(x: number, y: number): Point2D {
    const e = this.elements;
    
    const transformedX = e[0] * x + e[1] * y + e[2];
    const transformedY = e[3] * x + e[4] * y + e[5];
    
    // 同次座標のW成分チェック（通常は1だが念のため）
    const w = e[6] * x + e[7] * y + e[8];
    
    if (Math.abs(w - 1.0) > 1e-10) {
      return {
        x: transformedX / w,
        y: transformedY / w
      };
    }
    
    return {
      x: transformedX,
      y: transformedY
    };
  }

  /**
   * 逆行列を計算
   * @returns 逆行列（存在しない場合は例外）
   */
  inverse(): Matrix3x3 {
    const e = this.elements;
    
    // 行列式を計算
    const det = this.determinant();
    
    if (Math.abs(det) < 1e-10) {
      throw new Error('Matrix is singular (determinant = 0) and cannot be inverted');
    }
    
    const invDet = 1.0 / det;
    
    // 余因子行列を計算
    return new Matrix3x3(
      invDet * (e[4] * e[8] - e[5] * e[7]),  // m00
      invDet * (e[2] * e[7] - e[1] * e[8]),  // m01
      invDet * (e[1] * e[5] - e[2] * e[4]),  // m02
      
      invDet * (e[5] * e[6] - e[3] * e[8]),  // m10
      invDet * (e[0] * e[8] - e[2] * e[6]),  // m11
      invDet * (e[2] * e[3] - e[0] * e[5]),  // m12
      
      invDet * (e[3] * e[7] - e[4] * e[6]),  // m20
      invDet * (e[1] * e[6] - e[0] * e[7]),  // m21
      invDet * (e[0] * e[4] - e[1] * e[3])   // m22
    );
  }

  /**
   * 行列式を計算
   */
  determinant(): number {
    const e = this.elements;
    
    return e[0] * (e[4] * e[8] - e[5] * e[7]) -
           e[1] * (e[3] * e[8] - e[5] * e[6]) +
           e[2] * (e[3] * e[7] - e[4] * e[6]);
  }

  /**
   * 転置行列を取得
   */
  transpose(): Matrix3x3 {
    const e = this.elements;
    
    return new Matrix3x3(
      e[0], e[3], e[6],
      e[1], e[4], e[7],
      e[2], e[5], e[8]
    );
  }

  /**
   * 行列の要素を取得
   */
  get(row: number, col: number): number {
    if (row < 0 || row > 2 || col < 0 || col > 2) {
      throw new Error(`Invalid matrix indices: (${row}, ${col})`);
    }
    return this.elements[row * 3 + col];
  }

  /**
   * 行列を文字列表現で出力（デバッグ用）
   */
  toString(): string {
    const e = this.elements;
    return `Matrix3x3:\n` +
           `[${e[0].toFixed(3)} ${e[1].toFixed(3)} ${e[2].toFixed(3)}]\n` +
           `[${e[3].toFixed(3)} ${e[4].toFixed(3)} ${e[5].toFixed(3)}]\n` +
           `[${e[6].toFixed(3)} ${e[7].toFixed(3)} ${e[8].toFixed(3)}]`;
  }

  /**
   * 行列の近似等価性をチェック（浮動小数点誤差を考慮）
   */
  equals(other: Matrix3x3, epsilon: number = 1e-10): boolean {
    for (let i = 0; i < 9; i++) {
      if (Math.abs(this.elements[i] - other.elements[i]) > epsilon) {
        return false;
      }
    }
    return true;
  }

  /**
   * 行列要素のコピーを作成
   */
  clone(): Matrix3x3 {
    const e = this.elements;
    return new Matrix3x3(
      e[0], e[1], e[2],
      e[3], e[4], e[5],
      e[6], e[7], e[8]
    );
  }
}