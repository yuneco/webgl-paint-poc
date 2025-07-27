# Regl-Line Migration Plan: WebGL太い線描画の根本的解決

## なぜ移行が必要なのか

### WebGLの基本的制限事項

WebGLの`gl.lineWidth()`機能は、技術仕様上の深刻な制限があります：

1. **OpenGL Core Profileの制約**: WebGL2ではOpenGL Core Profileが必須であり、これにより線幅は実質的に1.0pxに制限される
2. **ブラウザ実装の不整合**: 
   - Windows環境では DirectX Angle Layer により1px制限
   - macOS/Linuxでも多くの環境で同様の制限
   - `gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE)` の値に関わらず実際は1px
3. **WebGL仕様の現実**: Matt DesLauriersが指摘するように、「Drawing Lines is Hard」は業界の常識

### 現状の問題分析

**現在の実装の根本的欠陥:**
```javascript
// src/webgl/renderer.ts:118
renderer.gl.lineWidth(size); // ← この行は事実上無効
```

**具体的な問題:**
- ブラシサイズが25.2pxに設定されても、実際の線は1pxのまま
- `gl.LINE_STRIP`での描画は太さ制御が不可能
- `gl_PointSize`はポイント描画でのみ有効
- アンチエイリアス、ライン接続、キャップスタイルの制御不可

**アーキテクチャレベルでの設計誤り:**
- WebGLがネイティブに太い線をサポートすると仮定
- 代替手法の検討なしに`gl.lineWidth()`に依存
- ポイント描画とライン描画で異なるアプローチを採用

## regl-line解決アプローチ

### 技術的解決策

**三角形分割による線描画:**
- 各線セグメントを三角形ストリップに変換
- シェーダーで太さ、プレッシャー、アンチエイリアスを完全制御
- Miter join、Bevel join、Round join対応

**regl-lineの技術的利点:**
```javascript
// 現在の制限されたアプローチ
gl.drawArrays(gl.LINE_STRIP, 0, vertexCount); // 1px固定

// regl-lineによる解決
const drawLines = regl({
  frag: `... triangulated line fragment shader ...`,
  vert: `... line expansion vertex shader ...`,
  attributes: {
    position: linePositions,
    thickness: lineThickness // ← 実際に効果のある太さ制御
  }
});
```

### 統合戦略

**現在のアーキテクチャとの親和性:**
- WebGLコンテキスト管理: 既存システム活用
- ストロークデータ: `StrokeData`インターフェース保持
- 対称描画: `generateSymmetricStrokes()`との統合
- UI制御: ブラシサイズ・プレッシャー連携維持

**段階的移行:**
1. regl + regl-line導入（既存システム並行稼働）
2. 基本線描画の置換・検証
3. 対称描画システム統合
4. 旧WebGLレンダラーの段階的削除

## 詳細作業ステップ

### Phase 1: 基盤セットアップ (1-2日)

**1.1 依存関係導入**
```bash
pnpm add regl regl-line
pnpm add -D @types/regl
```

**1.2 基本統合テスト**
- [ ] reglコンテキスト初期化
- [ ] regl-line基本動作確認
- [ ] 既存WebGLコンテキストとの共存テスト

**1.3 新しいレンダラー骨格作成**
- [ ] `src/webgl/ReglLineRenderer.ts` 作成
- [ ] 基本インターフェース定義
- [ ] エラーハンドリング実装

### Phase 2: データ変換システム (2日)

**2.1 ストロークデータ変換**
```typescript
// src/webgl/strokeToReglConverter.ts
export function convertStrokeToReglLine(stroke: StrokeData): ReglLineData {
  return {
    positions: stroke.points.map(p => [p.x, p.y]),
    thickness: stroke.points.map(p => p.pressure * brushSize),
    colors: stroke.points.map(() => currentColor)
  };
}
```

**2.2 バッファ管理更新**
- [ ] 三角形分割データ用バッファ構造
- [ ] 動的サイズ管理
- [ ] メモリ効率最適化

**2.3 シェーダー統合**
- [ ] regl-lineシェーダーとの統合
- [ ] プレッシャーマッピング
- [ ] カラーブレンディング

### Phase 3: 対称描画システム統合 (1-2日)

**3.1 SymmetryRenderer更新**
```typescript
// src/symmetry/reglSymmetryRenderer.ts
export function renderSymmetricLinesWithRegl(
  stroke: StrokeData,
  symmetryConfig: SymmetryState,
  reglRenderer: ReglLineRenderer
): void {
  const symmetricStrokes = generateSymmetricStrokes(stroke, symmetryConfig);
  symmetricStrokes.forEach(symStroke => {
    const reglData = convertStrokeToReglLine(symStroke);
    reglRenderer.drawLine(reglData);
  });
}
```

**3.2 8軸対称の動作確認**
- [ ] 変換精度テスト
- [ ] パフォーマンス測定
- [ ] 視覚品質確認

### Phase 4: UI統合とインターフェース (1日)

**4.1 DrawingCoordinator更新**
```typescript
// src/app/DrawingCoordinator.ts
private renderStrokeWithSymmetry(stroke: StrokeData): void {
  const symmetryConfig = drawingSelectors.symmetry();
  
  if (symmetryConfig.enabled && symmetryConfig.axisCount > 1) {
    this.reglRenderer.renderSymmetricLines(stroke, symmetryConfig);
  } else {
    this.reglRenderer.renderSingleLine(stroke);
  }
}
```

**4.2 ブラシサイズ制御統合**
- [ ] UIスライダー → regl-line太さマッピング
- [ ] リアルタイム太さ変更対応
- [ ] プレッシャー感度調整

**4.3 互換性テスト**
- [ ] 既存テストスイートの動作確認
- [ ] UIコントロールの動作検証
- [ ] パフォーマンスベンチマーク

### Phase 5: 最適化と完成 (1日)

**5.1 パフォーマンス最適化**
- [ ] バッチ描画の実装
- [ ] ガベージコレクション最小化
- [ ] フレームレート安定化

**5.2 視覚品質向上**
- [ ] アンチエイリアスの調整
- [ ] ライン接続部の品質向上
- [ ] カラーブレンディング最適化

**5.3 レガシーコード削除**
- [ ] 旧`renderer.ts`の`setBrushSize()`削除
- [ ] `gl.lineWidth()`呼び出し除去
- [ ] 使用されないシェーダーコード削除

## リスク評価とロールバック計画

### 技術リスク

**高リスク:**
- regl-lineと既存対称描画システムの統合困難性
- パフォーマンスの予期しない劣化
- WebGL1.0/2.0互換性問題

**中リスク:**
- バンドルサイズ増加（+16KB）の影響
- 学習コスト（regl APIの習得）
- テストスイートの大幅な更新必要性

**低リスク:**
- 既存ストロークデータ形式の互換性
- UIコントロールとの統合

### 軽減策

**段階的統合:**
1. 既存システムと並行稼働での検証
2. フィーチャーフラグによる切り替え機能
3. A/Bテストでの品質比較

**品質保証:**
- 自動テストでの回帰検出
- 視覚的テストでの品質確認
- パフォーマンステストでの劣化検出

### ロールバック手順

**緊急時ロールバック:**
```bash
# 1. メインブランチに戻る
git checkout main

# 2. WIPコミットの状態に復帰
git reset --hard 92b3236

# 3. 開発サーバー再起動
pnpm run dev
```

**段階的ロールバック:**
1. regl-line機能をフィーチャーフラグで無効化
2. 既存WebGLレンダラーへの自動フォールバック
3. 個別機能の段階的復旧

## 成功基準

**技術的成功基準:**
- [ ] ブラシサイズ25.2pxが視覚的に確認可能
- [ ] 8軸対称描画の完全動作
- [ ] フレームレート60fps維持
- [ ] 既存テストスイート100%通過

**品質基準:**
- [ ] 線の接続部が滑らか
- [ ] プレッシャー変化が自然
- [ ] アンチエイリアス品質向上
- [ ] バンドルサイズ20KB以下の増加

**ビジネス基準:**
- [ ] ユーザー体験の明確な改善
- [ ] 開発効率の向上
- [ ] 将来の機能拡張への対応力向上

## 想定タイムライン

```
Day 1-2: Phase 1 (基盤セットアップ)
Day 3-4: Phase 2 (データ変換システム) 
Day 4-5: Phase 3 (対称描画統合)
Day 6:   Phase 4 (UI統合)
Day 7:   Phase 5 (最適化・完成)
```

**総開発期間: 1週間**
**技術負債解消: 完全**
**アーキテクチャ改善: 大幅**

この移行により、WebGL線描画の根本的制限を克服し、プロダクション品質の描画システムを実現します。