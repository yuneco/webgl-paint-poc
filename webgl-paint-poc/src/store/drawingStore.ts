/**
 * 描画関連状態管理ストア
 * 描画エンジン、履歴管理、対称描画の統合管理
 */

import { createStore } from 'zustand/vanilla';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { DrawingEngineState, DrawingHistoryState, SymmetryState } from '../types/state';
import type { StrokeData, StrokePoint } from '../types/core';

/**
 * 描画ストアの初期状態
 */
const initialDrawingState = {
  drawingEngine: {
    isInitialized: false,
    canvasSize: { width: 1024, height: 1024 },
    color: [0, 0, 0, 1] as [number, number, number, number], // Black
    brushSize: 20,
    opacity: 1.0,
    isDrawing: false,
    currentStroke: [],
  } as DrawingEngineState,

  history: {
    strokes: [],
    historyIndex: 0,
    maxHistorySize: 100,
  } as DrawingHistoryState,

  symmetry: {
    enabled: true,
    axisCount: 8,
    centerPoint: { x: 512, y: 512 },
  } as SymmetryState,
};

/**
 * 描画ストアの状態とアクション定義
 */
export interface DrawingStoreState {
  // State
  drawingEngine: DrawingEngineState;
  history: DrawingHistoryState;
  symmetry: SymmetryState;

  // Drawing Engine Actions
  initializeEngine: (canvasSize: { width: number; height: number }) => void;
  setColor: (color: [number, number, number, number]) => void;
  setBrushSize: (size: number) => void;
  setOpacity: (opacity: number) => void;
  cleanup: () => void;

  // Drawing Session Management
  startDrawing: (point: StrokePoint) => void;
  continueDrawing: (point: StrokePoint) => void;
  endDrawing: (point: StrokePoint) => void;
  cancelDrawing: () => void;

  // Symmetry Actions
  toggleSymmetry: () => void;
  setSymmetryEnabled: (enabled: boolean) => void;
  setAxisCount: (count: number) => void;
  setCenterPoint: (point: { x: number; y: number }) => void;

  // History Actions
  addStroke: (stroke: StrokeData) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;

  // Utility Actions
  reset: () => void;
}

/**
 * 描画関連状態管理ストア
 * 描画エンジン、履歴、対称描画の統合管理
 */
export const drawingStore = createStore<DrawingStoreState>()(
  devtools(
    subscribeWithSelector((set) => ({
      ...initialDrawingState,

      // =============================================================================
      // DRAWING ENGINE ACTIONS
      // =============================================================================

      initializeEngine: (canvasSize) => {
        set(
          (state) => ({
            drawingEngine: {
              ...state.drawingEngine,
              isInitialized: true,
              canvasSize,
            },
          }),
          false,
          'initializeEngine'
        );
      },

      setColor: (color) => {
        set(
          (state) => ({
            drawingEngine: {
              ...state.drawingEngine,
              color,
            },
          }),
          false,
          'setColor'
        );
      },

      setBrushSize: (brushSize) => {
        set(
          (state) => ({
            drawingEngine: {
              ...state.drawingEngine,
              brushSize: Math.max(1, Math.min(100, brushSize)),
            },
          }),
          false,
          'setBrushSize'
        );
      },

      setOpacity: (opacity) => {
        set(
          (state) => ({
            drawingEngine: {
              ...state.drawingEngine,
              opacity: Math.max(0, Math.min(1, opacity)),
            },
          }),
          false,
          'setOpacity'
        );
      },

      cleanup: () => {
        set(
          (state) => ({
            drawingEngine: {
              ...state.drawingEngine,
              isInitialized: false,
            },
          }),
          false,
          'cleanup'
        );
      },

      // =============================================================================
      // DRAWING SESSION MANAGEMENT
      // =============================================================================

      startDrawing: (point) => {
        set(
          (state) => ({
            drawingEngine: {
              ...state.drawingEngine,
              isDrawing: true,
              currentStroke: [point],
            },
          }),
          false,
          'startDrawing'
        );
      },

      continueDrawing: (point) => {
        set(
          (state) => ({
            drawingEngine: {
              ...state.drawingEngine,
              currentStroke: state.drawingEngine.isDrawing
                ? [...state.drawingEngine.currentStroke, point]
                : state.drawingEngine.currentStroke,
            },
          }),
          false,
          'continueDrawing'
        );
      },

      // 重要: endDrawingは描画エンジンと履歴の両方を原子的に更新
      endDrawing: (point) => {
        set(
          (state) => {
            if (!state.drawingEngine.isDrawing) return state;

            const finalStroke = [...state.drawingEngine.currentStroke, point];
            const strokeData: StrokeData = {
              id: `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              points: finalStroke,
              timestamp: Date.now(),
              metadata: {
                timestamp: Date.now(),
                deviceType: 'unknown',
                totalPoints: finalStroke.length,
              },
            };

            // 履歴に追加（最大サイズ管理）
            const newStrokes = [...state.history.strokes.slice(0, state.history.historyIndex), strokeData];
            if (newStrokes.length > state.history.maxHistorySize) {
              newStrokes.shift();
            }

            return {
              ...state,
              drawingEngine: {
                ...state.drawingEngine,
                isDrawing: false,
                currentStroke: [],
              },
              history: {
                ...state.history,
                strokes: newStrokes,
                historyIndex: newStrokes.length,
              },
            };
          },
          false,
          'endDrawing'
        );
      },

      cancelDrawing: () => {
        set(
          (state) => ({
            drawingEngine: {
              ...state.drawingEngine,
              isDrawing: false,
              currentStroke: [],
            },
          }),
          false,
          'cancelDrawing'
        );
      },

      // =============================================================================
      // SYMMETRY ACTIONS
      // =============================================================================

      toggleSymmetry: () => {
        set(
          (state) => ({
            symmetry: {
              ...state.symmetry,
              enabled: !state.symmetry.enabled,
            },
          }),
          false,
          'toggleSymmetry'
        );
      },

      setSymmetryEnabled: (enabled) => {
        set(
          (state) => ({
            symmetry: {
              ...state.symmetry,
              enabled,
            },
          }),
          false,
          'setSymmetryEnabled'
        );
      },

      setAxisCount: (axisCount) => {
        set(
          (state) => ({
            symmetry: {
              ...state.symmetry,
              axisCount: Math.max(2, Math.min(16, axisCount)),
            },
          }),
          false,
          'setAxisCount'
        );
      },

      setCenterPoint: (centerPoint) => {
        set(
          (state) => ({
            symmetry: {
              ...state.symmetry,
              centerPoint,
            },
          }),
          false,
          'setCenterPoint'
        );
      },

      // =============================================================================
      // HISTORY ACTIONS
      // =============================================================================

      addStroke: (stroke) => {
        set(
          (state) => {
            const newStrokes = [...state.history.strokes.slice(0, state.history.historyIndex), stroke];

            // 最大履歴数を超えた場合、古いものから削除
            if (newStrokes.length > state.history.maxHistorySize) {
              newStrokes.shift();
            }

            return {
              history: {
                ...state.history,
                strokes: newStrokes,
                historyIndex: newStrokes.length,
              },
            };
          },
          false,
          'addStroke'
        );
      },

      undo: () => {
        set(
          (state) => ({
            history: {
              ...state.history,
              historyIndex: Math.max(0, state.history.historyIndex - 1),
            },
          }),
          false,
          'undo'
        );
      },

      redo: () => {
        set(
          (state) => ({
            history: {
              ...state.history,
              historyIndex: Math.min(state.history.strokes.length, state.history.historyIndex + 1),
            },
          }),
          false,
          'redo'
        );
      },

      clearHistory: () => {
        set(
          (state) => ({
            history: {
              ...state.history,
              strokes: [],
              historyIndex: 0,
            },
          }),
          false,
          'clearHistory'
        );
      },

      // =============================================================================
      // UTILITY ACTIONS
      // =============================================================================

      reset: () => {
        set(initialDrawingState, false, 'reset');
      },
    })),
    {
      name: 'drawing-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

/**
 * 描画ストア用セレクター
 * パフォーマンス最適化のための細かい状態選択
 */
export const drawingSelectors = {
  // Drawing Engine Selectors
  drawingEngine: () => drawingStore.getState().drawingEngine,
  isInitialized: () => drawingStore.getState().drawingEngine.isInitialized,
  canvasSize: () => drawingStore.getState().drawingEngine.canvasSize,
  color: () => drawingStore.getState().drawingEngine.color,
  brushSize: () => drawingStore.getState().drawingEngine.brushSize,
  opacity: () => drawingStore.getState().drawingEngine.opacity,
  isDrawing: () => drawingStore.getState().drawingEngine.isDrawing,
  currentStroke: () => drawingStore.getState().drawingEngine.currentStroke,

  // Symmetry Selectors
  symmetry: () => drawingStore.getState().symmetry,
  symmetryEnabled: () => drawingStore.getState().symmetry.enabled,
  axisCount: () => drawingStore.getState().symmetry.axisCount,
  centerPoint: () => drawingStore.getState().symmetry.centerPoint,

  // History Selectors
  history: () => drawingStore.getState().history,
  strokes: () => {
    const state = drawingStore.getState();
    return state.history.strokes.slice(0, state.history.historyIndex);
  },
  canUndo: () => drawingStore.getState().history.historyIndex > 0,
  canRedo: () => {
    const state = drawingStore.getState();
    return state.history.historyIndex < state.history.strokes.length;
  },
};