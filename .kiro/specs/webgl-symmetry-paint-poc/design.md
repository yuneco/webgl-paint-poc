# Design Document

## Overview

この PoC は、WebGL ベースの対称ペイントエンジンの技術的実現可能性を検証するためのプロトタイプである。主要な技術課題は、リアルタイム対称描画のパフォーマンス最適化、効率的な WebGL 描画パイプライン、そしてタイリング表示機能の実装である。

### 技術目標

- 60fps 以上での連続描画性能
- 8 軸対称描画のリアルタイム処理
- メモリ効率的な WebGL 実装
- タブレット対応の入力処理

## Architecture

### 設計指針

**ステート管理の分離:**

- アプリケーションステートは明示的なモデルとして中央管理
- 描画関数は可能な限りステートレス（純粋関数）
- WebGL の性能上必要なステート（バッファ、シェーダー）のみ描画層に配置
- 状態変更は単方向データフローで管理

### システム全体構成

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Input Layer   │───▶│   App State      │───▶│  Render Layer   │
│                 │    │                  │    │                 │
│ • Mouse/Touch   │    │ • Drawing State  │    │ • WebGL Context │
│ • Pressure      │    │ • Symmetry Config│    │ • Render Funcs  │
│ • Event Stream  │    │ • Zoom/View      │    │ • Buffer Mgmt   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   UI Controls    │
                       │                  │
                       │ • Zoom Slider    │
                       │ • Performance    │
                       │ • Debug Info     │
                       └──────────────────┘
```

### WebGL 描画パイプライン

```
Input Event → Stroke Point → Symmetry Transform → WebGL Batch → GPU Render
     │              │               │                    │           │
     │              │               │                    │           │
  Pressure      Smoothing      8-way Copy         Vertex Buffer   Frame
  Detection     Algorithm      Generation         Management      Buffer
```

## Components and Interfaces

### アプリケーションステート（中央管理）

```typescript
interface AppState {
  drawing: DrawingState;
  view: ViewState;
  performance: PerformanceState;
}

interface DrawingState {
  currentStroke: StrokePoint[];
  completedStrokes: StrokeData[];
  symmetryConfig: SymmetryConfig;
  isDrawing: boolean;
}

interface ViewState {
  zoomLevel: number;
  panOffset: { x: number; y: number };
  canvasSize: { width: number; height: number };
  tilingEnabled: boolean;
}

interface SymmetryConfig {
  mode: SymmetryMode;
  origin: { x: number; y: number };
  axisCount: number;
}
```

### 純粋関数群（ステートレス）

#### 1. 対称変換関数

```typescript
// 純粋関数：入力に対して決定的な出力
function transformPointSymmetrically(
  point: StrokePoint,
  config: SymmetryConfig
): StrokePoint[] {
  // 対称変換ロジック
}

function calculateSymmetryAxes(config: SymmetryConfig): number[] {
  // 対称軸の角度計算
}
```

#### 2. 入力処理関数

```typescript
function normalizePointerEvent(event: PointerEvent): StrokePoint {
  // イベントを正規化されたStrokePointに変換
}

function applySmoothingToStroke(points: StrokePoint[]): StrokePoint[] {
  // Catmull-Rom splineスムージング
}
```

#### 3. 描画計算関数

```typescript
function calculateVertexData(
  strokes: StrokeData[],
  viewState: ViewState
): VertexData[] {
  // WebGL用頂点データ生成
}

function calculateTilePositions(viewState: ViewState): TilePosition[] {
  // タイリング位置計算
}
```

### WebGL レンダリング層（最小限のステート）

```typescript
interface WebGLContext {
  // WebGL固有のステートのみ保持
  gl: WebGLRenderingContext;
  shaderProgram: WebGLProgram;
  buffers: {
    vertex: WebGLBuffer;
    index: WebGLBuffer;
  };
  textures: Map<string, WebGLTexture>;
}

// ステートレス描画関数
function renderStrokes(
  context: WebGLContext,
  vertexData: VertexData[],
  viewState: ViewState
): void {
  // WebGL描画実行
}

function renderTiles(
  context: WebGLContext,
  tilePositions: TilePosition[],
  patternTexture: WebGLTexture
): void {
  // タイリング描画実行
}
```

### イベントハンドリング（関数型）

```typescript
// 入力イベントストリーム処理
function createInputEventStream(
  canvas: HTMLCanvasElement
): Observable<StrokePoint> {
  // RxJS等を使用したイベントストリーム
}

// ステート更新関数（Reducer風）
function updateDrawingState(
  state: DrawingState,
  action: DrawingAction
): DrawingState {
  // イミュータブルなステート更新
}
```

### パフォーマンス監視（関数型）

```typescript
function measurePerformance<T>(
  operation: () => T,
  label: string
): { result: T; metrics: PerformanceMetrics } {
  // 関数実行時間とメモリ使用量測定
}

function collectFrameMetrics(): FrameMetrics {
  // フレーム単位のメトリクス収集
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  webglMemoryUsage: number;
}
```

## Data Models

### StrokeData 構造

```typescript
interface StrokeData {
  id: string;
  points: StrokePoint[];
  symmetryMode: SymmetryMode;
  timestamp: number;
  completed: boolean;
}

interface StrokePoint {
  x: number; // Canvas座標 (0-1024)
  y: number; // Canvas座標 (0-1024)
  pressure: number; // 筆圧 (0.0-1.0)
  timestamp: number; // ミリ秒タイムスタンプ
}
```

### WebGL バッファ構造

```typescript
interface VertexData {
  position: [number, number]; // 頂点座標
  pressure: number; // 筆圧値
  symmetryIndex: number; // 対称軸インデックス
}
```

## Error Handling

### WebGL エラー処理

- WebGL コンテキスト取得失敗時のフォールバック
- シェーダーコンパイルエラーの詳細ログ
- GPU メモリ不足時の適切な処理
- コンテキストロスト時の復旧処理

### パフォーマンス劣化対応

- FPS 低下時の自動品質調整
- メモリリーク検出と警告
- 長時間描画セッションでの最適化

### 入力エラー処理

- 無効な筆圧値の正規化
- タッチイベントの重複処理防止
- 座標範囲外の値のクランプ

## Testing Strategy

### パフォーマンステスト

1. **描画性能テスト**

   - 連続描画での FPS 測定
   - 対称軸数による性能影響測定
   - メモリ使用量の長期監視

2. **入力遅延テスト**

   - ポインターイベントから描画までの遅延測定
   - 異なるデバイスでの入力精度テスト

3. **WebGL 機能テスト**
   - 異なる GPU・ブラウザでの互換性テスト
   - シェーダー性能のベンチマーク

### 機能テスト

1. **対称描画テスト**

   - 各対称モードの正確性検証
   - 境界条件での動作確認

2. **ズーム・タイリングテスト**
   - 各ズームレベルでの表示品質確認
   - タイル境界のシームレス性検証

### デバイス互換性テスト

- デスクトップブラウザ（Chrome, Firefox, Safari）
- タブレット（iPad, Android）
- 筆圧対応デバイス（Apple Pencil, Wacom）

## Implementation Notes

### WebGL 最適化戦略

- インスタンス描画による対称ストローク一括処理
- 頂点バッファの動的管理とプーリング
- フレームバッファの効率的な使い回し
- シェーダー内での計算最適化

### メモリ管理

- 描画完了ストロークの適切な破棄
- WebGL リソースのライフサイクル管理
- ガベージコレクション圧迫の回避

### 開発・デバッグ支援

- WebGL Inspector 統合
- リアルタイムシェーダー編集機能
- パフォーマンスプロファイラー統合

## 段階的達成条件（Definition of Done）

各実装ステップには明確な達成条件を設定し、次のステップに進む前に必ず確認する：

### ステップ 1: プロジェクト基盤と WebGL 初期化

**達成条件:**

- ✅ Vitest テストが実行できる（`npm test`でテストが動作）
- ✅ WebGL コンテキストが正常に取得できる（エラーなく gl 取得）
- ✅ Canvas 要素がページに表示される（1024x1024 サイズで表示）
- ✅ WebGL 機能テストがパスする

### ステップ 2: データ型とテストデータ

**達成条件:**

- ✅ 型定義がコンパイルエラーなく使用できる
- ✅ 固定ストロークデータが正しい形式で定義されている
- ✅ サンプルデータが視覚的に確認可能な図形を表現している（直線、円弧、複雑なパス）
- ✅ 対称描画テスト用データパターンが準備されている

### ステップ 3: 最小 WebGL 描画エンジン

**達成条件:**

- ✅ シェーダーが正常にコンパイルされる（エラーログなし）
- ✅ 固定ストロークデータが画面に描画される（視覚的に確認可能）
- ✅ 描画結果が期待される図形と一致する（直線は直線、円弧は円弧として表示）
- ✅ 描画関数が同じ入力で一貫した結果を返す（テストで検証）
- ✅ 単色での基本描画が正常に動作する

### ステップ 4: 対称変換システム

**達成条件:**

- ✅ 対称変換の数学的計算が正確である（単体テストでの検証）
- ✅ 固定データで対称描画が視覚的に確認できる（8 軸対称が表示される）
- ✅ 中心点(512,512)を基準とした対称が正しく動作する
- ✅ 対称軸の変更が即座に反映される
- ✅ 対称パターンが数学的に正確である（手動での角度確認）

### ステップ 5: ステート管理統合

**達成条件:**

- ✅ Zustand ストアが正常に動作する（状態の読み書きが可能）
- ✅ 状態変更が描画に反映される（ステート変更 → 再描画の流れ）
- ✅ ステート更新が予期しない副作用を起こさない
- ✅ 描画エンジンとステート管理が正しく接続されている

### ステップ 6: 入力処理統合

**達成条件:**

- ✅ マウス/タッチ入力でリアルタイム描画ができる（実際に線が引ける）
- ✅ 筆圧が線の太さに反映される（筆圧対応デバイスで確認）
- ✅ スムージングが適用された滑らかな線が描画される
- ✅ 入力遅延が許容範囲内（<16ms 目標）である
- ✅ 対称描画がリアルタイムで動作する（入力と同時に 8 軸対称描画）

### ステップ 7: ズーム・タイリングシステム

**達成条件:**

- ✅ ズームスライダーで表示倍率が変更できる（10%-200%）
- ✅ ズームアウト時にタイリングパターンが表示される
- ✅ タイル境界がシームレスに接続されている（境界線が見えない）
- ✅ ズーム中心点が維持される
- ✅ パフォーマンスが維持される（ズーム時もスムーズ）

### ステップ 8: パフォーマンス監視

**達成条件:**

- ✅ リアルタイム FPS カウンターが表示される
- ✅ メモリ使用量が監視できる
- ✅ 入力遅延が測定・表示される
- ✅ 60fps 以上が維持される（連続描画時）
- ✅ メモリリークが検出されない（長時間テスト）

### 各ステップ共通の完了条件

1. **機能要件**: 該当する要件がすべて実装されている
2. **テスト**: 実装したコードのテストがパスしている
3. **視覚確認**: 期待される動作が視覚的に確認できている
4. **パフォーマンス**: 性能要件を満たしている
5. **エラーハンドリング**: 適切なエラー処理が実装されている

## PoC の技術選択と制約

### WebGL 実装方針

- **WebGL1 ベース**: `ANGLE_instanced_arrays`拡張使用、未対応環境では複数描画呼び出し
- **筆圧実装**: Vertex Shader で線幅制御（Geometry Shader 不使用）
- **バッファ戦略**: フレームバッファ描き込み後破棄方式（ストローク履歴保持なし）
- **対称描画**: `drawArraysInstanced`による 8 軸一括処理

### パフォーマンス測定基準

- **60fps 条件**: 中程度複雑さ（50-100 ポイント/ストローク、同時 3-5 ストローク）
- **メモリリーク判定**: 10 分間連続描画でメモリ使用量が初期値の 2 倍超過
- **入力遅延測定**: `performance.now()`ベース、PointerEvent→ 描画完了まで

### PoC の制約事項

- **対象デバイス**: Apple Pencil、Wacom のみ（他デバイスは対象外）
- **対称原点**: (512,512)固定（動的変更は実装しない）
- **テスト環境**: 開発者手元環境のみ（実機テスト環境は最小限）
- **視覚テスト**: 手動確認のみ（自動化は実装しない）
- **ライブラリ**: RxJS 不使用、Vanilla JS イベント処理で実装
