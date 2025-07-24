/**
 * コアアプリケーションステートストア
 * アプリケーションの本質的な状態を管理
 */

import { createStore } from 'zustand/vanilla';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { CoreState } from '../types/state';
import type { StrokeData, StrokePoint } from '../types/core';

/**
 * コアステートの初期値
 */
const initialCoreState: CoreState = {
  drawingEngine: {
    isInitialized: false,
    canvasSize: { width: 1024, height: 1024 },
    color: [0, 0, 0, 1], // Black
    brushSize: 2,
    opacity: 1.0,
    isDrawing: false,
    currentStroke: [],
  },
  symmetry: {
    enabled: true,
    axisCount: 8,
    centerPoint: { x: 512, y: 512 },
  },
  view: {
    zoom: 1.0,
    pan: { x: 0, y: 0 },
    rotation: 0,
    transform: {
      zoom: 1.0,
      panOffset: { canvasX: 0, canvasY: 0 },
      rotation: 0,
    },
  },
  history: {
    strokes: [],
    historyIndex: 0,
    maxHistorySize: 100,
  },
  performance: {
    fps: 0,
    frameTime: 0,
    inputDelay: 0,
    memoryUsage: 0,
  },
  appConfig: {
    canvasId: 'paint-canvas',
    displaySize: { width: 500, height: 500 },
    enableDebug: false,
  },
  inputProcessor: {
    lastEvent: undefined,
    eventCount: 0,
    sessionStartTime: undefined,
  },
};

/**
 * コアステートストアの型定義
 */
export interface CoreStoreState extends CoreState {
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

  // View Actions
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setRotation: (rotation: number) => void;
  resetView: () => void;

  // History Actions
  addStroke: (stroke: StrokeData) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;

  // Performance Actions
  updateFPS: (fps: number) => void;
  updateFrameTime: (frameTime: number) => void;
  updateInputDelay: (delay: number) => void;
  updateMemoryUsage: (usage: number) => void;

  // App Config Actions
  setCanvasId: (canvasId: string) => void;
  setDisplaySize: (size: { width: number; height: number }) => void;
  setDebugMode: (enabled: boolean) => void;
  updateConfig: (config: Partial<import('../types/state').AppConfigState>) => void;

  // Input Processor Actions
  updateLastEvent: (event: import('../input/InputEventHandler').NormalizedInputEvent) => void;
  incrementEventCount: () => void;
  resetInputProcessor: () => void;
  setSessionStartTime: (timestamp: number) => void;

  // Utility Actions
  reset: () => void;
}

/**
 * コアステートストア
 * アプリケーションの核となる状態管理
 */
export const coreStore = createStore<CoreStoreState>()(
  devtools(
    subscribeWithSelector((set) => ({
      ...initialCoreState,

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

      // Drawing Session Management
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

            // Add stroke to history
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
      // VIEW ACTIONS
      // =============================================================================

      setZoom: (zoom) => {
        set(
          (state) => ({
            view: {
              ...state.view,
              zoom: Math.max(0.1, Math.min(10, zoom)),
            },
          }),
          false,
          'setZoom'
        );
      },

      setPan: (pan) => {
        set(
          (state) => ({
            view: {
              ...state.view,
              pan,
            },
          }),
          false,
          'setPan'
        );
      },

      setRotation: (rotation) => {
        set(
          (state) => ({
            view: {
              ...state.view,
              rotation: rotation % (2 * Math.PI),
            },
          }),
          false,
          'setRotation'
        );
      },

      resetView: () => {
        set(
          () => ({
            view: {
              zoom: 1.0,
              pan: { x: 0, y: 0 },
              rotation: 0,
              transform: {
                zoom: 1.0,
                panOffset: { canvasX: 0, canvasY: 0 },
                rotation: 0,
              },
            },
          }),
          false,
          'resetView'
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
      // INPUT PROCESSOR ACTIONS
      // =============================================================================

      updateLastEvent: (event) => {
        set(
          (state) => ({
            inputProcessor: {
              ...state.inputProcessor,
              lastEvent: event,
            },
          }),
          false,
          'updateLastEvent'
        );
      },

      incrementEventCount: () => {
        set(
          (state) => ({
            inputProcessor: {
              ...state.inputProcessor,
              eventCount: state.inputProcessor.eventCount + 1,
            },
          }),
          false,
          'incrementEventCount'
        );
      },

      resetInputProcessor: () => {
        set(
          () => ({
            inputProcessor: {
              lastEvent: undefined,
              eventCount: 0,
              sessionStartTime: Date.now(),
            },
          }),
          false,
          'resetInputProcessor'
        );
      },

      setSessionStartTime: (timestamp) => {
        set(
          (state) => ({
            inputProcessor: {
              ...state.inputProcessor,
              sessionStartTime: timestamp,
            },
          }),
          false,
          'setSessionStartTime'
        );
      },

      // =============================================================================
      // UTILITY ACTIONS
      // =============================================================================

      reset: () => {
        set(initialCoreState, false, 'reset');
      },
    })),
    {
      name: 'core-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Hook version for React compatibility (if needed in the future)
export const useCoreStore = (selector: (state: CoreStoreState) => any) => {
  return selector(coreStore.getState());
};

/**
 * コアストアのセレクター関数
 * パフォーマンス最適化のための細かい状態選択
 */
export const coreSelectors = {
  // Drawing Engine Selectors
  drawingEngine: () => coreStore.getState().drawingEngine,
  isInitialized: () => coreStore.getState().drawingEngine.isInitialized,
  canvasSize: () => coreStore.getState().drawingEngine.canvasSize,
  color: () => coreStore.getState().drawingEngine.color,
  brushSize: () => coreStore.getState().drawingEngine.brushSize,
  opacity: () => coreStore.getState().drawingEngine.opacity,
  isDrawing: () => coreStore.getState().drawingEngine.isDrawing,
  currentStroke: () => coreStore.getState().drawingEngine.currentStroke,

  // Symmetry Selectors
  symmetry: () => coreStore.getState().symmetry,
  symmetryEnabled: () => coreStore.getState().symmetry.enabled,
  axisCount: () => coreStore.getState().symmetry.axisCount,
  centerPoint: () => coreStore.getState().symmetry.centerPoint,

  // View Selectors
  view: () => coreStore.getState().view,
  zoom: () => coreStore.getState().view.zoom,
  pan: () => coreStore.getState().view.pan,
  rotation: () => coreStore.getState().view.rotation,

  // History Selectors
  history: () => coreStore.getState().history,
  strokes: () => {
    const state = coreStore.getState();
    return state.history.strokes.slice(0, state.history.historyIndex);
  },
  canUndo: () => coreStore.getState().history.historyIndex > 0,
  canRedo: () => {
    const state = coreStore.getState();
    return state.history.historyIndex < state.history.strokes.length;
  },

  // Performance Selectors
  performance: () => coreStore.getState().performance,
  fps: () => coreStore.getState().performance.fps,
  frameTime: () => coreStore.getState().performance.frameTime,
  inputDelay: () => coreStore.getState().performance.inputDelay,
  memoryUsage: () => coreStore.getState().performance.memoryUsage,

  // App Config Selectors
  appConfig: () => coreStore.getState().appConfig,
  canvasId: () => coreStore.getState().appConfig.canvasId,
  displaySize: () => coreStore.getState().appConfig.displaySize,
  debugMode: () => coreStore.getState().appConfig.enableDebug,

  // Input Processor Selectors
  inputProcessor: () => coreStore.getState().inputProcessor,
  lastEvent: () => coreStore.getState().inputProcessor.lastEvent,
  eventCount: () => coreStore.getState().inputProcessor.eventCount,
  sessionStartTime: () => coreStore.getState().inputProcessor.sessionStartTime,
};