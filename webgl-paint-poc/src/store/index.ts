/**
 * ステートストアの統合エクスポート
 * コアストアとUIストアの統一インターフェース
 */

export { 
  coreStore,
  useCoreStore, 
  coreSelectors,
  type CoreStoreState 
} from './coreStore';

export { 
  uiStore,
  useUIStore, 
  uiSelectors,
  colorNameToRGBA,
  type UIStoreState 
} from './uiStore';

/**
 * ストア間の連携ヘルパー関数
 * UIステートの変更をコアステートに反映する
 */
import { uiStore, colorNameToRGBA } from './uiStore';
import { coreStore } from './coreStore';

export const syncUIToCore = () => {
  const uiState = uiStore.getState();
  const coreState = coreStore.getState();

  // 色設定の同期
  const rgbaColor = colorNameToRGBA(uiState.demo.selectedColorName);
  if (JSON.stringify(coreState.drawingEngine.color) !== JSON.stringify(rgbaColor)) {
    coreState.setColor(rgbaColor);
  }
};

/**
 * ストアの初期化ヘルパー
 * アプリケーション起動時の初期設定
 */
export const initializeStores = (canvasSize: { width: number; height: number }) => {
  const coreState = coreStore.getState();
  
  // WebGLエンジンの初期化
  coreState.initializeEngine(canvasSize);
  
  // UI -> Core の初期同期
  syncUIToCore();
};

/**
 * ストアのリセットヘルパー
 * 開発・テスト用のリセット機能
 */
export const resetAllStores = () => {
  coreStore.getState().reset();
  uiStore.getState().resetUI();
};

/**
 * デバッグ用のストア状態取得
 * 開発時のstate監視用
 */
export const getStoreSnapshot = () => {
  return {
    core: coreStore.getState(),
    ui: uiStore.getState(),
  };
};