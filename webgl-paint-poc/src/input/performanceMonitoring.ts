/**
 * Performance Monitoring for Input Correction System
 * 
 * This module provides comprehensive performance monitoring capabilities
 * to ensure input delay stays under 16ms as required by Task 6.6.
 */

import type { StrokePoint } from '../types/core';

/**
 * Performance metrics for input processing
 */
export interface InputPerformanceMetrics {
  /** Input delay from event to processed result (milliseconds) */
  inputDelay: number;
  /** Processing time for pressure correction (milliseconds) */
  pressureCorrectionTime: number;
  /** Processing time for coordinate smoothing (milliseconds) */
  smoothingTime: number;
  /** Total correction pipeline time (milliseconds) */
  totalCorrectionTime: number;
  /** Points processed per second */
  throughput: number;
  /** Memory usage estimate (bytes) */
  memoryUsage: number;
  /** Timestamp when metrics were collected */
  timestamp: number;
}

/**
 * Aggregated performance statistics
 */
export interface PerformanceStatistics {
  /** Average input delay over the monitoring period */
  averageInputDelay: number;
  /** Maximum input delay observed */
  maxInputDelay: number;
  /** 95th percentile input delay */
  p95InputDelay: number;
  /** Average processing time */
  averageProcessingTime: number;
  /** Maximum processing time */
  maxProcessingTime: number;
  /** Total points processed */
  totalPointsProcessed: number;
  /** Monitoring period duration (milliseconds) */
  monitoringDuration: number;
  /** Number of measurements taken */
  measurementCount: number;
  /** Performance target violations (delays > 16ms) */
  targetViolations: number;
}

/**
 * Performance monitor for input correction system
 */
export class InputPerformanceMonitor {
  private metrics: InputPerformanceMetrics[] = [];
  private readonly maxHistorySize: number;
  private readonly targetDelay: number;
  private startTime: number;
  private pointsProcessed: number = 0;

  constructor(maxHistorySize: number = 1000, targetDelay: number = 16) {
    this.maxHistorySize = maxHistorySize;
    this.targetDelay = targetDelay;
    this.startTime = performance.now();
  }

  /**
   * Record performance metrics for a single input processing operation
   */
  recordMetrics(
    inputEventTime: number,
    pressureCorrectionTime: number,
    smoothingTime: number,
    totalCorrectionTime: number,
    pointsProcessed: number = 1
  ): void {
    const now = performance.now();
    const inputDelay = now - inputEventTime;

    const metrics: InputPerformanceMetrics = {
      inputDelay,
      pressureCorrectionTime,
      smoothingTime,
      totalCorrectionTime,
      throughput: pointsProcessed / (totalCorrectionTime / 1000),
      memoryUsage: this.estimateMemoryUsage(),
      timestamp: now,
    };

    this.metrics.push(metrics);
    this.pointsProcessed += pointsProcessed;

    // Trim history if it gets too large
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics = this.metrics.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get current performance statistics
   */
  getStatistics(): PerformanceStatistics {
    if (this.metrics.length === 0) {
      return this.createEmptyStatistics();
    }

    const delays = this.metrics.map(m => m.inputDelay);
    const processingTimes = this.metrics.map(m => m.totalCorrectionTime);
    const now = performance.now();

    // Sort delays for percentile calculation
    const sortedDelays = [...delays].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedDelays.length * 0.95);

    return {
      averageInputDelay: this.average(delays),
      maxInputDelay: Math.max(...delays),
      p95InputDelay: sortedDelays[p95Index] || 0,
      averageProcessingTime: this.average(processingTimes),
      maxProcessingTime: Math.max(...processingTimes),
      totalPointsProcessed: this.pointsProcessed,
      monitoringDuration: now - this.startTime,
      measurementCount: this.metrics.length,
      targetViolations: delays.filter(d => d > this.targetDelay).length,
    };
  }

  /**
   * Check if current performance meets targets
   */
  isPerformanceAcceptable(): boolean {
    const stats = this.getStatistics();
    
    // No data means no problems yet
    if (stats.measurementCount === 0) {
      return true;
    }
    
    // Requirements from Task 6.6:
    // - Input delay should be under 16ms
    // - Processing time per point should be under 1ms
    
    return (
      stats.averageInputDelay <= this.targetDelay &&
      stats.p95InputDelay <= this.targetDelay * 1.5 && // Allow some headroom for p95
      stats.averageProcessingTime <= 1.0 &&
      stats.targetViolations / stats.measurementCount < 0.05 // Less than 5% violations
    );
  }

  /**
   * Get recent performance trend
   */
  getPerformanceTrend(windowSize: number = 100): 'improving' | 'stable' | 'degrading' {
    if (this.metrics.length < windowSize * 2) {
      return 'stable';
    }

    const recent = this.metrics.slice(-windowSize);
    const older = this.metrics.slice(-windowSize * 2, -windowSize);

    const recentAvgDelay = this.average(recent.map(m => m.inputDelay));
    const olderAvgDelay = this.average(older.map(m => m.inputDelay));

    const threshold = 0.1; // 0.1ms threshold for trend detection

    if (recentAvgDelay < olderAvgDelay - threshold) {
      return 'improving';
    } else if (recentAvgDelay > olderAvgDelay + threshold) {
      return 'degrading';
    } else {
      return 'stable';
    }
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const stats = this.getStatistics();
    const trend = this.getPerformanceTrend();
    const acceptable = this.isPerformanceAcceptable();

    return `
Input Performance Report
========================
Status: ${acceptable ? '✅ GOOD' : '⚠️ NEEDS ATTENTION'}
Trend: ${trend.toUpperCase()}

Delay Metrics:
- Average: ${stats.averageInputDelay.toFixed(2)}ms
- Maximum: ${stats.maxInputDelay.toFixed(2)}ms
- 95th percentile: ${stats.p95InputDelay.toFixed(2)}ms
- Target violations: ${stats.targetViolations}/${stats.measurementCount} (${((stats.targetViolations / stats.measurementCount) * 100).toFixed(1)}%)

Processing Metrics:
- Average processing time: ${stats.averageProcessingTime.toFixed(2)}ms
- Maximum processing time: ${stats.maxProcessingTime.toFixed(2)}ms
- Total points processed: ${stats.totalPointsProcessed}
- Monitoring duration: ${(stats.monitoringDuration / 1000).toFixed(1)}s

Recommendations:
${this.generateRecommendations(stats)}
    `.trim();
  }

  /**
   * Reset monitoring state
   */
  reset(): void {
    this.metrics = [];
    this.pointsProcessed = 0;
    this.startTime = performance.now();
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(): InputPerformanceMetrics[] {
    return [...this.metrics];
  }

  private average(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : 0;
  }

  private estimateMemoryUsage(): number {
    // Rough estimate based on stored metrics
    const bytesPerMetric = 8 * 7; // 7 numbers per metric, 8 bytes each (assuming 64-bit)
    return this.metrics.length * bytesPerMetric;
  }

  private createEmptyStatistics(): PerformanceStatistics {
    return {
      averageInputDelay: 0,
      maxInputDelay: 0,
      p95InputDelay: 0,
      averageProcessingTime: 0,
      maxProcessingTime: 0,
      totalPointsProcessed: 0,
      monitoringDuration: 0,
      measurementCount: 0,
      targetViolations: 0,
    };
  }

  private generateRecommendations(stats: PerformanceStatistics): string {
    const recommendations: string[] = [];

    if (stats.averageInputDelay > this.targetDelay) {
      recommendations.push('- Reduce input delay: Consider lighter smoothing or real-time mode');
    }

    if (stats.targetViolations / stats.measurementCount > 0.05) {
      recommendations.push('- High violation rate: Check for blocking operations in pipeline');
    }

    if (stats.maxProcessingTime > 5) {
      recommendations.push('- High max processing time: Investigate worst-case scenarios');
    }

    if (recommendations.length === 0) {
      recommendations.push('- Performance is meeting targets');
    }

    return recommendations.join('\n');
  }
}

/**
 * Global performance monitor instance
 */
let globalMonitor: InputPerformanceMonitor | null = null;

/**
 * Get or create the global performance monitor
 */
export function getGlobalPerformanceMonitor(): InputPerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new InputPerformanceMonitor();
  }
  return globalMonitor;
}

/**
 * Performance measurement wrapper for functions
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  label: string
): T {
  return ((...args: Parameters<T>) => {
    const startTime = performance.now();
    
    try {
      const result = fn(...args);
      
      // Handle both sync and async functions
      if (result && typeof result.then === 'function') {
        return result.then((value: any) => {
          const endTime = performance.now();
          recordMeasurement(label, endTime - startTime);
          return value;
        });
      } else {
        const endTime = performance.now();
        recordMeasurement(label, endTime - startTime);
        return result;
      }
    } catch (error) {
      const endTime = performance.now();
      recordMeasurement(label, endTime - startTime);
      throw error;
    }
  }) as T;
}

/**
 * Record a performance measurement
 */
function recordMeasurement(label: string, duration: number): void {
  if (typeof window !== 'undefined') {
    const measurements = (window as any).__performanceMeasurements || {};
    
    if (!measurements[label]) {
      measurements[label] = {
        count: 0,
        totalTime: 0,
        maxTime: 0,
        minTime: Infinity,
      };
    }

    const measurement = measurements[label];
    measurement.count++;
    measurement.totalTime += duration;
    measurement.maxTime = Math.max(measurement.maxTime, duration);
    measurement.minTime = Math.min(measurement.minTime, duration);

    (window as any).__performanceMeasurements = measurements;
  }
}

/**
 * Benchmark a function multiple times
 */
export async function benchmark(
  fn: () => any,
  iterations: number = 100,
  label: string = 'benchmark'
): Promise<{
  averageTime: number;
  minTime: number;
  maxTime: number;
  totalTime: number;
  iterations: number;
}> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    
    try {
      const result = fn();
      
      // Handle async functions
      if (result && typeof result.then === 'function') {
        await result;
      }
    } catch (error) {
      // Continue benchmarking even if some calls fail
      console.warn(`Benchmark iteration ${i} failed:`, error);
    }

    const endTime = performance.now();
    const duration = Math.max(0.001, endTime - startTime); // Ensure minimum 0.001ms
    times.push(duration);
  }

  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const averageTime = times.length > 0 ? totalTime / times.length : 0;
  const minTime = times.length > 0 ? Math.min(...times) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 0;

  console.log(`Benchmark: ${label}`);
  console.log(`  Iterations: ${iterations}`);
  console.log(`  Average: ${averageTime.toFixed(3)}ms`);
  console.log(`  Min: ${minTime.toFixed(3)}ms`);
  console.log(`  Max: ${maxTime.toFixed(3)}ms`);
  console.log(`  Total: ${totalTime.toFixed(3)}ms`);

  return {
    averageTime,
    minTime,
    maxTime,
    totalTime,
    iterations,
  };
}

/**
 * Performance test suite for input correction system
 */
export class InputCorrectionBenchmarkSuite {
  private monitor: InputPerformanceMonitor;

  constructor() {
    this.monitor = new InputPerformanceMonitor();
  }

  /**
   * Run comprehensive benchmark of input correction system
   */
  async runBenchmarkSuite(): Promise<{
    pressureCorrection: any;
    smoothing: any;
    pipeline: any;
    overallPerformance: PerformanceStatistics;
  }> {
    console.log('Starting Input Correction Benchmark Suite...');

    // Import modules dynamically to avoid circular dependencies
    const { correctPressure } = await import('./pressureCorrection');
    const { applyCoordinateSmoothing } = await import('./coordinateSmoothing');
    const { applyInputCorrection } = await import('./correctionPipeline');
    const { DEFAULT_INPUT_CORRECTION_CONFIG } = await import('./inputCorrection');

    // Create test data
    const testPoint: StrokePoint = { x: 100, y: 200, pressure: 0.7, timestamp: Date.now() };
    const testHistory: StrokePoint[] = Array.from({ length: 10 }, (_, i) => ({
      x: i * 10,
      y: i * 5,
      pressure: 0.5 + i * 0.05,
      timestamp: Date.now() + i * 16
    }));

    // Benchmark individual components
    const pressureBenchmark = await benchmark(
      () => correctPressure(testPoint, testHistory, DEFAULT_INPUT_CORRECTION_CONFIG.pressureCorrection),
      1000,
      'Pressure Correction'
    );

    const smoothingBenchmark = await benchmark(
      () => applyCoordinateSmoothing(testPoint, testHistory, DEFAULT_INPUT_CORRECTION_CONFIG.smoothing),
      1000,
      'Coordinate Smoothing'
    );

    const pipelineBenchmark = await benchmark(
      () => applyInputCorrection(testPoint, testHistory, DEFAULT_INPUT_CORRECTION_CONFIG),
      1000,
      'Full Pipeline'
    );

    // Simulate realistic workload
    console.log('Running realistic workload simulation...');
    
    const workloadStartTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      const inputEventTime = performance.now();
      
      const pressureStartTime = performance.now();
      correctPressure(testPoint, testHistory, DEFAULT_INPUT_CORRECTION_CONFIG.pressureCorrection);
      const pressureTime = performance.now() - pressureStartTime;
      
      const smoothingStartTime = performance.now();
      applyCoordinateSmoothing(testPoint, testHistory, DEFAULT_INPUT_CORRECTION_CONFIG.smoothing);
      const smoothingTime = performance.now() - smoothingStartTime;
      
      const totalTime = pressureTime + smoothingTime;
      
      this.monitor.recordMetrics(inputEventTime, pressureTime, smoothingTime, totalTime);
    }

    const overallPerformance = this.monitor.getStatistics();

    console.log('Benchmark Suite Complete!');
    console.log(this.monitor.generateReport());

    return {
      pressureCorrection: pressureBenchmark,
      smoothing: smoothingBenchmark,
      pipeline: pipelineBenchmark,
      overallPerformance,
    };
  }

  /**
   * Test performance under stress conditions
   */
  async stressTest(duration: number = 5000): Promise<PerformanceStatistics> {
    console.log(`Starting stress test for ${duration}ms...`);

    const { applyInputCorrection } = await import('./correctionPipeline');
    const { DEFAULT_INPUT_CORRECTION_CONFIG } = await import('./inputCorrection');

    const stressMonitor = new InputPerformanceMonitor();
    const startTime = performance.now();
    let iterations = 0;

    while (performance.now() - startTime < duration) {
      const testPoint: StrokePoint = {
        x: Math.random() * 1024,
        y: Math.random() * 1024,
        pressure: Math.random(),
        timestamp: performance.now()
      };

      const testHistory: StrokePoint[] = Array.from({ length: 20 }, (_, i) => ({
        x: Math.random() * 1024,
        y: Math.random() * 1024,
        pressure: Math.random(),
        timestamp: performance.now() + i * 16
      }));

      const inputEventTime = performance.now();
      const processingStartTime = performance.now();
      
      try {
        applyInputCorrection(testPoint, testHistory, DEFAULT_INPUT_CORRECTION_CONFIG);
      } catch (error) {
        console.warn('Stress test iteration failed:', error);
      }

      const processingTime = performance.now() - processingStartTime;
      stressMonitor.recordMetrics(inputEventTime, 0, 0, processingTime);
      
      iterations++;
    }

    const stats = stressMonitor.getStatistics();
    console.log(`Stress test completed: ${iterations} iterations`);
    console.log(`Average delay: ${stats.averageInputDelay.toFixed(2)}ms`);
    console.log(`Max delay: ${stats.maxInputDelay.toFixed(2)}ms`);
    console.log(`Target violations: ${stats.targetViolations}/${stats.measurementCount}`);

    return stats;
  }
}