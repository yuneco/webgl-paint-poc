# 関数ベースアプローチへのリファクタリング進捗管理

## プロジェクト概要
WebGL Symmetry Paint PoC の現在のクラスベース実装を、プロジェクト設計原則に従って関数ベースアプローチに段階的にリファクタリング。

## リファクタリング目標
- **主要目標**: 状態を持つクラスを完全にゼロにする
- **品質目標**: steering/tech.md の設計原則への完全準拠
- **安全性**: 各段階でテスト通過とTypeScript エラーゼロを維持
- **継続性**: コンテキストリセット後も作業継続可能な記録維持

## 現在の状況 (開始時点)

### 開始日時
2025-01-24 開始

### 問題のあるクラス（状態保持クラス）
1. **PaintApp** (`src/app/PaintApp.ts:28`)
   - 問題: `currentStroke: StrokePoint[]`, `isDrawing: boolean`, `config: PaintAppConfig`
   - 影響: Zustand ストアとの状態重複、デバッグ困難
   
2. **InputProcessor** (`src/input/InputProcessor.ts`)
   - 問題: `lastEvent?: NormalizedInputEvent`, `eventCount: number`
   - 影響: 入力処理状態のブラックボックス化

3. **CoordinateTransform** (`src/input/CoordinateTransform.ts`)
   - 問題: 複数の変換行列を内部状態として保持
   - 影響: 座標変換の結果が予測困難

4. **SymmetryRenderer** (`src/symmetry/symmetryRenderer.ts`)
   - 問題: `config: SymmetryConfig` を内部状態として保持
   - 影響: 対称描画設定が暗黙的

5. **StateRenderer**
   - 問題: WebGLRenderer インスタンスを内部状態として保持
   - 影響: グローバル状態による副作用

6. **InputEventHandler**
   - 問題: イベントリスナー管理、アクティブポインター状態
   - 影響: イベント処理の状態が不透明

### 適切なクラス（維持対象）
- `Matrix3x3`: 数学ユーティリティ（イミュータブル操作のみ）
- `WebGLRenderer`: GPU リソース管理（性能上必要）
- エラー型クラス: 単純なデータ構造、状態なし
- `Vector2D` 等: 数学的データ型

### 現在のテスト状況
- テスト総数: 270個（2025-01-24 確認）
- 状態: 268個通過、2個失敗
- 失敗テスト:
  1. `src/integration/symmetry-uniqueness.test.ts` - 8軸対称の角度計算問題
  2. `src/symmetry/symmetryRenderer.test.ts` - 軸角度の設定問題
- TypeScript: エラーなし（tsc 通過）

### ベースライン状況の決定
既存の2つのテスト失敗は対称変換の角度計算に関する問題であり、リファクタリング作業とは独立した問題。
リファクタリング作業では「現在の 268個のテスト通過状態を維持」することを目標とする。

## 作業計画

### Phase 1: 重複状態管理の解決（高優先度・6-8時間）
#### 1.1 PaintApp状態の Zustand 統合（3-4時間）
- [x] coreStore に `currentStroke`, `isDrawing` 追加 ✅
- [x] PaintApp を純粋な調整役に変更 ✅
- [x] テスト修正: PaintApp.test.ts, PaintApp.simple.test.ts ✅
- **完了**: すべての状態がZustandに移行、テストが通過

#### 1.2 InputProcessor の純粋関数化（3-4時間）
- [ ] `InputProcessorState` インターフェース定義
- [ ] `processInputEvent` 純粋関数実装
- [ ] テスト修正: InputProcessor.test.ts

### Phase 2: 座標変換の純粋関数化（中優先度・3-4時間）
#### 2.1 CoordinateTransform クラス除去（2-3時間）
- [ ] `createCoordinateTransform` 純粋関数実装
- [ ] `transformPointerToCanvas` 純粋関数実装
- [ ] テスト修正: CoordinateTransform.test.ts

### Phase 3: 描画処理の純粋関数化（中優先度・2-3時間）
#### 3.1 SymmetryRenderer の関数化（1-2時間）
- [ ] `generateSymmetryStrokes` 純粋関数化
- [ ] テスト修正: symmetryRenderer.test.ts

#### 3.2 StateRenderer の除去（1時間）
- [ ] `renderWithState` 純粋関数実装
- [ ] グローバル依存の除去

### Phase 4: 入力イベント処理の関数化（低優先度・2-3時間）
#### 4.1 InputEventHandler の関数化（2-3時間）
- [ ] イベント処理ロジックの純粋関数化
- [ ] テスト修正: InputEventHandler.test.ts

## 作業履歴

### 2025-01-24
- **[完了]** REFACTORING_PROGRESS.md 作成
- **[完了]** 作業ブランチ `refactor/functional-approach` 作成
- **[完了]** ベースライン確認: テスト状況把握（268/270通過）、TypeScript エラーなし
- **[完了]** Phase 1.1: PaintApp状態のZustand統合完了、テスト状況維持（268/270通過）

## 完了タスク
- [setup-1] 初期セットアップ: 進捗管理ファイル REFACTORING_PROGRESS.md を作成
- [setup-2] 作業ブランチ refactor/functional-approach を作成
- [setup-3] ベースライン確認: 全テスト実行とTypeScriptエラーチェック
- [phase1-1] Phase 1.1: PaintApp状態のZustand統合 ✅

## 進行中タスク
- (現在なし)

## 次のタスク
- [phase1-2] Phase 1.2: InputProcessorの純粋関数化

## 発見された問題・メモ
- (現在なし)

## テスト結果ログ
### Phase 1.1 完了後（2025-01-24）
- **テスト総数**: 270件
- **通過**: 268件
- **失敗**: 2件（既存の対称変換問題、リファクタリング作業と無関係）
- **TypeScript**: エラー0件
- **状況**: ベースライン維持、PaintApp関連テスト全通過

## 技術的発見・学習
- (作業進行中に記録)

## 重要な設計決定
- 数値目標（クラス数）にとらわれず、適切な設計を優先
- 状態保持クラスの完全除去を最優先
- 各段階でのコミットにより安全性確保

## 継続作業のためのチェックリスト
作業再開時は以下を確認：
1. [ ] 現在のブランチ状況確認
2. [ ] 最後のテスト実行結果確認
3. [ ] 「進行中タスク」セクションから作業再開
4. [ ] 変更後は必ずテスト実行とTypeScriptチェック
5. [ ] 段階的コミットの実行

---
**最終更新**: 2025-01-24 (ファイル作成時点)