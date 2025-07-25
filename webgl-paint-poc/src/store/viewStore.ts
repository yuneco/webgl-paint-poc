/**
 * ビューポートと入力状態管理ストア
 * ビュー変換と入力処理の協調管理
 */

import { createStore } from 'zustand/vanilla';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { ViewState, InputProcessorState } from '../types/state';
import type { NormalizedInputEvent } from '../input/InputEventHandler';

/**
 * ビューストアの初期状態
 */
const initialViewState = {
  view: {
    zoom: 1.0,
    pan: { x: 0, y: 0 },
    rotation: 0,
    transform: {
      zoom: 1.0,
      panOffset: { canvasX: 0, canvasY: 0 },
      rotation: 0,
    },
  } as ViewState,
  
  inputProcessor: {
    lastEvent: undefined,
    eventCount: 0,
    sessionStartTime: undefined,
  } as InputProcessorState,
};

/**
 * ビューストアの状態とアクション定義
 */
export interface ViewStoreState {
  // State
  view: ViewState;
  inputProcessor: InputProcessorState;

  // View Actions
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setRotation: (rotation: number) => void;
  resetView: () => void;
  updateViewTransform: (transform: ViewState['transform']) => void;

  // Input Processor Actions
  updateLastEvent: (event: NormalizedInputEvent) => void;
  incrementEventCount: () => void;
  resetInputProcessor: () => void;
  setSessionStartTime: (timestamp: number) => void;

  // Utility Actions
  reset: () => void;
}

/**
 * ビューポートと入力状態管理ストア
 * ビュー変換と入力処理の協調管理
 */
export const viewStore = createStore<ViewStoreState>()(
  devtools(
    subscribeWithSelector((set) => ({
      ...initialViewState,

      // =============================================================================
      // VIEW ACTIONS
      // =============================================================================

      setZoom: (zoom) => {
        set(
          (state) => {
            const newZoom = Math.max(0.1, Math.min(10, zoom));
            return {
              view: {
                ...state.view,
                zoom: newZoom,
                transform: {
                  ...state.view.transform,
                  zoom: newZoom,
                },
              },
            };
          },
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
              transform: {
                ...state.view.transform,
                panOffset: { canvasX: pan.x, canvasY: pan.y },
              },
            },
          }),
          false,
          'setPan'
        );
      },

      setRotation: (rotation) => {
        set(
          (state) => {
            const normalizedRotation = rotation % (2 * Math.PI);
            return {
              view: {
                ...state.view,
                rotation: normalizedRotation,
                transform: {
                  ...state.view.transform,
                  rotation: normalizedRotation,
                },
              },
            };
          },
          false,
          'setRotation'
        );
      },

      resetView: () => {
        const defaultViewState = {
          zoom: 1.0,
          pan: { x: 0, y: 0 },
          rotation: 0,
          transform: {
            zoom: 1.0,
            panOffset: { canvasX: 0, canvasY: 0 },
            rotation: 0,
          },
        };
        
        set(
          () => ({
            view: defaultViewState,
          }),
          false,
          'resetView'
        );
      },

      updateViewTransform: (transform) => {
        set(
          (state) => ({
            view: {
              ...state.view,
              transform,
              // 基本的なview値も同期更新
              zoom: transform.zoom,
              pan: { x: transform.panOffset.canvasX, y: transform.panOffset.canvasY },
              rotation: transform.rotation,
            },
          }),
          false,
          'updateViewTransform'
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
        set(initialViewState, false, 'reset');
      },
    })),
    {
      name: 'view-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

/**
 * ビューストア用セレクター
 * パフォーマンス最適化のための細かい状態選択
 */
export const viewSelectors = {
  // View Selectors
  view: () => viewStore.getState().view,
  zoom: () => viewStore.getState().view.zoom,
  pan: () => viewStore.getState().view.pan,
  rotation: () => viewStore.getState().view.rotation,
  transform: () => viewStore.getState().view.transform,

  // Input Processor Selectors
  inputProcessor: () => viewStore.getState().inputProcessor,
  lastEvent: () => viewStore.getState().inputProcessor.lastEvent,
  eventCount: () => viewStore.getState().inputProcessor.eventCount,
  sessionStartTime: () => viewStore.getState().inputProcessor.sessionStartTime,
};