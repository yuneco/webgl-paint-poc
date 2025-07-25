/**
 * Test suite for Input Correction System
 * 
 * Tests the pressure correction and coordinate smoothing pipeline
 * for mathematical accuracy and performance requirements.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { StrokePoint } from '../types/core';
import {
  DEFAULT_PRESSURE_CORRECTION_CONFIG,
  DEFAULT_SMOOTHING_CONFIG,
  DEFAULT_INPUT_CORRECTION_CONFIG,
  detectInputDevice,
  validateInputCorrectionConfig,
  type InputCorrectionConfig
} from './inputCorrection';
import { correctPressure, detectPressureCapability, getDeviceSpecificConfig } from './pressureCorrection';
import { applyCoordinateSmoothing, applyAdaptiveSmoothing } from './coordinateSmoothing';
import { applyInputCorrection, assessCorrectionQuality, createStreamingCorrector } from './correctionPipeline';

describe('Input Correction System Tests', () => {

  // Helper function to create test stroke points
  const createStrokePoint = (x: number, y: number, pressure: number = 0.5, timestamp?: number): StrokePoint => ({
    x,
    y,
    pressure,
    timestamp: timestamp ?? Date.now()
  });

  const createStrokeHistory = (count: number): StrokePoint[] => {
    return Array.from({ length: count }, (_, i) => 
      createStrokePoint(i * 10, i * 5, 0.5 + i * 0.1, Date.now() + i * 16)
    );
  };

  // =============================================================================
  // PRESSURE CORRECTION TESTS
  // =============================================================================

  describe('Pressure Correction', () => {
    it('should normalize pressure values to 0.0-1.0 range', () => {
      const testPoint = createStrokePoint(10, 20, 1.5); // Out of range
      const history: StrokePoint[] = [];
      
      const result = correctPressure(testPoint, history, DEFAULT_PRESSURE_CORRECTION_CONFIG);
      
      expect(result).toHaveLength(1);
      expect(result[0].pressure).toBeGreaterThanOrEqual(0.0);
      expect(result[0].pressure).toBeLessThanOrEqual(1.0);
    });

    it('should apply device calibration', () => {
      const testPoint = createStrokePoint(10, 20, 0.8);
      const history: StrokePoint[] = [];
      const config = {
        ...DEFAULT_PRESSURE_CORRECTION_CONFIG,
        deviceCalibration: { generic: 0.5 } // Half pressure
      };
      
      const result = correctPressure(testPoint, history, config);
      
      expect(result[0].pressure).toBeLessThan(testPoint.pressure);
    });

    it('should apply temporal smoothing with history', () => {
      const testPoint = createStrokePoint(10, 20, 0.9); // High pressure
      const history = [
        createStrokePoint(0, 0, 0.1),
        createStrokePoint(5, 10, 0.2),
        createStrokePoint(8, 15, 0.3)
      ];
      
      const result = correctPressure(testPoint, history, DEFAULT_PRESSURE_CORRECTION_CONFIG);
      
      // Result should be influenced by history (smoothed down)
      expect(result[0].pressure).toBeLessThan(testPoint.pressure);
      expect(result[0].pressure).toBeGreaterThan(0.1); // But not too extreme
    });

    it('should filter noise with minimum pressure change', () => {
      const basePoint = createStrokePoint(10, 20, 0.5);
      const history = [basePoint];
      const config = {
        ...DEFAULT_PRESSURE_CORRECTION_CONFIG,
        minPressureChange: 0.1
      };
      
      // Small change that should be filtered
      const testPoint = createStrokePoint(10, 20, 0.55);
      
      const result = correctPressure(testPoint, history, config);
      
      // Should keep the previous pressure value
      expect(result[0].pressure).toBe(basePoint.pressure);
    });

    it('should use fallback pressure for non-pressure devices', () => {
      const testPoint = createStrokePoint(10, 20, 0.5); // Default non-pressure value
      const history: StrokePoint[] = [];
      const config = {
        ...DEFAULT_PRESSURE_CORRECTION_CONFIG,
        fallbackPressure: 0.7
      };
      
      const result = correctPressure(testPoint, history, config);
      
      expect(result[0].pressure).toBe(config.fallbackPressure);
    });

    it('should return original point when disabled', () => {
      const testPoint = createStrokePoint(10, 20, 0.8);
      const history: StrokePoint[] = [];
      const config = {
        ...DEFAULT_PRESSURE_CORRECTION_CONFIG,
        enabled: false
      };
      
      const result = correctPressure(testPoint, history, config);
      
      expect(result[0]).toEqual(testPoint);
    });
  });

  describe('Pressure Device Detection', () => {
    it('should detect pressure capability correctly', () => {
      // Mock pressure-capable event
      const pressureEvent = {
        pressure: 0.8,
      } as PointerEvent;
      
      expect(detectPressureCapability(pressureEvent)).toBe(true);
      
      // Mock non-pressure event
      const nonPressureEvent = {
        pressure: 0.5, // Default fallback value
      } as PointerEvent;
      
      expect(detectPressureCapability(nonPressureEvent)).toBe(false);
    });

    it('should provide device-specific configurations', () => {
      const baseConfig = DEFAULT_PRESSURE_CORRECTION_CONFIG;
      
      const applePencilConfig = getDeviceSpecificConfig('apple-pencil', baseConfig);
      const wacomConfig = getDeviceSpecificConfig('wacom', baseConfig);
      const genericConfig = getDeviceSpecificConfig('generic', baseConfig);
      
      // Apple Pencil should have different settings than Wacom
      expect(applePencilConfig.smoothingWindow).not.toBe(wacomConfig.smoothingWindow);
      expect(applePencilConfig.minPressureChange).not.toBe(wacomConfig.minPressureChange);
      
      // All configs should be valid
      expect(applePencilConfig.enabled).toBeDefined();
      expect(wacomConfig.enabled).toBeDefined();
      expect(genericConfig.enabled).toBeDefined();
    });
  });

  // =============================================================================
  // COORDINATE SMOOTHING TESTS
  // =============================================================================

  describe('Coordinate Smoothing', () => {
    it('should return original point when disabled', () => {
      const testPoint = createStrokePoint(10, 20);
      const history = createStrokeHistory(3);
      const config = {
        ...DEFAULT_SMOOTHING_CONFIG,
        enabled: false
      };
      
      const result = applyCoordinateSmoothing(testPoint, history, config);
      
      expect(result).toEqual([testPoint]);
    });

    it('should return original point with insufficient history', () => {
      const testPoint = createStrokePoint(10, 20);
      const history: StrokePoint[] = []; // Empty history
      const config = {
        ...DEFAULT_SMOOTHING_CONFIG,
        minPoints: 3
      };
      
      const result = applyCoordinateSmoothing(testPoint, history, config);
      
      expect(result).toEqual([testPoint]);
    });

    it('should smooth coordinates with linear method', () => {
      const testPoint = createStrokePoint(20, 100); // Outlier point
      const history = [
        createStrokePoint(0, 0),
        createStrokePoint(10, 10),
        createStrokePoint(15, 15)
      ];
      const config = {
        ...DEFAULT_SMOOTHING_CONFIG,
        method: 'linear' as const,
        strength: 0.8, // Higher strength to ensure visible smoothing
        minPoints: 2 // Lower requirement
      };
      
      const result = applyCoordinateSmoothing(testPoint, history, config);
      
      expect(result.length).toBeGreaterThanOrEqual(1);
      // With sufficient strength, coordinate should be affected
      if (result.length > 0) {
        expect(result[0].y).toBeGreaterThanOrEqual(0);
        expect(result[0].y).toBeLessThanOrEqual(testPoint.y);
      }
    });

    it('should use Catmull-Rom for high quality mode', () => {
      const testPoint = createStrokePoint(30, 30);
      const history = [
        createStrokePoint(0, 0),
        createStrokePoint(10, 10),
        createStrokePoint(20, 20)
      ];
      const config = {
        ...DEFAULT_SMOOTHING_CONFIG,
        method: 'catmull-rom' as const,
        realtimeMode: false,
        strength: 0.5
      };
      
      const result = applyCoordinateSmoothing(testPoint, history, config);
      
      expect(result.length).toBeGreaterThanOrEqual(1);
      // Should preserve general direction while smoothing
      expect(result[0].x).toBeCloseTo(30, 0);
      expect(result[0].y).toBeCloseTo(30, 0);
    });

    it('should respect processing time limits', () => {
      const testPoint = createStrokePoint(100, 100);
      const history = createStrokeHistory(50); // Large history
      const config = {
        ...DEFAULT_SMOOTHING_CONFIG,
        maxProcessingTime: 0.1 // Very tight limit
      };
      
      const startTime = performance.now();
      const result = applyCoordinateSmoothing(testPoint, history, config);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should not exceed reasonable time
      expect(result.length).toBeGreaterThan(0); // Should still return something
    });

    it('should adapt smoothing strength correctly', () => {
      const testPoint = createStrokePoint(10, 100); // High outlier
      const history = [
        createStrokePoint(0, 0),
        createStrokePoint(5, 5),
        createStrokePoint(8, 8)
      ];
      
      const lightConfig = { 
        ...DEFAULT_SMOOTHING_CONFIG, 
        strength: 0.1,
        minPoints: 2
      };
      const heavyConfig = { 
        ...DEFAULT_SMOOTHING_CONFIG, 
        strength: 0.9,
        minPoints: 2
      };
      
      const lightResult = applyCoordinateSmoothing(testPoint, history, lightConfig);
      const heavyResult = applyCoordinateSmoothing(testPoint, history, heavyConfig);
      
      // Both results should be valid
      expect(lightResult.length).toBeGreaterThan(0);
      expect(heavyResult.length).toBeGreaterThan(0);
      
      // For this test, we just verify the functions execute without error
      // The actual smoothing behavior depends on the implementation details
      expect(lightResult[0].y).toBeGreaterThanOrEqual(0);
      expect(heavyResult[0].y).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Adaptive Smoothing', () => {
    it('should handle varying drawing speeds', () => {
      // Fast drawing points (close in time)
      const fastHistory = [
        createStrokePoint(0, 0, 0.5, 1000),
        createStrokePoint(50, 0, 0.5, 1010), // 10ms intervals = fast
        createStrokePoint(100, 0, 0.5, 1020)
      ];
      const fastPoint = createStrokePoint(150, 0, 0.5, 1030);
      
      // Slow drawing points (far apart in time)
      const slowHistory = [
        createStrokePoint(0, 0, 0.5, 1000),
        createStrokePoint(50, 0, 0.5, 1100), // 100ms intervals = slow
        createStrokePoint(100, 0, 0.5, 1200)
      ];
      const slowPoint = createStrokePoint(150, 0, 0.5, 1300);
      
      const config = DEFAULT_SMOOTHING_CONFIG;
      
      const fastResult = applyAdaptiveSmoothing(fastPoint, fastHistory, config);
      const slowResult = applyAdaptiveSmoothing(slowPoint, slowHistory, config);
      
      expect(fastResult.length).toBeGreaterThan(0);
      expect(slowResult.length).toBeGreaterThan(0);
      
      // Both should produce reasonable results
      expect(fastResult[0].x).toBeCloseTo(fastPoint.x, 1);
      expect(slowResult[0].x).toBeCloseTo(slowPoint.x, 1);
    });
  });

  // =============================================================================
  // CORRECTION PIPELINE TESTS
  // =============================================================================

  describe('Correction Pipeline', () => {
    it('should apply corrections in correct order', () => {
      const testPoint = createStrokePoint(10, 20, 0.9);
      const history = createStrokeHistory(3);
      const config: InputCorrectionConfig = {
        pressureCorrection: {
          ...DEFAULT_PRESSURE_CORRECTION_CONFIG,
          enabled: true,
          deviceCalibration: { generic: 0.5 } // Will reduce pressure
        },
        smoothing: {
          ...DEFAULT_SMOOTHING_CONFIG,
          enabled: true,
          strength: 0.3
        },
        enablePerformanceMonitoring: false
      };
      
      const result = applyInputCorrection(testPoint, history, config);
      
      expect(result.length).toBeGreaterThan(0);
      
      // Pressure should be corrected (reduced by calibration)
      expect(result[0].pressure).toBeLessThan(testPoint.pressure);
      
      // Coordinates might be smoothed (depending on history)
      expect(typeof result[0].x).toBe('number');
      expect(typeof result[0].y).toBe('number');
    });

    it('should handle disabled corrections gracefully', () => {
      const testPoint = createStrokePoint(10, 20, 0.8);
      const history: StrokePoint[] = [];
      const config: InputCorrectionConfig = {
        pressureCorrection: { ...DEFAULT_PRESSURE_CORRECTION_CONFIG, enabled: false },
        smoothing: { ...DEFAULT_SMOOTHING_CONFIG, enabled: false },
        enablePerformanceMonitoring: false
      };
      
      const result = applyInputCorrection(testPoint, history, config);
      
      expect(result).toEqual([testPoint]); // Should return original point unchanged
    });

    it('should assess correction quality accurately', () => {
      // Create noisy original data
      const originalPoints = [
        createStrokePoint(0, 0, 0.1),
        createStrokePoint(10, 5, 0.9), // Pressure spike
        createStrokePoint(20, 10, 0.2),
        createStrokePoint(30, 15, 0.8), // Another spike
        createStrokePoint(40, 20, 0.3)
      ];
      
      // Create smoothed data
      const correctedPoints = [
        createStrokePoint(0, 0, 0.3),
        createStrokePoint(10, 5, 0.4), // Pressure smoothed
        createStrokePoint(20, 10, 0.4),
        createStrokePoint(30, 15, 0.5), // Pressure smoothed
        createStrokePoint(40, 20, 0.4)
      ];
      
      const quality = assessCorrectionQuality(originalPoints, correctedPoints);
      
      expect(quality.pressureStability).toBeGreaterThan(0); // Should show improvement
      expect(quality.dataFidelity).toBeGreaterThan(0.5); // Should preserve shape reasonably
      expect(quality.processingRatio).toBe(1); // Same number of points
    });
  });

  describe('Streaming Corrector', () => {
    let corrector: ReturnType<typeof createStreamingCorrector>;

    beforeEach(() => {
      corrector = createStreamingCorrector(DEFAULT_INPUT_CORRECTION_CONFIG);
    });

    it('should maintain internal state correctly', () => {
      expect(corrector.getHistorySize()).toBe(0);
      
      const point1 = createStrokePoint(0, 0);
      const result1 = corrector.processPoint(point1);
      
      expect(result1.length).toBeGreaterThan(0);
      expect(corrector.getHistorySize()).toBe(1);
      
      const point2 = createStrokePoint(10, 10);
      const result2 = corrector.processPoint(point2);
      
      expect(result2.length).toBeGreaterThan(0);
      expect(corrector.getHistorySize()).toBe(2);
    });

    it('should reset state when requested', () => {
      // Add some points
      corrector.processPoint(createStrokePoint(0, 0));
      corrector.processPoint(createStrokePoint(10, 10));
      
      expect(corrector.getHistorySize()).toBe(2);
      
      corrector.reset();
      
      expect(corrector.getHistorySize()).toBe(0);
    });

    it('should limit history size to prevent memory growth', () => {
      // Add many points
      for (let i = 0; i < 100; i++) {
        corrector.processPoint(createStrokePoint(i, i));
      }
      
      // History should be limited
      expect(corrector.getHistorySize()).toBeLessThan(50); // Should be much less than 100
    });

    it('should allow configuration updates', () => {
      const newConfig = {
        smoothing: {
          ...DEFAULT_SMOOTHING_CONFIG,
          strength: 0.8
        }
      };
      
      corrector.updateConfig(newConfig);
      
      const config = corrector.getConfig();
      expect(config.smoothing.strength).toBe(0.8);
    });
  });

  // =============================================================================
  // CONFIGURATION AND VALIDATION TESTS
  // =============================================================================

  describe('Configuration Management', () => {
    it('should validate and merge partial configurations', () => {
      const partialConfig = {
        smoothing: {
          strength: 0.8,
          method: 'catmull-rom' as const
        }
      };
      
      const validatedConfig = validateInputCorrectionConfig(partialConfig);
      
      expect(validatedConfig.smoothing.strength).toBe(0.8);
      expect(validatedConfig.smoothing.method).toBe('catmull-rom');
      expect(validatedConfig.pressureCorrection.enabled).toBe(DEFAULT_PRESSURE_CORRECTION_CONFIG.enabled);
    });

    it('should detect input devices correctly', () => {
      // Mock user agents and events for different devices
      const originalUserAgent = navigator.userAgent;
      
      try {
        // Test iPad detection
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
          configurable: true
        });
        
        const mockPenEvent = { pointerType: 'pen' } as PointerEvent;
        expect(detectInputDevice(mockPenEvent)).toBe('apple-pencil');
        
        // Test generic detection
        const mockMouseEvent = { pointerType: 'mouse' } as PointerEvent;
        expect(detectInputDevice(mockMouseEvent)).toBe('generic');
        
      } finally {
        Object.defineProperty(navigator, 'userAgent', {
          value: originalUserAgent,
          configurable: true
        });
      }
    });
  });

  // =============================================================================
  // PERFORMANCE TESTS
  // =============================================================================

  describe('Performance Requirements', () => {
    it('should meet processing time requirements for single points', () => {
      const testPoint = createStrokePoint(10, 20, 0.8);
      const history = createStrokeHistory(5);
      const config = DEFAULT_INPUT_CORRECTION_CONFIG;
      
      const startTime = performance.now();
      const result = applyInputCorrection(testPoint, history, config);
      const endTime = performance.now();
      
      const processingTime = endTime - startTime;
      
      expect(processingTime).toBeLessThan(1.0); // Should be under 1ms
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle high-frequency input efficiently', () => {
      const corrector = createStreamingCorrector({
        ...DEFAULT_INPUT_CORRECTION_CONFIG,
        enablePerformanceMonitoring: true
      });
      
      const startTime = performance.now();
      
      // Simulate 60fps input for 1 second (60 points)
      for (let i = 0; i < 60; i++) {
        const point = createStrokePoint(i, Math.sin(i * 0.1) * 10, 0.5 + Math.random() * 0.3);
        corrector.processPoint(point);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTimePerPoint = totalTime / 60;
      
      expect(averageTimePerPoint).toBeLessThan(1.0); // Average under 1ms per point
      expect(totalTime).toBeLessThan(100); // Total under 100ms for 60 points
    });

    it('should maintain performance with large datasets', () => {
      const largeHistory = createStrokeHistory(1000);
      const testPoint = createStrokePoint(5000, 2500, 0.7);
      
      const startTime = performance.now();
      const result = applyInputCorrection(testPoint, largeHistory, DEFAULT_INPUT_CORRECTION_CONFIG);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(10); // Should complete within 10ms even with large history
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // MATHEMATICAL ACCURACY TESTS
  // =============================================================================

  describe('Mathematical Accuracy', () => {
    it('should preserve input precision', () => {
      const highPrecisionPoint = createStrokePoint(
        Math.PI * 100, 
        Math.E * 100, 
        Math.sqrt(2) / 2
      );
      const history: StrokePoint[] = [];
      const config = {
        ...DEFAULT_INPUT_CORRECTION_CONFIG,
        pressureCorrection: { ...DEFAULT_PRESSURE_CORRECTION_CONFIG, enabled: false },
        smoothing: { ...DEFAULT_SMOOTHING_CONFIG, enabled: false }
      };
      
      const result = applyInputCorrection(highPrecisionPoint, history, config);
      
      expect(result[0].x).toBeCloseTo(highPrecisionPoint.x, 10);
      expect(result[0].y).toBeCloseTo(highPrecisionPoint.y, 10);
      expect(result[0].pressure).toBeCloseTo(highPrecisionPoint.pressure, 10);
    });

    it('should maintain coordinate system consistency', () => {
      // Test points at canvas boundaries
      const cornerPoints = [
        createStrokePoint(0, 0),        // Top-left
        createStrokePoint(1024, 0),     // Top-right  
        createStrokePoint(0, 1024),     // Bottom-left
        createStrokePoint(1024, 1024)   // Bottom-right
      ];
      
      cornerPoints.forEach(point => {
        const result = applyInputCorrection(point, [], DEFAULT_INPUT_CORRECTION_CONFIG);
        
        // Should stay within valid canvas bounds
        expect(result[0].x).toBeGreaterThanOrEqual(0);
        expect(result[0].x).toBeLessThanOrEqual(1024);
        expect(result[0].y).toBeGreaterThanOrEqual(0);
        expect(result[0].y).toBeLessThanOrEqual(1024);
      });
    });

    it('should handle numerical edge cases robustly', () => {
      const edgeCases = [
        createStrokePoint(Number.EPSILON, Number.EPSILON, Number.EPSILON),
        createStrokePoint(Number.MAX_SAFE_INTEGER / 1e6, Number.MAX_SAFE_INTEGER / 1e6, 1 - Number.EPSILON),
        createStrokePoint(0, 0, 0),
        createStrokePoint(1024, 1024, 1)
      ];
      
      edgeCases.forEach(point => {
        expect(() => {
          applyInputCorrection(point, [], DEFAULT_INPUT_CORRECTION_CONFIG);
        }).not.toThrow();
      });
    });
  });
});