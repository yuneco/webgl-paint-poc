/**
 * UIステートストア
 * デモUI、表示設定、開発用の状態を管理
 * コアステートから完全に分離され、頻繁な変更に対応
 */

import { createStore } from 'zustand/vanilla';
import { devtools } from 'zustand/middleware';
import type { UIState } from '../types/state';

/**
 * UIステートの初期値
 */
const initialUIState: UIState = {
  demo: {
    selectedDrawingMode: 'line',
    selectedColorName: 'black',
    showTestPatterns: false,
  },
  performance: {
    showMetrics: true,
    showDetailedMetrics: false,
    metricsUpdateInterval: 1000, // 1秒間隔
  },
  debug: {
    showDebugInfo: false,
    showSymmetryAxes: false,
    showGrid: false,
  },
};

/**
 * UIステートストアの型定義
 */
export interface UIStoreState extends UIState {
  // Demo UI Actions
  setDrawingMode: (mode: UIState['demo']['selectedDrawingMode']) => void;
  setColorName: (colorName: UIState['demo']['selectedColorName']) => void;
  toggleTestPatterns: () => void;

  // Performance UI Actions
  toggleMetrics: () => void;
  toggleDetailedMetrics: () => void;
  setMetricsUpdateInterval: (interval: number) => void;

  // Debug UI Actions
  toggleDebugInfo: () => void;
  toggleSymmetryAxes: () => void;
  toggleGrid: () => void;
  setDebugMode: (enabled: boolean) => void;

  // Bulk Actions
  resetUI: () => void;
  setDemoPreset: (preset: 'default' | 'advanced' | 'minimal') => void;
}

/**
 * UIステートストア
 * UIの表示状態とユーザーの操作設定を管理
 */
export const uiStore = createStore<UIStoreState>()(
  devtools(
    (set) => ({
      ...initialUIState,

      // =============================================================================
      // DEMO UI ACTIONS
      // =============================================================================

      setDrawingMode: (selectedDrawingMode) => {
        set(
          (state) => ({
            demo: {
              ...state.demo,
              selectedDrawingMode,
            },
          }),
          false,
          'setDrawingMode'
        );
      },

      setColorName: (selectedColorName) => {
        set(
          (state) => ({
            demo: {
              ...state.demo,
              selectedColorName,
            },
          }),
          false,
          'setColorName'
        );
      },

      toggleTestPatterns: () => {
        set(
          (state) => ({
            demo: {
              ...state.demo,
              showTestPatterns: !state.demo.showTestPatterns,
            },
          }),
          false,
          'toggleTestPatterns'
        );
      },

      // =============================================================================
      // PERFORMANCE UI ACTIONS
      // =============================================================================

      toggleMetrics: () => {
        set(
          (state) => ({
            performance: {
              ...state.performance,
              showMetrics: !state.performance.showMetrics,
            },
          }),
          false,
          'toggleMetrics'
        );
      },

      toggleDetailedMetrics: () => {
        set(
          (state) => ({
            performance: {
              ...state.performance,
              showDetailedMetrics: !state.performance.showDetailedMetrics,
            },
          }),
          false,
          'toggleDetailedMetrics'
        );
      },

      setMetricsUpdateInterval: (metricsUpdateInterval) => {
        set(
          (state) => ({
            performance: {
              ...state.performance,
              metricsUpdateInterval: Math.max(100, Math.min(5000, metricsUpdateInterval)),
            },
          }),
          false,
          'setMetricsUpdateInterval'
        );
      },

      // =============================================================================
      // DEBUG UI ACTIONS
      // =============================================================================

      toggleDebugInfo: () => {
        set(
          (state) => ({
            debug: {
              ...state.debug,
              showDebugInfo: !state.debug.showDebugInfo,
            },
          }),
          false,
          'toggleDebugInfo'
        );
      },

      toggleSymmetryAxes: () => {
        set(
          (state) => ({
            debug: {
              ...state.debug,
              showSymmetryAxes: !state.debug.showSymmetryAxes,
            },
          }),
          false,
          'toggleSymmetryAxes'
        );
      },

      toggleGrid: () => {
        set(
          (state) => ({
            debug: {
              ...state.debug,
              showGrid: !state.debug.showGrid,
            },
          }),
          false,
          'toggleGrid'
        );
      },

      setDebugMode: (enabled) => {
        set(
          (state) => ({
            debug: {
              ...state.debug,
              showDebugInfo: enabled,
              showSymmetryAxes: enabled,
              showGrid: enabled,
            },
          }),
          false,
          'setDebugMode'
        );
      },

      // =============================================================================
      // BULK ACTIONS
      // =============================================================================

      resetUI: () => {
        set(initialUIState, false, 'resetUI');
      },

      setDemoPreset: (preset) => {
        switch (preset) {
          case 'default':
            set({
              demo: {
                selectedDrawingMode: 'line',
                selectedColorName: 'black',
                showTestPatterns: false,
              },
              performance: {
                showMetrics: true,
                showDetailedMetrics: false,
                metricsUpdateInterval: 1000,
              },
              debug: {
                showDebugInfo: false,
                showSymmetryAxes: false,
                showGrid: false,
              },
            }, false, 'setDemoPreset:default');
            break;

          case 'advanced':
            set({
              demo: {
                selectedDrawingMode: 'multi',
                selectedColorName: 'blue',
                showTestPatterns: true,
              },
              performance: {
                showMetrics: true,
                showDetailedMetrics: true,
                metricsUpdateInterval: 500,
              },
              debug: {
                showDebugInfo: true,
                showSymmetryAxes: true,
                showGrid: true,
              },
            }, false, 'setDemoPreset:advanced');
            break;

          case 'minimal':
            set({
              demo: {
                selectedDrawingMode: 'line',
                selectedColorName: 'black',
                showTestPatterns: false,
              },
              performance: {
                showMetrics: false,
                showDetailedMetrics: false,
                metricsUpdateInterval: 2000,
              },
              debug: {
                showDebugInfo: false,
                showSymmetryAxes: false,
                showGrid: false,
              },
            }, false, 'setDemoPreset:minimal');
            break;
        }
      },
    }),
    {
      name: 'ui-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Hook version for React compatibility (if needed in the future)
export const useUIStore = (selector: (state: UIStoreState) => any) => {
  return selector(uiStore.getState());
};

/**
 * UIストアのセレクター関数
 * コンポーネントでの効率的な状態選択
 */
export const uiSelectors = {
  // Demo UI Selectors
  demo: () => uiStore.getState().demo,
  drawingMode: () => uiStore.getState().demo.selectedDrawingMode,
  colorName: () => uiStore.getState().demo.selectedColorName,
  showTestPatterns: () => uiStore.getState().demo.showTestPatterns,

  // Performance UI Selectors
  performanceUI: () => uiStore.getState().performance,
  showMetrics: () => uiStore.getState().performance.showMetrics,
  showDetailedMetrics: () => uiStore.getState().performance.showDetailedMetrics,
  metricsUpdateInterval: () => uiStore.getState().performance.metricsUpdateInterval,

  // Debug UI Selectors
  debugUI: () => uiStore.getState().debug,
  showDebugInfo: () => uiStore.getState().debug.showDebugInfo,
  showSymmetryAxes: () => uiStore.getState().debug.showSymmetryAxes,
  showGrid: () => uiStore.getState().debug.showGrid,

  // Combined Selectors
  isAdvancedMode: () => {
    const state = uiStore.getState();
    return state.performance.showDetailedMetrics || 
           state.debug.showDebugInfo || 
           state.debug.showSymmetryAxes;
  },
};

/**
 * 色名からRGBA値への変換ヘルパー
 * UIの色選択からコアステートの色設定へのマッピング
 */
export const colorNameToRGBA = (colorName: UIState['demo']['selectedColorName']): [number, number, number, number] => {
  const colorMap: Record<UIState['demo']['selectedColorName'], [number, number, number, number]> = {
    black: [0, 0, 0, 1],
    red: [1, 0, 0, 1],
    blue: [0, 0, 1, 1],
    green: [0, 1, 0, 1],
    orange: [1, 0.5, 0, 1],
    purple: [0.8, 0, 0.8, 1],
  };
  
  return colorMap[colorName];
};