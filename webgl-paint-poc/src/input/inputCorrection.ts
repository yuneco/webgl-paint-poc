/**
 * Input Correction System for WebGL Symmetry Paint
 * 
 * This module implements pressure and smoothing correction features as pure functions.
 * Designed to be integrated into the existing input processing pipeline.
 */

import type { StrokePoint } from '../types/core';

/**
 * Base type for input correction functions
 * 
 * @param currentPoint Current input point to be corrected
 * @param strokeHistory Stroke history for temporal processing (ordered by timestamp)
 * @param config Correction-specific configuration object
 * @returns Array of corrected points (usually 1 point, sometimes 0 or multiple)
 */
export type InputCorrectionFunction<TConfig = unknown> = (
  currentPoint: StrokePoint,
  strokeHistory: StrokePoint[],
  config: TConfig
) => StrokePoint[];

/**
 * Pressure correction configuration
 */
export interface PressureCorrectionConfig {
  /** Enable pressure correction */
  enabled: boolean;
  /** Device-specific calibration curves (deviceName -> multiplier) */
  deviceCalibration: Record<string, number>;
  /** Number of historical points to use for temporal smoothing */
  smoothingWindow: number;
  /** Minimum pressure change to register (noise filtering) */
  minPressureChange: number;
  /** Fallback pressure value for non-pressure devices */
  fallbackPressure: number;
}

/**
 * Coordinate smoothing configuration
 */
export interface SmoothingConfig {
  /** Enable coordinate smoothing */
  enabled: boolean;
  /** Smoothing strength (0.0 = no smoothing, 1.0 = maximum smoothing) */
  strength: number;
  /** Smoothing method */
  method: 'linear' | 'catmull-rom';
  /** Enable real-time mode (prioritizes speed over quality) */
  realtimeMode: boolean;
  /** Minimum number of points required before smoothing starts */
  minPoints: number;
  /** Maximum allowed processing time per point (milliseconds) */
  maxProcessingTime: number;
}

/**
 * Combined input correction configuration
 */
export interface InputCorrectionConfig {
  /** Pressure correction settings */
  pressureCorrection: PressureCorrectionConfig;
  /** Coordinate smoothing settings */
  smoothing: SmoothingConfig;
  /** Performance monitoring enabled */
  enablePerformanceMonitoring: boolean;
}

/**
 * Performance metrics for correction operations
 */
export interface CorrectionPerformanceMetrics {
  /** Processing time for pressure correction (milliseconds) */
  pressureCorrectionTime: number;
  /** Processing time for smoothing (milliseconds) */
  smoothingTime: number;
  /** Total correction time (milliseconds) */
  totalTime: number;
  /** Number of points processed */
  pointsProcessed: number;
}

// Default configurations
export const DEFAULT_PRESSURE_CORRECTION_CONFIG: PressureCorrectionConfig = {
  enabled: true,
  deviceCalibration: {
    'apple-pencil': 1.0,
    'wacom': 0.8,
    'generic': 1.0,
  },
  smoothingWindow: 3,
  minPressureChange: 0.01,
  fallbackPressure: 0.5,
};

export const DEFAULT_SMOOTHING_CONFIG: SmoothingConfig = {
  enabled: true,
  strength: 0.3,
  method: 'linear',
  realtimeMode: true,
  minPoints: 2,
  maxProcessingTime: 1.0, // 1ms maximum per point
};

export const DEFAULT_INPUT_CORRECTION_CONFIG: InputCorrectionConfig = {
  pressureCorrection: DEFAULT_PRESSURE_CORRECTION_CONFIG,
  smoothing: DEFAULT_SMOOTHING_CONFIG,
  enablePerformanceMonitoring: false,
};

/**
 * Device detection for pressure calibration
 * 
 * @param pointerEvent Original pointer event
 * @returns Device identifier string
 */
export function detectInputDevice(pointerEvent?: PointerEvent): string {
  if (!pointerEvent) return 'generic';
  
  // Check for specific device patterns
  if (pointerEvent.pointerType === 'pen') {
    // Apple Pencil detection (iOS Safari)
    if (navigator.userAgent.includes('iPad') || navigator.userAgent.includes('iPhone')) {
      return 'apple-pencil';
    }
    // Wacom detection (rough heuristic)
    if (pointerEvent.pressure > 0 && pointerEvent.tiltX !== undefined) {
      return 'wacom';
    }
  }
  
  return 'generic';
}

/**
 * Validate input correction configuration
 * 
 * @param config Configuration to validate
 * @returns Validated configuration with defaults filled in
 */
export function validateInputCorrectionConfig(
  config: Partial<InputCorrectionConfig>
): InputCorrectionConfig {
  return {
    pressureCorrection: {
      ...DEFAULT_PRESSURE_CORRECTION_CONFIG,
      ...config.pressureCorrection,
    },
    smoothing: {
      ...DEFAULT_SMOOTHING_CONFIG,
      ...config.smoothing,
    },
    enablePerformanceMonitoring: config.enablePerformanceMonitoring ?? false,
  };
}