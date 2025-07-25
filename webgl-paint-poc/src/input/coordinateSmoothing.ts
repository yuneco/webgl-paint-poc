/**
 * Coordinate Smoothing System
 * 
 * This module implements coordinate smoothing using various algorithms
 * to reduce input jitter and create natural-looking strokes.
 */

import type { StrokePoint } from '../types/core';
import type { 
  InputCorrectionFunction, 
  SmoothingConfig 
} from './inputCorrection';
import {
  pointToVector,
  vectorToPoint,
  catmullRomSpline,
  catmullRomSegmentRealtime,
  linearSmoothing,
  adaptiveSmoothing,
  type Vector2D
} from '../math/splineUtils';

/**
 * Apply coordinate smoothing to input points
 * 
 * This is the main smoothing function that chooses the appropriate algorithm
 * based on configuration and performance constraints.
 * 
 * @param currentPoint Current input point
 * @param strokeHistory Previous points for context
 * @param config Smoothing configuration
 * @returns Array of smoothed points (may be empty, single, or multiple points)
 */
export const applyCoordinateSmoothing: InputCorrectionFunction<SmoothingConfig> = (
  currentPoint: StrokePoint,
  strokeHistory: StrokePoint[],
  config: SmoothingConfig
): StrokePoint[] => {
  if (!config.enabled || config.strength <= 0) {
    return [currentPoint];
  }

  const startTime = performance.now();

  // Combine history with current point for processing
  const allPoints = [...strokeHistory, currentPoint];

  // Check minimum points requirement
  if (allPoints.length < config.minPoints) {
    return [currentPoint];
  }

  let smoothedPoints: StrokePoint[];

  try {
    if (config.realtimeMode) {
      // Real-time mode: prioritize speed
      smoothedPoints = applySmoothingRealtime(allPoints, config);
    } else {
      // Quality mode: prioritize smooth curves
      smoothedPoints = applySmoothingQuality(allPoints, config);
    }

    const processingTime = performance.now() - startTime;
    
    // If processing took too long, fall back to simpler method
    if (processingTime > config.maxProcessingTime) {
      smoothedPoints = applySmoothingFast(allPoints, config);
    }

    // Return only new points (excluding the history points we already processed)
    const newPointsCount = smoothedPoints.length - strokeHistory.length;
    return newPointsCount > 0 ? smoothedPoints.slice(-newPointsCount) : [currentPoint];

  } catch (error) {
    console.warn('Smoothing failed, returning original point:', error);
    return [currentPoint];
  }
};

/**
 * Apply real-time smoothing optimized for minimal latency
 * 
 * @param points All points including history
 * @param config Smoothing configuration
 * @returns Smoothed points
 */
function applySmoothingRealtime(
  points: StrokePoint[],
  config: SmoothingConfig
): StrokePoint[] {
  if (config.method === 'linear' || points.length < 4) {
    return applyLinearSmoothingOptimized(points, config);
  }

  // Use lightweight Catmull-Rom for real-time
  return applyCatmullRomRealtime(points, config);
}

/**
 * Apply high-quality smoothing for detailed work
 * 
 * @param points All points including history  
 * @param config Smoothing configuration
 * @returns Smoothed points
 */
function applySmoothingQuality(
  points: StrokePoint[],
  config: SmoothingConfig
): StrokePoint[] {
  if (config.method === 'linear') {
    return applyLinearSmoothingOptimized(points, config);
  }

  // Use full Catmull-Rom with higher resolution
  return applyCatmullRomQuality(points, config);
}

/**
 * Apply fast fallback smoothing when performance is critical
 * 
 * @param points All points including history
 * @param config Smoothing configuration  
 * @returns Smoothed points
 */
function applySmoothingFast(
  points: StrokePoint[],
  config: SmoothingConfig
): StrokePoint[] {
  // Simple 3-point smoothing for emergency fallback
  if (points.length < 3) {
    return [...points];
  }

  const smoothed = [...points];
  const lastIndex = smoothed.length - 1;

  // Only smooth the most recent point
  if (lastIndex >= 2) {
    const prev = points[lastIndex - 2];
    const curr = points[lastIndex - 1];
    const next = points[lastIndex];

    // Simple weighted average
    const weight = config.strength * 0.3; // Reduced strength for fast mode
    smoothed[lastIndex - 1] = {
      ...curr,
      x: curr.x + (prev.x + next.x - 2 * curr.x) * weight,
      y: curr.y + (prev.y + next.y - 2 * curr.y) * weight,
    };
  }

  return smoothed;
}

/**
 * Apply optimized linear smoothing
 * 
 * @param points Points to smooth
 * @param config Smoothing configuration
 * @returns Smoothed points
 */
function applyLinearSmoothingOptimized(
  points: StrokePoint[],
  config: SmoothingConfig
): StrokePoint[] {
  if (points.length < 2) {
    return [...points];
  }

  const vectors = points.map(pointToVector);
  const smoothedVectors = linearSmoothing(vectors, config.strength);

  return smoothedVectors.map((vector, i) => 
    vectorToPoint(vector, points[i].pressure, points[i].timestamp)
  );
}

/**
 * Apply real-time Catmull-Rom smoothing
 * 
 * @param points Points to smooth
 * @param config Smoothing configuration
 * @returns Smoothed points
 */
function applyCatmullRomRealtime(
  points: StrokePoint[],
  config: SmoothingConfig
): StrokePoint[] {
  if (points.length < 4) {
    return applyLinearSmoothingOptimized(points, config);
  }

  const vectors = points.map(pointToVector);
  
  // Generate only 1-2 interpolated points for the latest segment
  const resolution = config.realtimeMode ? 1 : 2;
  const newSegmentPoints = catmullRomSegmentRealtime(vectors, resolution);

  if (newSegmentPoints.length === 0) {
    return [...points];
  }

  // Convert back to StrokePoints, interpolating pressure and timestamp
  const result = [...points];
  const lastIndex = points.length - 1;
  const prevPoint = points[lastIndex - 1];
  const currentPoint = points[lastIndex];

  newSegmentPoints.forEach((vector, i) => {
    const t = (i + 1) / (newSegmentPoints.length + 1);
    const interpolatedPressure = prevPoint.pressure + (currentPoint.pressure - prevPoint.pressure) * t;
    const interpolatedTimestamp = prevPoint.timestamp + (currentPoint.timestamp - prevPoint.timestamp) * t;

    result.splice(lastIndex + i, 0, vectorToPoint(vector, interpolatedPressure, interpolatedTimestamp));
  });

  return result;
}

/**
 * Apply high-quality Catmull-Rom smoothing
 * 
 * @param points Points to smooth
 * @param config Smoothing configuration
 * @returns Smoothed points
 */
function applyCatmullRomQuality(
  points: StrokePoint[],
  config: SmoothingConfig
): StrokePoint[] {
  if (points.length < 4) {
    return applyLinearSmoothingOptimized(points, config);
  }

  const vectors = points.map(pointToVector);
  const resolution = Math.max(2, Math.floor(4 * config.strength));
  const smoothedVectors = catmullRomSpline(vectors, resolution);

  // Map back to StrokePoints with interpolated pressure and timestamp
  return smoothedVectors.map((vector, i) => {
    const originalIndex = Math.min(
      Math.floor(i * points.length / smoothedVectors.length), 
      points.length - 1
    );
    const originalPoint = points[originalIndex];

    return vectorToPoint(vector, originalPoint.pressure, originalPoint.timestamp);
  });
}

/**
 * Adaptive smoothing that automatically chooses the best method
 * 
 * @param currentPoint Current input point
 * @param strokeHistory Previous points
 * @param config Smoothing configuration
 * @returns Smoothed points using adaptive algorithm
 */
export const applyAdaptiveSmoothing: InputCorrectionFunction<SmoothingConfig> = (
  currentPoint: StrokePoint,
  strokeHistory: StrokePoint[],
  config: SmoothingConfig
): StrokePoint[] => {
  if (!config.enabled) {
    return [currentPoint];
  }

  const allPoints = [...strokeHistory, currentPoint];
  const smoothedPoints = adaptiveSmoothing(allPoints, config.maxProcessingTime);

  // Return only the new points
  const newPointsCount = smoothedPoints.length - strokeHistory.length;
  return newPointsCount > 0 ? smoothedPoints.slice(-newPointsCount) : [currentPoint];
};

/**
 * Preserve edges and corners during smoothing
 * 
 * Detects sharp angles and reduces smoothing strength to preserve intentional corners.
 * 
 * @param points Points to analyze
 * @param config Smoothing configuration
 * @returns Points with edge-preserving smoothing applied
 */
export function preserveEdges(
  points: StrokePoint[],
  config: SmoothingConfig
): StrokePoint[] {
  if (points.length < 3) {
    return [...points];
  }

  const result = [...points];
  const angleThreshold = Math.PI / 3; // 60 degrees

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Calculate angle at current point
    const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
    let angleDiff = Math.abs(angle2 - angle1);
    
    // Normalize angle difference
    if (angleDiff > Math.PI) {
      angleDiff = 2 * Math.PI - angleDiff;
    }

    // Reduce smoothing for sharp corners
    if (angleDiff > angleThreshold) {
      const edgePreservationFactor = 1 - (angleDiff - angleThreshold) / (Math.PI - angleThreshold);
      const adjustedStrength = config.strength * edgePreservationFactor;

      // Apply reduced smoothing to this point
      const tempConfig = { ...config, strength: adjustedStrength };
      const smoothed = applyLinearSmoothingOptimized([prev, curr, next], tempConfig);
      
      if (smoothed.length >= 2) {
        result[i] = smoothed[1];
      }
    }
  }

  return result;
}

/**
 * Performance monitoring wrapper for coordinate smoothing
 * 
 * @param smoothingFunction Function to monitor
 * @returns Wrapped function that collects performance metrics
 */
export function withSmoothingMonitoring(
  smoothingFunction: InputCorrectionFunction<SmoothingConfig>
): InputCorrectionFunction<SmoothingConfig> {
  return (currentPoint, strokeHistory, config) => {
    const startTime = performance.now();
    
    const result = smoothingFunction(currentPoint, strokeHistory, config);
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Store metrics for debugging
    if (typeof window !== 'undefined') {
      (window as any).__smoothingMetrics = {
        lastProcessingTime: processingTime,
        averageProcessingTime: 
          ((window as any).__smoothingMetrics?.averageProcessingTime || 0) * 0.9 + 
          processingTime * 0.1,
        totalCalls: ((window as any).__smoothingMetrics?.totalCalls || 0) + 1,
        method: config.method,
        strength: config.strength,
      };
    }

    return result;
  };
}