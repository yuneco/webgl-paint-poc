# 関数ベースアプローチへのリファクタリング分析

## 問題の概要

現在の実装は設計時に決めた関数ベースのアプローチから大きく逸脱し、クラスベースの実装が多用されています。これにより以下の問題が発生しています：

1. **状態管理の重複**: Zustand ストアとクラス内部状態の二重管理
2. **テスタビリティの低下**: 内部状態を持つクラスの単体テスト困難
3. **設計原則違反**: "描画関数は可能な限りステートレス（純粋関数）"の原則に反する
4. **予測不可能な動作**: 同じ入力でも内部状態により異なる結果
5. **デバッグの困難**: 状態変更が暗黙的で追跡が困難

## 現状のクラス使用パターン分析

### 不適切なクラス使用（設計違反）

#### 1. PaintApp クラス

**問題点:**

- `currentStroke: StrokePoint[]` をローカル状態として保持
- `isDrawing: boolean` をローカル状態として保持
- Zustand ストアと状態管理が重複

**影響:**

- 状態の一貫性が保証されない
- デバッグ時に状態の追跡が困難
- テスト時のモックが複雑

#### 2. InputProcessor クラス

**問題点:**

- `lastEvent?: NormalizedInputEvent` を内部状態として保持
- `eventCount: number` を内部状態として保持
- イベント処理の状態を内部で管理

**影響:**

- 入力処理の状態がブラックボックス化
- 状態リセットのタイミングが不明確
- 並行処理時の状態競合リスク

#### 3. CoordinateTransform クラス

**問題点:**

- 複数の変換行列を内部状態として保持
- ビュー変換状態を内部で管理
- 座標変換が副作用を持つメソッド呼び出し

**影響:**

- 座標変換の結果が予測困難
- 同じ入力でも内部状態により結果が変わる可能性
- 純粋関数としてテストできない

#### 4. SymmetryRenderer クラス

**問題点:**

- `config: SymmetryConfig` を内部状態として保持
- 設定変更が副作用を持つ

**影響:**

- 対称描画の設定が暗黙的
- 設定変更のタイミングが不明確

### 適切なクラス使用（許容範囲）

#### 1. Matrix3x3 クラス

**理由:**

- 数学的ユーティリティとして機能
- イミュータブルな操作
- 純粋関数的なメソッド

#### 2. エラークラス群

**理由:**

- 単純なデータ構造
- 状態を持たない
- TypeScript の型システムとの親和性

#### 3. WebGLRenderer クラス

**理由:**

- WebGL 固有のリソース管理が必要
- GPU リソースのライフサイクル管理
- 性能上クラス化が妥当

## 推奨する修正アプローチ

### 1. 状態管理の一元化

**現在（問題のある実装）:**

```typescript
class PaintApp {
  private currentStroke: StrokePoint[] = [];
  private isDrawing: boolean = false;
  // Zustandストアとは別に状態管理
}
```

**推奨（関数ベース）:**

```typescript
// Zustandストアに状態を統合
interface AppState {
  currentStroke: StrokePoint[];
  isDrawing: boolean;
  lastInputEvent?: NormalizedInputEvent;
  coordinateTransform: CoordinateTransformState;
}

// 純粋関数として実装
function handleInputEvent(
  event: NormalizedInputEvent,
  currentState: AppState
): AppState {
  // 状態更新ロジック
}
```

### 2. 入力処理の関数化

**現在（問題のある実装）:**

```typescript
class InputProcessor {
  private lastEvent?: NormalizedInputEvent;
  private eventCount: number = 0;

  processEvent(event: NormalizedInputEvent): NormalizedInputEvent | null {
    // 内部状態を変更
  }
}
```

**推奨（関数ベース）:**

```typescript
interface InputProcessorState {
  lastEvent?: NormalizedInputEvent;
  eventCount: number;
}

function processInputEvent(
  event: NormalizedInputEvent,
  state: InputProcessorState,
  config: InputProcessorConfig
): {
  processedEvent: NormalizedInputEvent | null;
  newState: InputProcessorState;
} {
  // 純粋関数として実装
}
```

### 3. 座標変換の純粋関数化

**現在（問題のある実装）:**

```typescript
class CoordinateTransform {
  private pointerToCanvasMatrix: Matrix3x3;

  updateViewTransform(viewState: ViewTransformState): void {
    // 内部状態を変更
  }

  pointerToCanvas(coords: PointerCoordinates): CanvasCoordinates {
    // 内部状態に依存
  }
}
```

**推奨（関数ベース）:**

```typescript
interface CoordinateTransformState {
  pointerToCanvasMatrix: Matrix3x3;
  canvasToWebGLMatrix: Matrix3x3;
  canvasToViewMatrix: Matrix3x3;
}

function createCoordinateTransform(
  viewState: ViewState,
  canvasElement: HTMLCanvasElement
): CoordinateTransformState {
  // 変換行列を計算して返す
}

function transformPointerToCanvas(
  coords: PointerCoordinates,
  transform: CoordinateTransformState
): CanvasCoordinates {
  // 純粋関数として実装
}
```

### 4. 対称描画の関数化

**現在（問題のある実装）:**

```typescript
class SymmetryRenderer {
  private config: SymmetryConfig;

  generateSymmetryStrokes(stroke: StrokeData): StrokeData[] {
    // 内部設定に依存
  }
}
```

**推奨（関数ベース）:**

```typescript
function generateSymmetryStrokes(
  stroke: StrokeData,
  config: SymmetryConfig
): StrokeData[] {
  // 純粋関数として実装
}

function renderStrokeWithSymmetry(
  renderer: WebGLRenderer,
  stroke: StrokeData,
  config: SymmetryConfig
): void {
  // 設定を明示的に渡す
}
```

## リファクタリングの優先度

### 高優先度（設計原則に直接違反）

1. **PaintApp の状態管理重複**

   - 影響度: 高（アプリケーション全体の状態管理）
   - 修正難易度: 中
   - 推定工数: 4-6 時間

2. **InputProcessor の状態保持**
   - 影響度: 高（入力処理の信頼性）
   - 修正難易度: 中
   - 推定工数: 3-4 時間

### 中優先度（改善推奨）

3. **CoordinateTransform の関数化**

   - 影響度: 中（座標変換の予測可能性）
   - 修正難易度: 中
   - 推定工数: 2-3 時間

4. **SymmetryRenderer の関数化**
   - 影響度: 中（対称描画の明確性）
   - 修正難易度: 低
   - 推定工数: 1-2 時間

### 低優先度（現状維持可）

5. **Matrix3x3 等のユーティリティクラス**

   - 影響度: 低（適切な使用）
   - 修正不要

6. **WebGL リソース管理クラス**
   - 影響度: 低（性能上必要）
   - 修正不要

## 期待される効果

### テスタビリティの向上

- 純粋関数として単体テストが容易
- モックの必要性が減少
- テストの実行速度向上
- テストケースの網羅性向上（状態の組み合わせが明確）

### デバッグ性の向上

- 状態の変更が明示的
- 副作用の発生箇所が明確
- 状態の追跡が容易
- 関数の入出力が明確でデバッグしやすい

### 保守性の向上

- 関数の責任が明確
- 依存関係の単純化
- コードの理解が容易
- 機能追加時の影響範囲が限定的

### 性能の向上

- 不要なクラスインスタンス化の削減
- メモリ使用量の最適化
- ガベージコレクション圧迫の軽減
- 関数の最適化がしやすい（純粋関数はメモ化可能）

## 実装ガイドライン

### 関数設計の原則

1. **純粋関数**: 同じ入力に対して常に同じ出力
2. **イミュータブル**: 入力パラメータを変更しない
3. **明示的依存**: 必要な状態をパラメータとして受け取る
4. **単一責任**: 一つの関数は一つの責任のみ

### 状態管理の原則

1. **中央集権**: すべての状態を Zustand ストアで管理
2. **イミュータブル更新**: 状態の変更は新しいオブジェクトを作成
3. **型安全**: TypeScript の型システムを活用
4. **予測可能**: 状態変更のパターンを統一

### エラーハンドリング

1. **明示的エラー**: 戻り値でエラーを表現
2. **型安全**: エラー型を明確に定義
3. **回復可能**: エラーからの回復方法を提供
4. **ログ**: 適切なエラーログを出力

## 追加で発見された問題

### 5. StateRenderer クラス

**問題点:**

- WebGLRenderer インスタンスを内部状態として保持
- ストア状態の同期処理を内部で管理
- グローバルインスタンス `stateRenderer` の使用

**影響:**

- 描画処理の状態が不透明
- テスト時のモック困難
- グローバル状態による副作用

**推奨修正:**

```typescript
// 現在の問題のある実装
export const stateRenderer = new StateRenderer();

// 推奨（関数ベース）
function renderWithState(
  renderer: WebGLRenderer,
  strokes: StrokeData[],
  symmetryConfig: SymmetryConfig
): void {
  // 純粋関数として実装
}
```

### 6. InputEventHandler クラス

**問題点:**

- イベントリスナーの管理を内部で実行
- アクティブポインター状態を内部保持
- 座標変換インスタンスを内部で管理

**影響:**

- イベント処理の状態が見えない
- 複数インスタンス時の競合リスク
- 座標変換の一貫性問題

## リファクタリング実装戦略

### フェーズ 1: 状態管理の統合（高優先度）

1. PaintApp の状態を Zustand に移行
2. InputProcessor の状態を Zustand に移行
3. 既存テストの修正

### フェーズ 2: 座標変換の関数化（中優先度）

1. CoordinateTransform を純粋関数に変換
2. 座標変換状態を Zustand に統合
3. 座標変換テストの更新

### フェーズ 3: 描画処理の関数化（中優先度）

1. SymmetryRenderer を純粋関数に変換
2. StateRenderer を関数ベースに変換
3. 描画関数のテスト追加

### フェーズ 4: イベント処理の関数化（低優先度）

1. InputEventHandler の関数化
2. イベント処理状態の Zustand 統合
3. 統合テストの実装

## 成功指標

### 定量的指標

- クラス数の削減: 現在 8 個 → 目標 3 個以下
- 状態保持クラスの削減: 現在 6 個 → 目標 0 個
- テストカバレッジの向上: 現在不明 → 目標 90%以上
- 純粋関数の割合: 現在不明 → 目標 80%以上

### 定性的指標

- 新機能追加時の影響範囲の限定
- デバッグ時の状態追跡の容易さ
- テスト実行時間の短縮
- コードレビュー時の理解しやすさ

この分析に基づいて、段階的にリファクタリングを実施することで、設計原則に沿った保守性の高いコードベースを構築できます。
