/**
 * ステートストアの基本動作テスト
 * コアステートとUIステートの分離設計を検証
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { coreStore, coreSelectors } from './coreStore';
import { uiStore, uiSelectors, colorNameToRGBA } from './uiStore';
import { syncUIToCore, initializeStores, resetAllStores } from './index';

describe('State Management System', () => {
  beforeEach(() => {
    resetAllStores();
  });

  afterEach(() => {
    resetAllStores();
  });

  describe('Core Store Basic Functions', () => {
    it('should initialize drawing engine correctly', () => {
      const store = coreStore.getState();
      const canvasSize = { width: 800, height: 600 };

      store.initializeEngine(canvasSize);

      const state = coreStore.getState().drawingEngine;
      expect(state.isInitialized).toBe(true);
      expect(state.canvasSize).toEqual(canvasSize);
    });

    it('should update color correctly', () => {
      const store = coreStore.getState();
      const redColor: [number, number, number, number] = [1, 0, 0, 1];

      store.setColor(redColor);

      const color = coreSelectors.color();
      expect(color).toEqual(redColor);
    });

    it('should toggle symmetry correctly', () => {
      const store = coreStore.getState();
      const initialState = coreSelectors.symmetryEnabled();

      store.toggleSymmetry();
      expect(coreSelectors.symmetryEnabled()).toBe(!initialState);
    });

    it('should manage stroke history', () => {
      const store = coreStore.getState();
      const testStroke = {
        id: 'test-stroke-1',
        points: [
          { x: 100, y: 100, pressure: 1.0, timestamp: 1000 },
          { x: 200, y: 200, pressure: 1.0, timestamp: 1001 },
        ],
        timestamp: 1000,
        metadata: {},
      };

      store.addStroke(testStroke);

      const strokes = coreSelectors.strokes();
      expect(strokes).toHaveLength(1);
      expect(strokes[0]).toEqual(testStroke);
      expect(coreSelectors.canUndo()).toBe(true);
      expect(coreSelectors.canRedo()).toBe(false);
    });
  });

  describe('UI Store Basic Functions', () => {
    it('should update drawing mode correctly', () => {
      const store = uiStore.getState();

      store.setDrawingMode('curve');
      expect(uiSelectors.drawingMode()).toBe('curve');

      store.setDrawingMode('multi');
      expect(uiSelectors.drawingMode()).toBe('multi');
    });

    it('should update color name correctly', () => {
      const store = uiStore.getState();

      store.setColorName('red');
      expect(uiSelectors.colorName()).toBe('red');

      store.setColorName('blue');
      expect(uiSelectors.colorName()).toBe('blue');
    });

    it('should toggle metrics display', () => {
      const store = uiStore.getState();
      const initialState = uiSelectors.showMetrics();

      store.toggleMetrics();
      expect(uiSelectors.showMetrics()).toBe(!initialState);
    });
  });

  describe('Store Integration', () => {
    it('should convert color names to correct RGBA values', () => {
      expect(colorNameToRGBA('black')).toEqual([0, 0, 0, 1]);
      expect(colorNameToRGBA('red')).toEqual([1, 0, 0, 1]);
      expect(colorNameToRGBA('blue')).toEqual([0, 0, 1, 1]);
      expect(colorNameToRGBA('green')).toEqual([0, 1, 0, 1]);
    });

    it('should sync UI color selection to core state', () => {
      const uiState = uiStore.getState();
      
      // Change UI color selection
      uiState.setColorName('red');

      // Sync to core
      syncUIToCore();

      // Verify core state was updated
      const coreColor = coreSelectors.color();
      expect(coreColor).toEqual([1, 0, 0, 1]);
    });

    it('should initialize stores with canvas size', () => {
      const canvasSize = { width: 800, height: 600 };

      initializeStores(canvasSize);

      const drawingEngine = coreSelectors.drawingEngine();
      expect(drawingEngine.isInitialized).toBe(true);
      expect(drawingEngine.canvasSize).toEqual(canvasSize);
    });
  });

  describe('State Isolation', () => {
    it('should keep core and UI states completely separate', () => {
      const uiState = uiStore.getState();
      const coreState = coreStore.getState();

      // Modify UI state
      uiState.setDrawingMode('multi');
      uiState.toggleDebugInfo();

      // Core state should remain unchanged
      const newCoreState = coreStore.getState();
      expect(newCoreState.drawingEngine.color).toEqual([0, 0, 0, 1]);
      expect(newCoreState.symmetry.enabled).toBe(true);

      // Modify core state
      coreState.setColor([0, 1, 0, 1]);
      coreState.toggleSymmetry();

      // UI state should remain unchanged (except for what we modified)
      const newUIState = uiStore.getState();
      expect(newUIState.demo.selectedDrawingMode).toBe('multi');
      expect(newUIState.debug.showDebugInfo).toBe(true);
    });
  });
});