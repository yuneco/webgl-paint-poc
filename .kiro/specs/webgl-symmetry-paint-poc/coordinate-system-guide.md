# 座標系変換の詳細ガイド

## 概要

WebGL 対称ペイントツールでは、複数の座標系が登場し、それぞれ異なる目的で使用されます。このドキュメントでは、各座標系の役割と、入力から描画までの座標変換の流れを詳しく説明します。

## 座標系の登場人物

### 1. デバイス座標系（Device Coordinates）

**定義**: ブラウザのビューポート基準のピクセル座標

- **原点**: ブラウザウィンドウの左上角
- **単位**: ピクセル (px)
- **範囲**: 0 ～ ウィンドウサイズ
- **Y 軸方向**: 下向きが正

**例**: マウスクリック位置 `(clientX: 150, clientY: 200)`

```
ブラウザウィンドウ
┌─────────────────────────────┐
│ (0,0)                       │
│   ┌─────────────────┐       │
│   │     Canvas      │       │
│   │  (150,200)●     │       │
│   │                 │       │
│   └─────────────────┘       │
│                             │
└─────────────────────────────┘
```

### 2. Canvas 座標系（Canvas Coordinates）

**定義**: 描画キャンバスの論理座標系（内部的なイデアルな座標）

- **原点**: キャンバスの左上角
- **単位**: 論理ピクセル
- **範囲**: 0 ～ 1024 (固定サイズ)
- **Y 軸方向**: 下向きが正

**重要**: これが**内部的なイデアルな描画エリア**です。すべてのストロークデータはこの座標系で保存・管理されます。

```
Canvas座標系 (1024x1024)
┌─────────────────────────────┐ (1024,0)
│ (0,0)                       │
│                             │
│           ●(512,512)        │ ← 対称の中心点
│                             │
│                             │
└─────────────────────────────┘ (1024,1024)
```

### 3. ビュー座標系（View Coordinates）

**定義**: ズーム・パン・回転が適用された Canvas 座標系

- **原点**: ビュー変換後の座標
- **単位**: 変換後の論理ピクセル
- **範囲**: ズーム・パンに依存
- **Y 軸方向**: 下向きが正

**例**: ズーム 2 倍、パン(100,50)の場合

```
元のCanvas座標 (400,300) → ビュー座標 (900,650)
計算: (400 * 2 + 100, 300 * 2 + 50)
```

### 4. WebGL 正規化座標系（WebGL Normalized Coordinates）

**定義**: WebGL の標準座標系

- **原点**: 画面中央
- **単位**: 正規化された値
- **範囲**: -1.0 ～ +1.0
- **Y 軸方向**: 上向きが正（Canvas 座標系と逆）

```
WebGL正規化座標系
        (0,1)
         │
(-1,0)───┼───(1,0)
         │
        (0,-1)
```

## 座標変換の流れ

### 入力から描画までの完全な変換チェーン

```
1. デバイス座標 → 2. Canvas座標 → 3. 対称変換 → 4. WebGL座標 → 5. GPU描画
   (clientX,Y)      (0-1024)        (8軸複製)     (-1～1)       (画面表示)
```

### 詳細な変換ステップ

#### ステップ 1: デバイス座標 → Canvas 座標

**目的**: ブラウザの入力イベントを内部座標系に変換

```typescript
function deviceToCanvas(
  deviceX: number,
  deviceY: number,
  canvasElement: HTMLCanvasElement
): CanvasPoint {
  const rect = canvasElement.getBoundingClientRect();

  // Canvas要素内の相対座標に変換
  const relativeX = deviceX - rect.left;
  const relativeY = deviceY - rect.top;

  // Canvas論理座標(0-1024)にスケール
  const canvasX = (relativeX / rect.width) * 1024;
  const canvasY = (relativeY / rect.height) * 1024;

  return { x: canvasX, y: canvasY };
}
```

#### ステップ 2: ビュー変換の適用

**目的**: ズーム・パン・回転を考慮した座標変換

```typescript
function applyViewTransform(
  canvasPoint: CanvasPoint,
  viewState: ViewState
): CanvasPoint {
  // 1. 平行移動（パン）
  let x = canvasPoint.x + viewState.panOffset.x;
  let y = canvasPoint.y + viewState.panOffset.y;

  // 2. 回転（中心点周りの回転）
  if (viewState.rotation !== 0) {
    const centerX = 512,
      centerY = 512;
    const cos = Math.cos(viewState.rotation);
    const sin = Math.sin(viewState.rotation);

    const dx = x - centerX;
    const dy = y - centerY;

    x = centerX + (dx * cos - dy * sin);
    y = centerY + (dx * sin + dy * cos);
  }

  // 3. スケール（ズーム）
  x = (x - 512) * viewState.zoomLevel + 512;
  y = (y - 512) * viewState.zoomLevel + 512;

  return { x, y };
}
```

#### ステップ 3: 対称変換

**目的**: 8 軸対称の複製ポイント生成

```typescript
function generateSymmetricPoints(
  canvasPoint: CanvasPoint,
  symmetryConfig: SymmetryConfig
): CanvasPoint[] {
  const points: CanvasPoint[] = [canvasPoint]; // 元のポイント
  const centerX = 512,
    centerY = 512;

  // 中心からの相対座標
  const dx = canvasPoint.x - centerX;
  const dy = canvasPoint.y - centerY;

  // 8軸対称（45度間隔）
  for (let i = 1; i < 8; i++) {
    const angle = (i * Math.PI) / 4; // 45度 * i
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const newX = centerX + (dx * cos - dy * sin);
    const newY = centerY + (dx * sin + dy * cos);

    points.push({ x: newX, y: newY });
  }

  return points;
}
```

#### ステップ 4: Canvas 座標 → WebGL 座標

**目的**: WebGL 描画用の正規化座標に変換

```typescript
function canvasToWebGL(canvasPoint: CanvasPoint): WebGLPoint {
  // 0-1024 → 0-1 → -1～1 に変換
  const normalizedX = (canvasPoint.x / 1024) * 2 - 1;
  const normalizedY = -((canvasPoint.y / 1024) * 2 - 1); // Y軸反転

  return { x: normalizedX, y: normalizedY };
}
```

## 内部データの保存・管理方針

### イデアルな座標系での管理

**すべてのストロークデータは Canvas 座標系（0-1024）で保存**

```typescript
interface StrokePoint {
  x: number; // Canvas座標 (0-1024)
  y: number; // Canvas座標 (0-1024)
  pressure: number;
  timestamp: number;
}

interface StrokeData {
  points: StrokePoint[]; // Canvas座標系で保存
  // ...
}
```

### なぜ Canvas 座標系で管理するのか？

1. **ビュー変換に依存しない**: ズーム・パンしてもデータは不変
2. **対称変換が簡単**: 中心点(512,512)が固定で計算しやすい
3. **永続化に適している**: ファイル保存時に座標が安定
4. **デバッグしやすい**: 座標値が直感的（0-1024 の範囲）

### データフローの例

```
ユーザーがマウスクリック (clientX: 300, clientY: 400)
↓
Canvas座標に変換 (x: 256, y: 341)  ← この値でStrokePointを作成・保存
↓
対称変換で8個のポイント生成 [(256,341), (341,256), ...]
↓
各ポイントをWebGL座標に変換 [(-0.5, 0.33), (0.33, -0.5), ...]
↓
WebGLで描画
```

## 座標変換レイヤーの実装

### CoordinateTransform の役割

```typescript
interface CoordinateTransform {
  // 入力処理用
  deviceToCanvas(deviceX: number, deviceY: number): CanvasPoint;

  // 描画処理用
  canvasToWebGL(canvasX: number, canvasY: number): WebGLPoint;

  // デバッグ・UI用
  canvasToDevice(canvasX: number, canvasY: number): DevicePoint;
  webGLToCanvas(webglX: number, webglY: number): CanvasPoint;
}
```

### 変換行列による効率的な実装

```typescript
class CoordinateTransformManager implements CoordinateTransform {
  private viewMatrix: Matrix3x3;
  private inverseViewMatrix: Matrix3x3;
  private canvasToWebGLMatrix: Matrix3x3;

  constructor(viewState: ViewState, canvasElement: HTMLCanvasElement) {
    this.updateTransforms(viewState, canvasElement);
  }

  updateTransforms(
    viewState: ViewState,
    canvasElement: HTMLCanvasElement
  ): void {
    // ビュー変換行列の計算
    this.viewMatrix = this.calculateViewMatrix(viewState);
    this.inverseViewMatrix = this.viewMatrix.inverse();

    // Canvas→WebGL変換行列
    this.canvasToWebGLMatrix = Matrix3x3.scale(2 / 1024, -2 / 1024).multiply(
      Matrix3x3.translation(-1, 1)
    );
  }

  deviceToCanvas(deviceX: number, deviceY: number): CanvasPoint {
    // デバイス座標→Canvas座標の変換
    // 実装詳細...
  }

  canvasToWebGL(canvasX: number, canvasY: number): WebGLPoint {
    // 行列を使った効率的な変換
    const point = this.canvasToWebGLMatrix.transformPoint(canvasX, canvasY);
    return { x: point.x, y: point.y };
  }
}
```

## まとめ

### 座標系の使い分け

| 座標系          | 用途           | 管理場所       | 変換タイミング |
| --------------- | -------------- | -------------- | -------------- |
| デバイス座標    | 入力イベント   | 一時的         | 入力時のみ     |
| **Canvas 座標** | **データ保存** | **StrokeData** | **永続的**     |
| ビュー座標      | 表示計算       | 一時的         | 描画時のみ     |
| WebGL 座標      | GPU 描画       | 一時的         | 描画時のみ     |

### 設計の利点

1. **データの安定性**: Canvas 座標系でのデータ保存により、ビュー変更に影響されない
2. **変換の明確性**: 各ステップの責任が明確で、デバッグしやすい
3. **拡張性**: 新しい座標系（タイル座標など）の追加が容易
4. **パフォーマンス**: 行列計算による効率的な変換
5. **テスタビリティ**: 各変換ステップを独立してテスト可能

この設計により、複雑な座標変換を整理し、保守性の高いシステムを構築できます。
