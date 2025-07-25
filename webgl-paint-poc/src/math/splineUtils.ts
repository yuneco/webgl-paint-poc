/**
 * Mathematical utilities for spline calculations
 * 
 * This module provides pure functions for various spline interpolation methods,
 * optimized for real-time input processing.
 */

import type { StrokePoint } from '../types/core';

/**
 * 2D Vector operations for spline calculations
 */
export interface Vector2D {
  x: number;
  y: number;
}

/**
 * Create a 2D vector from StrokePoint
 */
export function pointToVector(point: StrokePoint): Vector2D {
  return { x: point.x, y: point.y };
}

/**
 * Create StrokePoint from vector, preserving pressure and timestamp
 */
export function vectorToPoint(
  vector: Vector2D, 
  pressure: number, 
  timestamp: number
): StrokePoint {
  return {
    x: vector.x,
    y: vector.y,
    pressure,
    timestamp,
  };
}

/**
 * Linear interpolation between two vectors
 * 
 * @param a Start vector
 * @param b End vector  
 * @param t Interpolation parameter (0.0 to 1.0)
 * @returns Interpolated vector
 */
export function lerp(a: Vector2D, b: Vector2D, t: number): Vector2D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/**
 * Catmull-Rom spline interpolation for a single segment
 * 
 * Given four control points P0, P1, P2, P3, calculates the interpolated point
 * on the curve segment between P1 and P2 at parameter t.
 * 
 * @param p0 Control point 0 (before start)
 * @param p1 Control point 1 (segment start)
 * @param p2 Control point 2 (segment end)
 * @param p3 Control point 3 (after end)
 * @param t Interpolation parameter (0.0 to 1.0)
 * @returns Interpolated point on the curve
 */
export function catmullRomSegment(
  p0: Vector2D,
  p1: Vector2D, 
  p2: Vector2D,
  p3: Vector2D,
  t: number
): Vector2D {
  const t2 = t * t;
  const t3 = t2 * t;

  // Catmull-Rom basis functions
  const h00 = -0.5 * t3 + t2 - 0.5 * t;
  const h10 = 1.5 * t3 - 2.5 * t2 + 1.0;  
  const h01 = -1.5 * t3 + 2.0 * t2 + 0.5 * t;
  const h11 = 0.5 * t3 - 0.5 * t2;

  return {
    x: h00 * p0.x + h10 * p1.x + h01 * p2.x + h11 * p3.x,
    y: h00 * p0.y + h10 * p1.y + h01 * p2.y + h11 * p3.y,
  };
}

/**
 * Calculate Catmull-Rom spline for a sequence of points
 * 
 * @param points Input control points (minimum 4 points required)
 * @param resolution Number of interpolated points per segment
 * @returns Array of interpolated points
 */
export function catmullRomSpline(
  points: Vector2D[], 
  resolution: number = 4
): Vector2D[] {
  if (points.length < 4) {
    return [...points]; // Return original points if insufficient for spline
  }

  const result: Vector2D[] = [];
  
  // Process each segment (from point 1 to point n-2)
  for (let i = 1; i < points.length - 2; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1]; 
    const p3 = points[i + 2];

    // Generate interpolated points for this segment
    for (let j = 0; j < resolution; j++) {
      const t = j / resolution;
      const interpolated = catmullRomSegment(p0, p1, p2, p3, t);
      result.push(interpolated);
    }
  }

  // Always include the last point
  result.push(points[points.length - 1]);
  
  return result;
}

/**
 * Optimized Catmull-Rom spline for real-time processing
 * 
 * Only processes the most recent segment to minimize latency.
 * Suitable for streaming input where points are added incrementally.
 * 
 * @param points Input points (minimum 4 points)
 * @param resolution Number of points to generate for the latest segment
 * @returns Interpolated points for the most recent segment only
 */
export function catmullRomSegmentRealtime(
  points: Vector2D[],
  resolution: number = 2
): Vector2D[] {
  if (points.length < 4) {
    return [];
  }

  const n = points.length;
  const p0 = points[n - 4];
  const p1 = points[n - 3];
  const p2 = points[n - 2];
  const p3 = points[n - 1];

  const result: Vector2D[] = [];
  
  for (let i = 1; i <= resolution; i++) {
    const t = i / (resolution + 1);
    const interpolated = catmullRomSegment(p0, p1, p2, p3, t);
    result.push(interpolated);
  }

  return result;
}

/**
 * Linear smoothing with configurable strength
 * 
 * Applies simple linear interpolation between consecutive points.
 * Much faster than Catmull-Rom but produces less smooth curves.
 * 
 * @param points Input points
 * @param strength Smoothing strength (0.0 = no smoothing, 1.0 = maximum)
 * @returns Smoothed points
 */
export function linearSmoothing(
  points: Vector2D[],
  strength: number = 0.5
): Vector2D[] {
  if (points.length < 2 || strength <= 0) {
    return [...points];
  }

  const smoothed = [...points];
  
  // Apply smoothing from second point to second-to-last point
  for (let i = 1; i < smoothed.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    
    // Calculate average of neighbors
    const avg = {
      x: (prev.x + next.x) * 0.5,
      y: (prev.y + next.y) * 0.5,
    };
    
    // Interpolate between current point and average
    smoothed[i] = lerp(curr, avg, strength);
  }

  return smoothed;
}

/**
 * Calculate the length of a path defined by points
 * 
 * @param points Path points
 * @returns Total path length
 */
export function calculatePathLength(points: Vector2D[]): number {
  if (points.length < 2) return 0;

  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }

  return length;
}

/**
 * Adaptive smoothing that chooses method based on drawing speed
 * 
 * @param points Input points with timestamps
 * @param maxProcessingTime Maximum allowed processing time (ms)
 * @param fastThreshold Speed threshold for choosing linear vs Catmull-Rom
 * @returns Smoothed points using appropriate method
 */
export function adaptiveSmoothing(
  points: StrokePoint[],
  maxProcessingTime: number = 1.0,
  fastThreshold: number = 100 // pixels per second
): StrokePoint[] {
  if (points.length < 2) return [...points];

  const startTime = performance.now();
  
  // Calculate recent drawing speed
  const recentPoints = points.slice(-4);
  if (recentPoints.length >= 2) {
    const timeSpan = recentPoints[recentPoints.length - 1].timestamp - recentPoints[0].timestamp;
    const distance = calculatePathLength(recentPoints.map(pointToVector));
    const speed = timeSpan > 0 ? (distance / timeSpan) * 1000 : 0; // pixels per second
    
    // Use linear smoothing for fast drawing, Catmull-Rom for slow/detailed work
    if (speed > fastThreshold) {
      const vectors = points.map(pointToVector);
      const smoothed = linearSmoothing(vectors, 0.3);
      
      return smoothed.map((vector, i) => vectorToPoint(
        vector,
        points[i]?.pressure ?? 0.5,
        points[i]?.timestamp ?? Date.now()
      ));
    }
  }

  // Check if we have time for high-quality smoothing
  const elapsedTime = performance.now() - startTime;
  if (elapsedTime > maxProcessingTime * 0.5) {
    // Not enough time, fall back to simple smoothing
    return [...points];
  }

  // Use Catmull-Rom for high quality
  if (points.length >= 4) {
    const vectors = points.map(pointToVector);
    const smoothed = catmullRomSpline(vectors, 2);
    
    // Map back to StrokePoints, interpolating pressure and timestamp
    return smoothed.map((vector, i) => {
      const originalIndex = Math.min(Math.floor(i * points.length / smoothed.length), points.length - 1);
      const originalPoint = points[originalIndex];
      
      return vectorToPoint(vector, originalPoint.pressure, originalPoint.timestamp);
    });
  }

  return [...points];
}