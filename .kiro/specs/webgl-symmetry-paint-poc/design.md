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
│ • Raw Events    │    │ • Drawing State  │    │ • WebGL Context │
│ • Pressure      │    │ • Symmetry Config│    │ • Render Funcs  │
│ • Pointer Events│    │ • Performance    │    │ • Buffer Mgmt   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       ▲
         │                       │                       │
         ▼                       ▼                       │
┌─────────────────┐    ┌──────────────────┐             │
│ Coordinate      │    │   UI Controls    │             │
│ Transform Layer │    │                  │             │
│                 │    │ • Zoom Slider    │             │
│ • View Matrix   │    │ • Performance    │             │
│ • Input→Canvas  │    │ • Debug Info     │             │
│ • Canvas→WebGL  │    └──────────────────┘             │
│ • Zoom/Pan/Rot  │                                     │
└─────────────────┘─────────────────────────────────────┘
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
  rotation: number; // 回転角度（ラジアン）
  canvasSize: { width: number; height: number };
  tilingEnabled: boolean;
}

interface SymmetryConfig {
  mode: SymmetryMode;
  origin: { x: number; y: number };
  axisCount: number;
}
```

### 座標変換レイヤー（独立管理）

```typescript
// 座標系の状態を管理する独立したレイヤー
interface CoordinateTransform {
  // ビュー変換行列（ズーム、パン、回転の合成）
  viewMatrix: Matrix3x3;
  // 逆変換行列（入力座標→Canvas座標用）
  inverseViewMatrix: Matrix3x3;
  // Canvas→WebGL正規化座標変換
  canvasToWebGL: Matrix3x3;
  // WebGL→Canvas座標変換
  webGLToCanvas: Matrix3x3;
}

// 座標変換の純粋関数群
function createCoordinateTransform(viewState: ViewState): CoordinateTransform {
  // ViewStateから変換行列を生成
}

function transformPointerToCanvas(
  offsetX: number,
  offsetY: number,
  transform: CoordinateTransform
): CanvasPoint {
  // PointerEvent座標→Canvas座標（入力処理用）
}

function transformCanvasToWebGL(
  canvasPoint: CanvasPoint,
  transform: CoordinateTransform
): WebGLPoint {
  // Canvas座標→WebGL正規化座標（描画用）
}

function transformCanvasToPointer(
  canvasPoint: CanvasPoint,
  transform: CoordinateTransform
): { offsetX: number; offsetY: number } {
  // Canvas座標→PointerEvent座標（UI表示用）
}
```

### 純粋関数群（ステートレス）

#### 1. 対称変換関数

```typescript
// 純粋関数：入力に対して決定的な出力
function transformPointSymmetrically(
  point: CanvasPoint, // Canvas座標系で統一
  config: SymmetryConfig
): CanvasPoint[] {
  // 対称変換ロジック（Canvas座標系内で完結）
}

function calculateSymmetryAxes(config: SymmetryConfig): number[] {
  // 対称軸の角度計算
}
```

#### 2. 入力処理関数

```typescript
function normalizePointerEvent(
  event: PointerEvent,
  transform: CoordinateTransform
): CanvasPoint {
  // PointerEvent座標→Canvas座標への変換を含む正規化
}

function applySmoothingToStroke(points: CanvasPoint[]): CanvasPoint[] {
  // Catmull-Rom splineスムージング（Canvas座標系で処理）
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

## 入力補正システム設計（タスク 6.6 対応）

### 設計原則

**関数ベースアプローチ**: 入力補正は純粋関数として実装し、クラスベースの複雑性を避ける。各補正機能は独立した関数として実装され、設定オブジェクトによって動作を制御する。

**置換可能性**: 補正機能は中間処理層として動作し、補正なしでも完全に動作する。任意の補正機能を追加・削除・置換できる柔軟な設計とする。

**リアルタイム性の保証**: 60fps 維持を最優先とし、品質とのバランスを動的に調整する仕組みを提供する。

### 基本インターフェース設計

```typescript
/**
 * 入力補正関数の基本型
 *
 * @param currentPoint 現在の入力点
 * @param strokeHistory ストローク履歴（時系列順）
 * @param config 補正設定（型は各関数で定義）
 * @returns 補正後の点配列（通常は1点、場合により複数点や0点）
 */
type InputCorrectionFunction = (
  currentPoint: StrokePoint,
  strokeHistory: StrokePoint[],
  config: unknown
) => StrokePoint[];

/**
 * 統合補正設定
 */
interface InputCorrectionConfig {
  pressureCorrection: PressureCorrectionConfig;
  smoothing: SmoothingConfig;
  // 将来的な拡張用
  [key: string]: unknown;
}
```

### 実装要件

#### 1. 筆圧補正機能

**目的**: デバイス固有の筆圧特性を正規化し、一貫した筆圧応答を提供

**要求事項**:

- デバイス別キャリブレーション対応（Apple Pencil、Wacom 等）
- 筆圧値の時系列スムージング
- 筆圧非対応デバイスでの適切なフォールバック
- 0.0-1.0 範囲での正規化保証

**設定項目**:

```typescript
interface PressureCorrectionConfig {
  enabled: boolean;
  deviceCalibration: Record<string, number>;
  smoothingWindow: number; // 履歴点数
}
```

#### 2. 座標スムージング機能

**目的**: 入力座標のジッターを除去し、自然な描画線を生成

**要求事項**:

- リアルタイムモード: 最小遅延（<16ms）での線形スムージング
- 品質モード: Catmull-Rom spline による高品質スムージング
- 描画速度に応じた適応制御
- 角度やエッジの保持

**設定項目**:

```typescript
interface SmoothingConfig {
  enabled: boolean;
  strength: number; // 0.0-1.0
  method: "linear" | "catmull-rom";
  realtimeMode: boolean;
  minPoints: number; // 処理開始に必要な最小点数
}
```

### 統合パイプライン設計

```typescript
/**
 * メイン補正関数
 * 複数の補正機能を順次適用
 */
function applyInputCorrection(
  currentPoint: StrokePoint,
  strokeHistory: StrokePoint[],
  config: InputCorrectionConfig
): StrokePoint[];
```

**処理順序**:

1. 筆圧補正 → 2. 座標スムージング → 3. 将来の拡張機能

**パフォーマンス要件**:

- 単一点処理時間: <1ms（60fps 維持のため）
- メモリ使用量: 履歴点管理の最適化
- 遅延最小化: リアルタイムモードでの即座な出力

### InputProcessor 統合仕様

既存の `InputProcessor.processInputEvent` 関数を拡張し、基本処理後に補正パイプラインを適用する。

```typescript
// 統合例（実装詳細は実装者に委ねる）
function processInputEventWithCorrection(
  event: NormalizedInputEvent,
  config: ExtendedInputProcessorConfig,
  strokeHistory: StrokePoint[]
): NormalizedInputEvent[];
```

### 実装ガイドライン

1. **純粋関数の徹底**: 全ての補正関数は副作用なしで実装
2. **設定駆動**: ハードコードを避け、設定オブジェクトで制御
3. **エラーハンドリング**: 不正な入力に対する適切な処理
4. **テスタビリティ**: 各関数の単体テストを容易にする設計
5. **拡張性**: 新しい補正機能の追加を考慮した設計

### 品質保証要件

- **数学的正確性**: スムージングアルゴリズムの実装精度
- **デバイス互換性**: 主要な筆圧対応デバイスでの動作確認
- **性能基準**: 連続描画時の 60fps 維持
- **視覚品質**: スムージング適用前後の描画品質比較

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

### 座標系統合の実装例

```typescript
// 座標系の統一的な管理
interface CoordinateSystem {
  // PointerEvent座標 → Canvas座標 (0-1024)
  pointerToCanvas(offsetX: number, offsetY: number): CanvasPoint;
  // Canvas座標 (0-1024) → WebGL正規化座標 (-1 to 1)
  canvasToWebGL(canvasX: number, canvasY: number): WebGLPoint;
  // 逆変換: WebGL → Canvas
  webGLToCanvas(webglX: number, webglY: number): CanvasPoint;
  // 逆変換: Canvas → PointerEvent座標
  canvasToPointer(
    canvasX: number,
    canvasY: number
  ): { offsetX: number; offsetY: number };
}

// 使用例: 入力処理での座標変換
function handlePointerEvent(
  event: PointerEvent,
  coordinateSystem: CoordinateSystem
): CanvasPoint {
  // PointerEvent座標を直接Canvas座標に変換
  return coordinateSystem.pointerToCanvas(event.offsetX, event.offsetY);
}

// 使用例: 描画処理での座標変換
function renderStrokePoints(
  canvasPoints: CanvasPoint[],
  coordinateSystem: CoordinateSystem
): void {
  // Canvas座標をWebGL座標に変換して描画
  const webglPoints = canvasPoints.map((point) =>
    coordinateSystem.canvasToWebGL(point.x, point.y)
  );
  // WebGL描画処理...
}

// 座標変換行列の管理（関数ベース）
interface CoordinateTransformState {
  viewMatrix: Matrix3x3;
  inverseViewMatrix: Matrix3x3;
  pointerToCanvasMatrix: Matrix3x3;
  canvasToWebGLMatrix: Matrix3x3;
}

function createCoordinateTransformState(
  viewState: ViewState,
  canvasElement: HTMLCanvasElement
): CoordinateTransformState {
  // ビュー変換行列を計算
  const viewMatrix = calculateViewMatrix(viewState);
  const inverseViewMatrix = viewMatrix.inverse();

  // その他の変換行列を計算
  const pointerToCanvasMatrix = calculatePointerToCanvasMatrix(canvasElement);
  const canvasToWebGLMatrix = calculateCanvasToWebGLMatrix();

  return {
    viewMatrix,
    inverseViewMatrix,
    pointerToCanvasMatrix,
    canvasToWebGLMatrix,
  };
}

function calculateViewMatrix(viewState: ViewState): Matrix3x3 {
  // 1. 平行移動行列 (パン)
  const translation = Matrix3x3.translation(
    viewState.panOffset.x,
    viewState.panOffset.y
  );

  // 2. スケール行列 (ズーム)
  const scale = Matrix3x3.scale(viewState.zoomLevel, viewState.zoomLevel);

  // 3. 回転行列 (将来の拡張用)
  const rotation = Matrix3x3.rotation(viewState.rotation || 0);

  // 合成: Scale * Rotation * Translation
  return scale.multiply(rotation).multiply(translation);
}

function updateCoordinateTransformState(
  currentState: CoordinateTransformState,
  newViewState: ViewState,
  canvasElement: HTMLCanvasElement
): CoordinateTransformState {
  // 新しい状態を計算して返す（イミュータブル）
  return createCoordinateTransformState(newViewState, canvasElement);
}
```

### 座標系設計の利点

1. **責任の分離**: 座標変換ロジックが独立し、入力・描画レイヤーから分離
2. **拡張性**: 回転機能追加時も座標変換レイヤーのみ変更
3. **テスタビリティ**: 座標変換の単体テストが容易
4. **一貫性**: 全てのレイヤーが同じ座標変換を参照
5. **デバッグ性**: 座標変換の問題を特定しやすい
