/**
 * Performance Monitoring Tests
 * 
 * Verifies that performance monitoring correctly tracks and reports
 * input delay metrics as required by Task 6.6.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  InputPerformanceMonitor,
  getGlobalPerformanceMonitor,
  measurePerformance,
  benchmark,
  InputCorrectionBenchmarkSuite,
  type InputPerformanceMetrics,
  type PerformanceStatistics
} from './performanceMonitoring';

describe('Performance Monitoring Tests', () => {

  // =============================================================================
  // INPUT PERFORMANCE MONITOR TESTS
  // =============================================================================

  describe('InputPerformanceMonitor', () => {
    let monitor: InputPerformanceMonitor;

    beforeEach(() => {
      monitor = new InputPerformanceMonitor(100, 16); // 100 history, 16ms target
    });

    it('should initialize with empty state', () => {
      const stats = monitor.getStatistics();
      
      expect(stats.measurementCount).toBe(0);
      expect(stats.totalPointsProcessed).toBe(0);
      expect(stats.averageInputDelay).toBe(0);
      expect(stats.targetViolations).toBe(0);
    });

    it('should record metrics correctly', () => {
      const inputEventTime = performance.now() - 10; // 10ms ago
      monitor.recordMetrics(inputEventTime, 2, 3, 5, 1);
      
      const stats = monitor.getStatistics();
      
      expect(stats.measurementCount).toBe(1);
      expect(stats.totalPointsProcessed).toBe(1);
      expect(stats.averageInputDelay).toBeCloseTo(10, 1);
      expect(stats.averageProcessingTime).toBe(5);
    });

    it('should calculate statistics correctly with multiple measurements', () => {
      const baseTime = performance.now();
      
      // Record several measurements with known delays
      monitor.recordMetrics(baseTime - 5, 1, 1, 2, 1);   // 5ms delay
      monitor.recordMetrics(baseTime - 10, 2, 2, 4, 1);  // 10ms delay
      monitor.recordMetrics(baseTime - 20, 3, 3, 6, 1);  // 20ms delay (violation)
      
      const stats = monitor.getStatistics();
      
      expect(stats.measurementCount).toBe(3);
      expect(stats.totalPointsProcessed).toBe(3);
      expect(stats.averageInputDelay).toBeCloseTo(11.67, 1);
      expect(stats.maxInputDelay).toBeCloseTo(20, 1);
      expect(stats.targetViolations).toBe(1); // Only the 20ms delay exceeds 16ms target
    });

    it('should limit history size correctly', () => {
      const smallMonitor = new InputPerformanceMonitor(3, 16);
      
      // Add more metrics than the limit
      for (let i = 0; i < 5; i++) {
        smallMonitor.recordMetrics(performance.now() - i, 1, 1, 2, 1);
      }
      
      const stats = smallMonitor.getStatistics();
      expect(stats.measurementCount).toBe(3); // Should be limited to 3
    });

    it('should detect performance acceptability correctly', () => {
      // Good performance scenario
      monitor.recordMetrics(performance.now() - 5, 0.5, 0.3, 0.8, 1);
      monitor.recordMetrics(performance.now() - 8, 0.4, 0.4, 0.8, 1);
      monitor.recordMetrics(performance.now() - 12, 0.6, 0.2, 0.8, 1);
      
      expect(monitor.isPerformanceAcceptable()).toBe(true);
      
      // Bad performance scenario  
      const badMonitor = new InputPerformanceMonitor(100, 16);
      badMonitor.recordMetrics(performance.now() - 25, 5, 5, 10, 1); // Way over target
      badMonitor.recordMetrics(performance.now() - 30, 6, 6, 12, 1);
      
      expect(badMonitor.isPerformanceAcceptable()).toBe(false);
    });

    it('should detect performance trends correctly', () => {
      const trendMonitor = new InputPerformanceMonitor(1000, 16);
      
      // Create improving trend (delays getting smaller)
      for (let i = 0; i < 200; i++) {
        const delay = i < 100 ? 15 - (i * 0.05) : 10 - ((i - 100) * 0.03); // Improving
        trendMonitor.recordMetrics(performance.now() - delay, 0.5, 0.5, 1, 1);
      }
      
      expect(trendMonitor.getPerformanceTrend()).toBe('improving');
      
      // Create degrading trend
      const degradingMonitor = new InputPerformanceMonitor(1000, 16);
      for (let i = 0; i < 200; i++) {
        const delay = i < 100 ? 5 + (i * 0.05) : 10 + ((i - 100) * 0.08); // Getting worse
        degradingMonitor.recordMetrics(performance.now() - delay, 0.5, 0.5, 1, 1);
      }
      
      expect(degradingMonitor.getPerformanceTrend()).toBe('degrading');
    });

    it('should generate meaningful performance reports', () => {
      // Add some test data
      monitor.recordMetrics(performance.now() - 12, 0.8, 0.9, 1.7, 1);
      monitor.recordMetrics(performance.now() - 8, 0.7, 0.8, 1.5, 1);
      monitor.recordMetrics(performance.now() - 18, 1.0, 1.2, 2.2, 1); // Slight violation
      
      const report = monitor.generateReport();
      
      expect(report).toContain('Input Performance Report');
      expect(report).toContain('Average:');
      expect(report).toContain('Maximum:');
      expect(report).toContain('Target violations:');
      expect(report).toContain('Recommendations:');
    });

    it('should reset state correctly', () => {
      monitor.recordMetrics(performance.now() - 10, 1, 1, 2, 1);
      expect(monitor.getStatistics().measurementCount).toBe(1);
      
      monitor.reset();
      expect(monitor.getStatistics().measurementCount).toBe(0);
      expect(monitor.getStatistics().totalPointsProcessed).toBe(0);
    });

    it('should export metrics correctly', () => {
      const inputTime = performance.now() - 10;
      monitor.recordMetrics(inputTime, 1, 2, 3, 1);
      
      const exported = monitor.exportMetrics();
      
      expect(exported).toHaveLength(1);
      expect(exported[0].pressureCorrectionTime).toBe(1);
      expect(exported[0].smoothingTime).toBe(2);
      expect(exported[0].totalCorrectionTime).toBe(3);
    });

    it('should handle edge cases gracefully', () => {
      // Test with zero measurements
      expect(monitor.getStatistics().measurementCount).toBe(0);
      expect(monitor.isPerformanceAcceptable()).toBe(true); // No data means no problems
      expect(monitor.getPerformanceTrend()).toBe('stable');
      
      // Test with extreme values
      monitor.recordMetrics(performance.now() - 1000, 0, 0, 0, 1); // Very high delay
      expect(() => monitor.getStatistics()).not.toThrow();
      expect(() => monitor.generateReport()).not.toThrow();
    });
  });

  // =============================================================================
  // GLOBAL MONITOR TESTS
  // =============================================================================

  describe('Global Performance Monitor', () => {
    it('should provide singleton instance', () => {
      const monitor1 = getGlobalPerformanceMonitor();
      const monitor2 = getGlobalPerformanceMonitor();
      
      expect(monitor1).toBe(monitor2); // Same instance
    });

    it('should persist data across calls', () => {
      const monitor = getGlobalPerformanceMonitor();
      monitor.reset(); // Start fresh
      
      monitor.recordMetrics(performance.now() - 10, 1, 1, 2, 1);
      
      const anotherReference = getGlobalPerformanceMonitor();
      expect(anotherReference.getStatistics().measurementCount).toBe(1);
    });
  });

  // =============================================================================
  // PERFORMANCE MEASUREMENT WRAPPER TESTS
  // =============================================================================

  describe('Performance Measurement Wrapper', () => {
    beforeEach(() => {
      // Clear any existing measurements
      if (typeof window !== 'undefined') {
        delete (window as any).__performanceMeasurements;
      }
    });

    it('should measure sync function performance', () => {
      const testFunction = (x: number, y: number) => x + y;
      const measuredFunction = measurePerformance(testFunction, 'addition');
      
      const result = measuredFunction(5, 3);
      
      expect(result).toBe(8);
      
      // Check if measurement was recorded (if in browser environment)
      if (typeof window !== 'undefined') {
        const measurements = (window as any).__performanceMeasurements;
        expect(measurements?.addition).toBeDefined();
        expect(measurements.addition.count).toBe(1);
      }
    });

    it('should measure async function performance', async () => {
      const asyncFunction = async (delay: number) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return 'done';
      };
      
      const measuredFunction = measurePerformance(asyncFunction, 'async-test');
      
      const result = await measuredFunction(10);
      
      expect(result).toBe('done');
      
      if (typeof window !== 'undefined') {
        const measurements = (window as any).__performanceMeasurements;
        expect(measurements?.['async-test']).toBeDefined();
      }
    });

    it('should handle function errors correctly', () => {
      const errorFunction = () => {
        throw new Error('Test error');
      };
      
      const measuredFunction = measurePerformance(errorFunction, 'error-test');
      
      expect(() => measuredFunction()).toThrow('Test error');
      
      // Should still record the measurement
      if (typeof window !== 'undefined') {
        const measurements = (window as any).__performanceMeasurements;
        expect(measurements?.['error-test']).toBeDefined();
      }
    });
  });

  // =============================================================================
  // BENCHMARK TESTS
  // =============================================================================

  describe('Benchmark Function', () => {
    it('should benchmark sync functions correctly', async () => {
      const testFunction = () => {
        // Simulate some work
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      };
      
      const result = await benchmark(testFunction, 10, 'sync-benchmark');
      
      expect(result.iterations).toBe(10);
      expect(result.averageTime).toBeGreaterThan(0);
      expect(result.minTime).toBeGreaterThan(0);
      expect(result.maxTime).toBeGreaterThanOrEqual(result.minTime);
      expect(result.totalTime).toBeCloseTo(result.averageTime * 10, 1);
    });

    it('should benchmark async functions correctly', async () => {
      const asyncFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return 'done';
      };
      
      const result = await benchmark(asyncFunction, 5, 'async-benchmark');
      
      expect(result.iterations).toBe(5);
      expect(result.averageTime).toBeGreaterThan(0);
    });

    it('should handle benchmark failures gracefully', async () => {
      let callCount = 0;
      const flakyFunction = () => {
        callCount++;
        if (callCount % 3 === 0) {
          throw new Error('Flaky error');
        }
        return 'success';
      };
      
      const result = await benchmark(flakyFunction, 10, 'flaky-benchmark');
      
      // Should still complete despite some failures
      expect(result.iterations).toBe(10);
      expect(result.averageTime).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // BENCHMARK SUITE TESTS
  // =============================================================================

  describe('Input Correction Benchmark Suite', () => {
    let suite: InputCorrectionBenchmarkSuite;

    beforeEach(() => {
      suite = new InputCorrectionBenchmarkSuite();
    });

    it('should run complete benchmark suite', async () => {
      // Note: This is an integration test that may take some time
      const results = await suite.runBenchmarkSuite();
      
      expect(results.pressureCorrection).toBeDefined();
      expect(results.smoothing).toBeDefined();
      expect(results.pipeline).toBeDefined();
      expect(results.overallPerformance).toBeDefined();
      
      // All components should have reasonable performance
      expect(results.pressureCorrection.averageTime).toBeLessThan(1); // Under 1ms
      expect(results.smoothing.averageTime).toBeLessThan(5); // Under 5ms  
      expect(results.pipeline.averageTime).toBeLessThan(10); // Under 10ms
      
      expect(results.overallPerformance.measurementCount).toBeGreaterThan(0);
    }, 30000); // Increase timeout for benchmark suite

    it('should perform stress testing', async () => {
      const results = await suite.stressTest(1000); // 1 second test
      
      expect(results.measurementCount).toBeGreaterThan(10); // Should process many iterations
      expect(results.averageInputDelay).toBeGreaterThanOrEqual(0);
      expect(results.maxInputDelay).toBeGreaterThanOrEqual(results.averageInputDelay);
    }, 10000); // Increase timeout for stress test
  });

  // =============================================================================
  // PERFORMANCE TARGET VALIDATION TESTS
  // =============================================================================

  describe('Performance Target Validation', () => {
    it('should validate Task 6.6 requirements', () => {
      const monitor = new InputPerformanceMonitor(1000, 16);
      
      // Simulate good performance that meets requirements
      for (let i = 0; i < 100; i++) {
        // Input delays under 16ms, processing under 1ms
        const delay = 8 + Math.random() * 6; // 8-14ms delays
        const processingTime = 0.3 + Math.random() * 0.4; // 0.3-0.7ms processing
        
        monitor.recordMetrics(
          performance.now() - delay,
          processingTime * 0.4, // Pressure correction
          processingTime * 0.6, // Smoothing
          processingTime,
          1
        );
      }
      
      const stats = monitor.getStatistics();
      
      // Verify Task 6.6 requirements
      expect(stats.averageInputDelay).toBeLessThan(16); // Under 16ms target
      expect(stats.averageProcessingTime).toBeLessThan(1); // Under 1ms per point
      expect(stats.targetViolations / stats.measurementCount).toBeLessThan(0.05); // Less than 5% violations
      
      expect(monitor.isPerformanceAcceptable()).toBe(true);
    });

    it('should identify performance violations correctly', () => {
      const monitor = new InputPerformanceMonitor(100, 16);
      
      // Simulate performance that violates requirements
      for (let i = 0; i < 20; i++) {
        const delay = 20 + Math.random() * 10; // 20-30ms delays (over target)
        const processingTime = 2 + Math.random() * 2; // 2-4ms processing (over target)
        
        monitor.recordMetrics(
          performance.now() - delay,
          processingTime * 0.5,
          processingTime * 0.5,
          processingTime,
          1
        );
      }
      
      const stats = monitor.getStatistics();
      
      expect(stats.averageInputDelay).toBeGreaterThan(16); // Over target
      expect(stats.averageProcessingTime).toBeGreaterThan(1); // Over target
      expect(stats.targetViolations).toBe(stats.measurementCount); // All violations
      
      expect(monitor.isPerformanceAcceptable()).toBe(false);
    });

    it('should handle mixed performance scenarios', () => {
      const monitor = new InputPerformanceMonitor(100, 16);
      
      // Mix of good and bad performance
      for (let i = 0; i < 100; i++) {
        let delay, processingTime;
        
        if (i < 90) {
          // 90% good performance
          delay = 8 + Math.random() * 6; // 8-14ms
          processingTime = 0.3 + Math.random() * 0.4; // 0.3-0.7ms
        } else {
          // 10% bad performance
          delay = 25 + Math.random() * 10; // 25-35ms
          processingTime = 1.5 + Math.random(); // 1.5-2.5ms
        }
        
        monitor.recordMetrics(
          performance.now() - delay,
          processingTime * 0.4,
          processingTime * 0.6,
          processingTime,
          1
        );
      }
      
      const stats = monitor.getStatistics();
      
      // Should still be acceptable overall (90% good performance)
      expect(stats.averageInputDelay).toBeLessThan(16);
      expect(stats.targetViolations / stats.measurementCount).toBeCloseTo(0.1, 1); // ~10% violations
      
      // But should show some violations
      expect(stats.targetViolations).toBeGreaterThan(0);
      expect(stats.maxInputDelay).toBeGreaterThan(16);
    });
  });

  // =============================================================================
  // INTEGRATION TESTS
  // =============================================================================

  describe('Integration with Input Correction System', () => {
    it('should integrate with actual correction functions', async () => {
      // Import the actual correction modules
      const { correctPressure } = await import('./pressureCorrection');
      const { applyCoordinateSmoothing } = await import('./coordinateSmoothing');
      const { DEFAULT_INPUT_CORRECTION_CONFIG } = await import('./inputCorrection');
      
      const monitor = new InputPerformanceMonitor();
      
      // Test with real correction functions
      const testPoint = { x: 100, y: 200, pressure: 0.7, timestamp: Date.now() };
      const testHistory = Array.from({ length: 5 }, (_, i) => ({
        x: i * 20,
        y: i * 10,
        pressure: 0.5 + i * 0.1,
        timestamp: Date.now() + i * 16
      }));
      
      // Measure actual performance
      const inputEventTime = performance.now();
      
      const pressureStartTime = performance.now();
      const pressureResult = correctPressure(
        testPoint, 
        testHistory, 
        DEFAULT_INPUT_CORRECTION_CONFIG.pressureCorrection
      );
      const pressureTime = performance.now() - pressureStartTime;
      
      const smoothingStartTime = performance.now();
      const smoothingResult = applyCoordinateSmoothing(
        testPoint,
        testHistory,
        DEFAULT_INPUT_CORRECTION_CONFIG.smoothing
      );
      const smoothingTime = performance.now() - smoothingStartTime;
      
      const totalTime = pressureTime + smoothingTime;
      
      monitor.recordMetrics(inputEventTime, pressureTime, smoothingTime, totalTime);
      
      const stats = monitor.getStatistics();
      
      // Verify results
      expect(pressureResult.length).toBeGreaterThan(0);
      expect(smoothingResult.length).toBeGreaterThan(0);
      expect(stats.measurementCount).toBe(1);
      expect(stats.averageProcessingTime).toBe(totalTime);
      
      // Performance should meet targets
      expect(stats.averageProcessingTime).toBeLessThan(5); // Should be well under 5ms
      expect(stats.averageInputDelay).toBeLessThan(50); // Should be reasonable
    });
  });
});