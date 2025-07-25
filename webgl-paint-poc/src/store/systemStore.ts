/**
 * システムレベル状態管理ストア
 * パフォーマンス監視とアプリ設定の管理
 */

import { createStore } from 'zustand/vanilla';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { PerformanceState, AppConfigState } from '../types/state';

/**
 * システムストアの初期状態
 */
const initialSystemState = {
  performance: {
    fps: 0,
    frameTime: 0,
    inputDelay: 0,
    memoryUsage: 0,
  } as PerformanceState,
  
  appConfig: {
    canvasId: 'paint-canvas',
    displaySize: { width: 500, height: 500 },
    enableDebug: false,
  } as AppConfigState,
};

/**
 * システムストアの状態とアクション定義
 */
export interface SystemStoreState {
  // State
  performance: PerformanceState;
  appConfig: AppConfigState;

  // Performance Actions
  updateFPS: (fps: number) => void;
  updateFrameTime: (frameTime: number) => void;
  updateInputDelay: (delay: number) => void;
  updateMemoryUsage: (usage: number) => void;

  // App Config Actions
  setCanvasId: (canvasId: string) => void;
  setDisplaySize: (size: { width: number; height: number }) => void;
  setDebugMode: (enabled: boolean) => void;
  updateConfig: (config: Partial<AppConfigState>) => void;

  // Utility Actions
  reset: () => void;
}

/**
 * システムレベル状態管理ストア
 * パフォーマンス監視とアプリ設定の管理
 */
export const systemStore = createStore<SystemStoreState>()(
  devtools(
    subscribeWithSelector((set) => ({
      ...initialSystemState,

      // =============================================================================
      // PERFORMANCE ACTIONS
      // =============================================================================

      updateFPS: (fps) => {
        set(
          (state) => ({
            performance: {
              ...state.performance,
              fps,
            },
          }),
          false,
          'updateFPS'
        );
      },

      updateFrameTime: (frameTime) => {
        set(
          (state) => ({
            performance: {
              ...state.performance,
              frameTime,
            },
          }),
          false,
          'updateFrameTime'
        );
      },

      updateInputDelay: (inputDelay) => {
        set(
          (state) => ({
            performance: {
              ...state.performance,
              inputDelay,
            },
          }),
          false,
          'updateInputDelay'
        );
      },

      updateMemoryUsage: (memoryUsage) => {
        set(
          (state) => ({
            performance: {
              ...state.performance,
              memoryUsage,
            },
          }),
          false,
          'updateMemoryUsage'
        );
      },

      // =============================================================================
      // APP CONFIG ACTIONS
      // =============================================================================

      setCanvasId: (canvasId) => {
        set(
          (state) => ({
            appConfig: {
              ...state.appConfig,
              canvasId,
            },
          }),
          false,
          'setCanvasId'
        );
      },

      setDisplaySize: (displaySize) => {
        set(
          (state) => ({
            appConfig: {
              ...state.appConfig,
              displaySize,
            },
          }),
          false,
          'setDisplaySize'
        );
      },

      setDebugMode: (enableDebug) => {
        set(
          (state) => ({
            appConfig: {
              ...state.appConfig,
              enableDebug,
            },
          }),
          false,
          'setDebugMode'
        );
      },

      updateConfig: (config) => {
        set(
          (state) => ({
            appConfig: {
              ...state.appConfig,
              ...config,
            },
          }),
          false,
          'updateConfig'
        );
      },

      // =============================================================================
      // UTILITY ACTIONS
      // =============================================================================

      reset: () => {
        set(initialSystemState, false, 'reset');
      },
    })),
    {
      name: 'system-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

/**
 * システムストア用セレクター
 * パフォーマンス最適化のための細かい状態選択
 */
export const systemSelectors = {
  // Performance Selectors
  performance: () => systemStore.getState().performance,
  fps: () => systemStore.getState().performance.fps,
  frameTime: () => systemStore.getState().performance.frameTime,
  inputDelay: () => systemStore.getState().performance.inputDelay,
  memoryUsage: () => systemStore.getState().performance.memoryUsage,

  // App Config Selectors
  appConfig: () => systemStore.getState().appConfig,
  canvasId: () => systemStore.getState().appConfig.canvasId,
  displaySize: () => systemStore.getState().appConfig.displaySize,
  debugMode: () => systemStore.getState().appConfig.enableDebug,
};