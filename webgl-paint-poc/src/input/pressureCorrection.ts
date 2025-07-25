/**
 * Pressure Correction System
 * 
 * This module implements pressure value detection, normalization, and temporal smoothing
 * for consistent pressure response across different input devices.
 */

import type { StrokePoint } from '../types/core';
import type { 
  InputCorrectionFunction, 
  PressureCorrectionConfig,
  CorrectionPerformanceMetrics 
} from './inputCorrection';

/**
 * Correct and normalize pressure values
 * 
 * This is the main pressure correction function that applies device calibration,
 * temporal smoothing, and normalization to ensure consistent pressure behavior.
 * 
 * @param currentPoint Current input point
 * @param strokeHistory Previous points for temporal smoothing
 * @param config Pressure correction configuration
 * @returns Array containing the corrected point
 */
export const correctPressure: InputCorrectionFunction<PressureCorrectionConfig> = (
  currentPoint: StrokePoint,
  strokeHistory: StrokePoint[],
  config: PressureCorrectionConfig
): StrokePoint[] => {
  if (!config.enabled) {
    return [currentPoint];
  }

  // Start with raw pressure value
  let correctedPressure = currentPoint.pressure;

  // Apply device calibration
  correctedPressure = applyDeviceCalibration(correctedPressure, config);

  // Apply temporal smoothing if we have history
  if (strokeHistory.length > 0) {
    correctedPressure = applyTemporalSmoothing(
      correctedPressure,
      strokeHistory,
      config
    );
  }

  // Apply noise filtering
  correctedPressure = applyNoiseFiltering(
    correctedPressure,
    strokeHistory,
    config
  );

  // Ensure final normalization
  correctedPressure = normalizePressure(correctedPressure);

  return [{
    ...currentPoint,
    pressure: correctedPressure,
  }];
};

/**
 * Apply device-specific calibration to pressure value
 * 
 * Different input devices have different pressure response curves.
 * This function applies device-specific multipliers to normalize the response.
 * 
 * @param pressure Raw pressure value
 * @param config Pressure correction configuration
 * @returns Calibrated pressure value
 */
function applyDeviceCalibration(
  pressure: number,
  config: PressureCorrectionConfig
): number {
  // For non-pressure devices, use fallback value
  if (pressure === 0.5 || pressure <= 0) {
    return config.fallbackPressure;
  }

  // Apply generic calibration by default
  const calibrationMultiplier = config.deviceCalibration.generic || 1.0;
  
  return pressure * calibrationMultiplier;
}

/**
 * Apply temporal smoothing to reduce pressure jitter
 * 
 * Uses a sliding window average to smooth out rapid pressure fluctuations
 * while preserving intentional pressure changes.
 * 
 * @param currentPressure Current pressure value
 * @param strokeHistory Previous stroke points
 * @param config Pressure correction configuration
 * @returns Smoothed pressure value
 */
function applyTemporalSmoothing(
  currentPressure: number,
  strokeHistory: StrokePoint[],
  config: PressureCorrectionConfig
): number {
  const windowSize = Math.min(config.smoothingWindow, strokeHistory.length);
  if (windowSize === 0) {
    return currentPressure;
  }

  // Get recent pressure values
  const recentPoints = strokeHistory.slice(-windowSize);
  const recentPressures = recentPoints.map(p => p.pressure);
  
  // Calculate weighted average (more weight on recent values)
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (let i = 0; i < recentPressures.length; i++) {
    const weight = (i + 1) / recentPressures.length; // Linear weighting
    weightedSum += recentPressures[i] * weight;
    totalWeight += weight;
  }

  // Include current pressure with highest weight
  const currentWeight = 1.5;
  weightedSum += currentPressure * currentWeight;
  totalWeight += currentWeight;

  return weightedSum / totalWeight;
}

/**
 * Apply noise filtering to remove minor pressure fluctuations
 * 
 * Filters out pressure changes below a minimum threshold to reduce noise
 * while preserving intentional pressure variations.
 * 
 * @param currentPressure Current pressure value
 * @param strokeHistory Previous stroke points
 * @param config Pressure correction configuration
 * @returns Filtered pressure value
 */
function applyNoiseFiltering(
  currentPressure: number,
  strokeHistory: StrokePoint[],
  config: PressureCorrectionConfig
): number {
  if (strokeHistory.length === 0) {
    return currentPressure;
  }

  const lastPressure = strokeHistory[strokeHistory.length - 1].pressure;
  const pressureChange = Math.abs(currentPressure - lastPressure);

  // If change is below minimum threshold, keep previous value
  if (pressureChange < config.minPressureChange) {
    return lastPressure;
  }

  return currentPressure;
}

/**
 * Normalize pressure value to ensure 0.0-1.0 range
 * 
 * @param pressure Raw pressure value
 * @returns Normalized pressure value (0.0-1.0)
 */
function normalizePressure(pressure: number): number {
  return Math.max(0.0, Math.min(1.0, pressure));
}

/**
 * Detect pressure capability of input device
 * 
 * @param event Pointer event to analyze
 * @returns True if device supports pressure, false otherwise
 */
export function detectPressureCapability(event: PointerEvent): boolean {
  // Check if pressure is available and not the default fallback value
  return event.pressure !== undefined && 
         event.pressure > 0 && 
         event.pressure !== 0.5;
}

/**
 * Get device-specific configuration for pressure correction
 * 
 * @param deviceId Device identifier string
 * @param baseConfig Base pressure correction configuration
 * @returns Device-optimized configuration
 */
export function getDeviceSpecificConfig(
  deviceId: string,
  baseConfig: PressureCorrectionConfig
): PressureCorrectionConfig {
  const deviceConfigs: Record<string, Partial<PressureCorrectionConfig>> = {
    'apple-pencil': {
      deviceCalibration: { ...baseConfig.deviceCalibration, 'apple-pencil': 0.9 },
      smoothingWindow: 2, // Apple Pencil has good native smoothing
      minPressureChange: 0.005, // More sensitive to pressure changes
    },
    'wacom': {
      deviceCalibration: { ...baseConfig.deviceCalibration, 'wacom': 0.8 },
      smoothingWindow: 4, // Wacom can be jittery, more smoothing
      minPressureChange: 0.02, // Less sensitive to avoid noise
    },
    'generic': {
      fallbackPressure: 0.7, // Slightly higher default for generic devices
      smoothingWindow: 3,
    },
  };

  const deviceConfig = deviceConfigs[deviceId] || deviceConfigs.generic;
  
  return {
    ...baseConfig,
    ...deviceConfig,
  };
}

/**
 * Performance monitoring wrapper for pressure correction
 * 
 * @param correctionFunction Function to monitor
 * @returns Wrapped function that collects performance metrics
 */
export function withPressureCorrectionMonitoring(
  correctionFunction: InputCorrectionFunction<PressureCorrectionConfig>
): InputCorrectionFunction<PressureCorrectionConfig> {
  return (currentPoint, strokeHistory, config) => {
    const startTime = performance.now();
    
    const result = correctionFunction(currentPoint, strokeHistory, config);
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Store metrics for debugging (in a real implementation, this might go to a monitoring service)
    if (typeof window !== 'undefined') {
      (window as any).__pressureCorrectionMetrics = {
        lastProcessingTime: processingTime,
        averageProcessingTime: 
          ((window as any).__pressureCorrectionMetrics?.averageProcessingTime || 0) * 0.9 + 
          processingTime * 0.1,
        totalCalls: ((window as any).__pressureCorrectionMetrics?.totalCalls || 0) + 1,
      };
    }

    return result;
  };
}

/**
 * Batch pressure correction for multiple points
 * 
 * Efficient processing of multiple points at once, useful for processing
 * buffered input or historical data.
 * 
 * @param points Array of points to correct
 * @param config Pressure correction configuration  
 * @returns Array of corrected points
 */
export function correctPressureBatch(
  points: StrokePoint[],
  config: PressureCorrectionConfig
): StrokePoint[] {
  if (!config.enabled || points.length === 0) {
    return [...points];
  }

  const correctedPoints: StrokePoint[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const currentPoint = points[i];
    const history = correctedPoints; // Use already processed points as history
    
    const corrected = correctPressure(currentPoint, history, config);
    correctedPoints.push(...corrected);
  }

  return correctedPoints;
}