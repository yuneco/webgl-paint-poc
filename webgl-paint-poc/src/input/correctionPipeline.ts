/**
 * Input Correction Pipeline
 * 
 * This module integrates all correction functions into a unified pipeline
 * and provides the main interface for applying corrections to input events.
 */

import type { StrokePoint } from '../types/core';
import type { 
  InputCorrectionConfig,
  CorrectionPerformanceMetrics 
} from './inputCorrection';
import { correctPressure, withPressureCorrectionMonitoring } from './pressureCorrection';
import { 
  applyCoordinateSmoothing, 
  applyAdaptiveSmoothing,
  withSmoothingMonitoring 
} from './coordinateSmoothing';

/**
 * Apply the complete input correction pipeline
 * 
 * This is the main function that processes input points through all enabled
 * correction stages in the proper order.
 * 
 * @param currentPoint Current input point to process
 * @param strokeHistory Previous points for context
 * @param config Complete correction configuration
 * @returns Array of corrected points (may include interpolated points)
 */
export function applyInputCorrection(
  currentPoint: StrokePoint,
  strokeHistory: StrokePoint[],
  config: InputCorrectionConfig
): StrokePoint[] {
  const startTime = performance.now();
  let processedPoints = [currentPoint];
  
  try {
    // Stage 1: Pressure correction
    if (config.pressureCorrection.enabled) {
      const pressureCorrector = config.enablePerformanceMonitoring 
        ? withPressureCorrectionMonitoring(correctPressure)
        : correctPressure;
      
      processedPoints = pressureCorrector(
        processedPoints[0], 
        strokeHistory, 
        config.pressureCorrection
      );
    }

    // Stage 2: Coordinate smoothing
    if (config.smoothing.enabled && processedPoints.length > 0) {
      const smoother = config.enablePerformanceMonitoring
        ? withSmoothingMonitoring(applyCoordinateSmoothing)
        : applyCoordinateSmoothing;
      
      // Apply smoothing to the pressure-corrected point
      const smoothedPoints = smoother(
        processedPoints[0],
        strokeHistory,
        config.smoothing
      );

      processedPoints = smoothedPoints;
    }

    // Performance monitoring
    if (config.enablePerformanceMonitoring) {
      const totalTime = performance.now() - startTime;
      recordPipelineMetrics(totalTime, processedPoints.length);
    }

    return processedPoints;

  } catch (error) {
    console.warn('Input correction pipeline failed, returning original point:', error);
    return [currentPoint];
  }
}

/**
 * Apply corrections to a batch of points
 * 
 * Efficient processing of multiple points, useful for processing buffered
 * input or when catching up after performance issues.
 * 
 * @param points Array of points to process
 * @param config Correction configuration
 * @returns Array of corrected points
 */
export function applyInputCorrectionBatch(
  points: StrokePoint[],
  config: InputCorrectionConfig
): StrokePoint[] {
  if (points.length === 0) {
    return [];
  }

  const correctedPoints: StrokePoint[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const currentPoint = points[i];
    // Use previously corrected points plus original history as context
    const history = [...correctedPoints, ...points.slice(0, i)];
    
    const corrected = applyInputCorrection(currentPoint, history, config);
    correctedPoints.push(...corrected);
  }

  return correctedPoints;
}

/**
 * Create an optimized correction pipeline for streaming input
 * 
 * Returns a stateful processor that maintains stroke history internally
 * for better performance in real-time scenarios.
 * 
 * @param config Correction configuration
 * @returns Stateful correction processor
 */
export function createStreamingCorrector(config: InputCorrectionConfig) {
  let strokeHistory: StrokePoint[] = [];
  const maxHistorySize = Math.max(
    config.pressureCorrection.smoothingWindow,
    config.smoothing.minPoints,
    10 // Minimum reasonable history size
  );

  return {
    /**
     * Process a single point in the stream
     */
    processPoint(point: StrokePoint): StrokePoint[] {
      const corrected = applyInputCorrection(point, strokeHistory, config);
      
      // Update history with the original point (not corrected)
      strokeHistory.push(point);
      
      // Trim history to prevent memory growth
      if (strokeHistory.length > maxHistorySize) {
        strokeHistory = strokeHistory.slice(-maxHistorySize);
      }
      
      return corrected;
    },

    /**
     * Reset the history (e.g., when starting a new stroke)
     */
    reset(): void {
      strokeHistory = [];
    },

    /**
     * Get current history size
     */
    getHistorySize(): number {
      return strokeHistory.length;
    },

    /**
     * Get configuration
     */
    getConfig(): InputCorrectionConfig {
      return { ...config };
    },

    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<InputCorrectionConfig>): void {
      Object.assign(config, newConfig);
    }
  };
}

/**
 * Quality assessment for correction results
 * 
 * Provides metrics to evaluate the effectiveness of correction algorithms.
 * 
 * @param originalPoints Original input points
 * @param correctedPoints Corrected output points
 * @returns Quality metrics
 */
export function assessCorrectionQuality(
  originalPoints: StrokePoint[],
  correctedPoints: StrokePoint[]
): {
  smoothnessImprovement: number;
  pressureStability: number;
  dataFidelity: number;
  processingRatio: number;
} {
  if (originalPoints.length === 0) {
    return {
      smoothnessImprovement: 0,
      pressureStability: 0,
      dataFidelity: 0,
      processingRatio: 0,
    };
  }

  // Calculate smoothness (inverse of total path curvature)
  const originalSmoothness = calculateSmoothness(originalPoints);
  const correctedSmoothness = calculateSmoothness(correctedPoints);
  const smoothnessImprovement = originalSmoothness > 0 
    ? (correctedSmoothness - originalSmoothness) / originalSmoothness 
    : 0;

  // Calculate pressure stability (inverse of pressure variation)
  const originalPressureVariation = calculatePressureVariation(originalPoints);
  const correctedPressureVariation = calculatePressureVariation(correctedPoints);
  const pressureStability = originalPressureVariation > 0
    ? 1 - (correctedPressureVariation / originalPressureVariation)
    : 0;

  // Calculate data fidelity (how much the shape is preserved)
  const dataFidelity = calculatePathSimilarity(originalPoints, correctedPoints);

  // Processing ratio (output points / input points)
  const processingRatio = correctedPoints.length / originalPoints.length;

  return {
    smoothnessImprovement,
    pressureStability,
    dataFidelity,
    processingRatio,
  };
}

/**
 * Calculate path smoothness metric
 */
function calculateSmoothness(points: StrokePoint[]): number {
  if (points.length < 3) return 1;

  let totalCurvature = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Calculate angles
    const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
    
    let angleDiff = Math.abs(angle2 - angle1);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    
    totalCurvature += angleDiff;
  }

  return 1 / (1 + totalCurvature / points.length);
}

/**
 * Calculate pressure variation
 */
function calculatePressureVariation(points: StrokePoint[]): number {
  if (points.length < 2) return 0;

  const pressures = points.map(p => p.pressure);
  const mean = pressures.reduce((sum, p) => sum + p, 0) / pressures.length;
  const variance = pressures.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / pressures.length;
  
  return Math.sqrt(variance);
}

/**
 * Calculate path similarity between original and corrected points
 */
function calculatePathSimilarity(original: StrokePoint[], corrected: StrokePoint[]): number {
  if (original.length === 0 || corrected.length === 0) return 0;

  // Sample points at regular intervals for comparison
  const sampleCount = Math.min(original.length, corrected.length, 20);
  let totalDistance = 0;

  for (let i = 0; i < sampleCount; i++) {
    const originalIndex = Math.floor(i * original.length / sampleCount);
    const correctedIndex = Math.floor(i * corrected.length / sampleCount);
    
    const orig = original[originalIndex];
    const corr = corrected[correctedIndex];
    
    const distance = Math.sqrt(
      Math.pow(orig.x - corr.x, 2) + 
      Math.pow(orig.y - corr.y, 2)
    );
    
    totalDistance += distance;
  }

  const averageDistance = totalDistance / sampleCount;
  
  // Convert to similarity score (0-1, where 1 is identical)
  const maxExpectedDistance = 50; // Pixels - adjust based on typical correction amounts
  return Math.max(0, 1 - averageDistance / maxExpectedDistance);
}

/**
 * Record pipeline performance metrics
 */
function recordPipelineMetrics(totalTime: number, pointsProcessed: number): void {
  if (typeof window !== 'undefined') {
    const metrics = (window as any).__correctionPipelineMetrics || {
      totalCalls: 0,
      totalTime: 0,
      totalPoints: 0,
    };

    metrics.totalCalls += 1;
    metrics.totalTime += totalTime;
    metrics.totalPoints += pointsProcessed;
    metrics.averageTimePerCall = metrics.totalTime / metrics.totalCalls;
    metrics.averageTimePerPoint = metrics.totalTime / metrics.totalPoints;
    metrics.lastCallTime = totalTime;
    metrics.lastPointCount = pointsProcessed;

    (window as any).__correctionPipelineMetrics = metrics;
  }
}