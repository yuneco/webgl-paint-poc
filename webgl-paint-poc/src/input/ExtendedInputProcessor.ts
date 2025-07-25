/**
 * Extended Input Processor with Correction Pipeline
 * 
 * This module extends the existing InputProcessor to include pressure correction
 * and coordinate smoothing capabilities while maintaining backward compatibility.
 */

import type { StrokePoint } from '../types/core';
import type { ViewTransformState } from '../types/coordinates';
import { 
  InputProcessor, 
  type InputProcessorConfig, 
  DEFAULT_INPUT_PROCESSOR_CONFIG,
  type NormalizedInputEvent,
  processInputEvent
} from './InputProcessor';
import type { InputEventCallback } from './InputEventHandler';
import { 
  type InputCorrectionConfig,
  DEFAULT_INPUT_CORRECTION_CONFIG,
  validateInputCorrectionConfig,
  detectInputDevice
} from './inputCorrection';
import { 
  applyInputCorrection,
  createStreamingCorrector,
  assessCorrectionQuality
} from './correctionPipeline';
import { coreStore } from '../store/coreStore';

/**
 * Extended configuration that includes correction settings
 */
export interface ExtendedInputProcessorConfig extends InputProcessorConfig {
  /** Input correction configuration */
  correction: InputCorrectionConfig;
  /** Enable correction quality monitoring */
  enableQualityMonitoring: boolean;
}

/**
 * Default extended configuration
 */
export const DEFAULT_EXTENDED_INPUT_PROCESSOR_CONFIG: ExtendedInputProcessorConfig = {
  ...DEFAULT_INPUT_PROCESSOR_CONFIG,
  correction: DEFAULT_INPUT_CORRECTION_CONFIG,
  enableQualityMonitoring: false,
};

/**
 * Extended Input Processor with correction capabilities
 */
export class ExtendedInputProcessor extends InputProcessor {
  private correctionConfig: InputCorrectionConfig;
  private streamingCorrector: ReturnType<typeof createStreamingCorrector>;
  private enableQualityMonitoring: boolean;
  private strokeHistory: StrokePoint[] = [];
  private correctionMetrics: {
    originalPoints: StrokePoint[];
    correctedPoints: StrokePoint[];
  } = { originalPoints: [], correctedPoints: [] };

  constructor(
    canvasElement: HTMLCanvasElement,
    viewTransform?: ViewTransformState,
    config: ExtendedInputProcessorConfig = DEFAULT_EXTENDED_INPUT_PROCESSOR_CONFIG
  ) {
    // Initialize base processor
    super(canvasElement, viewTransform, config);

    // Initialize correction system
    this.correctionConfig = validateInputCorrectionConfig(config.correction);
    this.enableQualityMonitoring = config.enableQualityMonitoring;
    this.streamingCorrector = createStreamingCorrector(this.correctionConfig);

    // Override the internal event handling to include corrections
    this.setupCorrectionPipeline();
  }

  /**
   * Update correction configuration
   */
  updateCorrectionConfig(config: Partial<InputCorrectionConfig>): void {
    this.correctionConfig = validateInputCorrectionConfig({
      ...this.correctionConfig,
      ...config
    });
    this.streamingCorrector.updateConfig(this.correctionConfig);
  }

  /**
   * Get current correction configuration
   */
  getCorrectionConfig(): InputCorrectionConfig {
    return { ...this.correctionConfig };
  }

  /**
   * Enable or disable specific correction features
   */
  enablePressureCorrection(enabled: boolean): void {
    this.updateCorrectionConfig({
      pressureCorrection: {
        ...this.correctionConfig.pressureCorrection,
        enabled
      }
    });
  }

  enableSmoothing(enabled: boolean): void {
    this.updateCorrectionConfig({
      smoothing: {
        ...this.correctionConfig.smoothing,
        enabled
      }
    });
  }

  /**
   * Set smoothing strength (0.0 - 1.0)
   */
  setSmoothingStrength(strength: number): void {
    this.updateCorrectionConfig({
      smoothing: {
        ...this.correctionConfig.smoothing,
        strength: Math.max(0, Math.min(1, strength))
      }
    });
  }

  /**
   * Set smoothing method
   */
  setSmoothingMethod(method: 'linear' | 'catmull-rom'): void {
    this.updateCorrectionConfig({
      smoothing: {
        ...this.correctionConfig.smoothing,
        method
      }
    });
  }

  /**
   * Toggle real-time mode for smoothing
   */
  setRealtimeMode(enabled: boolean): void {
    this.updateCorrectionConfig({
      smoothing: {
        ...this.correctionConfig.smoothing,
        realtimeMode: enabled
      }
    });
  }

  /**
   * Get correction quality metrics
   */
  getCorrectionQualityMetrics() {
    if (!this.enableQualityMonitoring) {
      return null;
    }

    return assessCorrectionQuality(
      this.correctionMetrics.originalPoints,
      this.correctionMetrics.correctedPoints
    );
  }

  /**
   * Get performance metrics for all correction operations
   */
  getCorrectionPerformanceMetrics() {
    return {
      pressureCorrection: (window as any).__pressureCorrectionMetrics,
      smoothing: (window as any).__smoothingMetrics,
      pipeline: (window as any).__correctionPipelineMetrics,
    };
  }

  /**
   * Reset stroke tracking (call when starting a new stroke)
   */
  resetStroke(): void {
    this.streamingCorrector.reset();
    this.strokeHistory = [];
    if (this.enableQualityMonitoring) {
      this.correctionMetrics = { originalPoints: [], correctedPoints: [] };
    }
  }

  /**
   * Get extended statistics including correction info
   */
  getExtendedStats() {
    const baseStats = super.getStats();
    
    return {
      ...baseStats,
      correction: {
        historySize: this.streamingCorrector.getHistorySize(),
        pressureCorrectionEnabled: this.correctionConfig.pressureCorrection.enabled,
        smoothingEnabled: this.correctionConfig.smoothing.enabled,
        smoothingMethod: this.correctionConfig.smoothing.method,
        smoothingStrength: this.correctionConfig.smoothing.strength,
        realtimeMode: this.correctionConfig.smoothing.realtimeMode,
        qualityMetrics: this.getCorrectionQualityMetrics(),
        performanceMetrics: this.getCorrectionPerformanceMetrics(),
      }
    };
  }

  /**
   * Override destroy to clean up correction resources
   */
  destroy(): void {
    super.destroy();
    this.resetStroke();
    
    // Clear performance monitoring data
    if (typeof window !== 'undefined') {
      delete (window as any).__pressureCorrectionMetrics;
      delete (window as any).__smoothingMetrics;
      delete (window as any).__correctionPipelineMetrics;
    }
  }

  /**
   * Setup the correction pipeline integration
   */
  private setupCorrectionPipeline(): void {
    // Get the original callback
    const originalCallback = (this as any).finalCallback;

    // Override the internal event processing
    const originalHandleRawInputEvent = (this as any).handleRawInputEvent.bind(this);
    
    (this as any).handleRawInputEvent = (event: NormalizedInputEvent) => {
      // Convert NormalizedInputEvent to StrokePoint for correction
      const strokePoint: StrokePoint = {
        x: event.position.canvasX,
        y: event.position.canvasY,
        pressure: event.pressure,
        timestamp: event.timestamp,
      };

      // Store original point for quality monitoring
      if (this.enableQualityMonitoring) {
        this.correctionMetrics.originalPoints.push(strokePoint);
      }

      // Apply corrections
      const correctedPoints = this.streamingCorrector.processPoint(strokePoint);

      // Store corrected points for quality monitoring
      if (this.enableQualityMonitoring) {
        this.correctionMetrics.correctedPoints.push(...correctedPoints);
      }

      // Process each corrected point through the original pipeline
      for (const correctedPoint of correctedPoints) {
        // Convert back to NormalizedInputEvent format
        const correctedEvent: NormalizedInputEvent = {
          ...event,
          position: {
            ...event.position,
            canvasX: correctedPoint.x,
            canvasY: correctedPoint.y,
          },
          pressure: correctedPoint.pressure,
          timestamp: correctedPoint.timestamp,
        };

        // Continue with original processing (throttling, filtering, etc.)
        this.processCorrectedEvent(correctedEvent);
      }
    };
  }

  /**
   * Process a corrected event through the remaining pipeline
   */
  private processCorrectedEvent(event: NormalizedInputEvent): void {
    // Apply the original input processing (filtering, etc.)
    const processedEvent = processInputEvent(event, this.getConfig());
    
    if (processedEvent) {
      // Update store state
      coreStore.getState().updateLastEvent(processedEvent);
      coreStore.getState().incrementEventCount();
      
      // Call the final callback
      const finalCallback = (this as any).finalCallback;
      finalCallback?.(processedEvent);
    }
  }

  /**
   * Factory method to create an extended processor with device-specific optimizations
   */
  static createWithDeviceOptimization(
    canvasElement: HTMLCanvasElement,
    pointerEvent?: PointerEvent,
    viewTransform?: ViewTransformState,
    baseConfig: Partial<ExtendedInputProcessorConfig> = {}
  ): ExtendedInputProcessor {
    const deviceId = detectInputDevice(pointerEvent);
    
    // Device-specific optimizations
    const deviceOptimizations: Record<string, Partial<InputCorrectionConfig>> = {
      'apple-pencil': {
        pressureCorrection: {
          enabled: true,
          smoothingWindow: 2,
          minPressureChange: 0.005,
        },
        smoothing: {
          enabled: true,
          strength: 0.2,
          method: 'linear',
          realtimeMode: true,
        }
      },
      'wacom': {
        pressureCorrection: {
          enabled: true,
          smoothingWindow: 4,
          minPressureChange: 0.02,
        },
        smoothing: {
          enabled: true,
          strength: 0.4,
          method: 'catmull-rom',
          realtimeMode: false,
        }
      },
      'generic': {
        pressureCorrection: {
          enabled: false, // Most generic devices don't have reliable pressure
        },
        smoothing: {
          enabled: true,
          strength: 0.3,
          method: 'linear',
          realtimeMode: true,
        }
      }
    };

    const deviceConfig = deviceOptimizations[deviceId] || deviceOptimizations.generic;
    
    const config: ExtendedInputProcessorConfig = {
      ...DEFAULT_EXTENDED_INPUT_PROCESSOR_CONFIG,
      ...baseConfig,
      correction: {
        ...DEFAULT_INPUT_CORRECTION_CONFIG,
        ...deviceConfig,
        ...baseConfig.correction,
      }
    };

    return new ExtendedInputProcessor(canvasElement, viewTransform, config);
  }
}