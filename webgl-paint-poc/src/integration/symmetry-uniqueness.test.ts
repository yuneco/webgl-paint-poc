/**
 * 対称描画の一意性統合テスト
 * 8軸対称で重複が発生しないことを検証する
 */

import { describe, it, expect } from 'vitest';
import { generateSymmetricStrokes } from '../symmetry/symmetryRenderer';
import type { StrokeData } from '../types/core';
import type { SymmetryConfig } from '../symmetry/symmetryRenderer';

describe('Symmetry Uniqueness Integration', () => {
  const testStroke: StrokeData = {
    id: 'test-stroke',
    points: [
      { x: 600, y: 400, pressure: 1.0, timestamp: 1000 }, // Off-center point
    ],
    timestamp: 1000,
    metadata: { timestamp: 1000, deviceType: 'mouse', totalPoints: 1 }
  };
  
  const symmetryConfig: SymmetryConfig = {
    enabled: true,
    axisCount: 8,
    centerPoint: { x: 512, y: 512 }
  };
  
  describe('8軸対称の一意性', () => {
    it('should generate 8 unique strokes without duplicates', () => {
      const result = generateSymmetricStrokes(testStroke, symmetryConfig);
      
      expect(result.symmetricStrokes).toHaveLength(8);
      
      // Check that all strokes have different positions
      const positions = result.symmetricStrokes.map(stroke => 
        `${stroke.points[0].x.toFixed(1)},${stroke.points[0].y.toFixed(1)}`
      );
      
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(8); // All should be unique
      
      // Log positions for debugging
      console.log('Symmetric stroke positions:', positions);
      
      // Verify angular distribution (should be roughly 45° apart)
      const center = { x: 512, y: 512 };
      const angles = result.symmetricStrokes.map(stroke => {
        const point = stroke.points[0];
        return Math.atan2(point.y - center.y, point.x - center.x);
      });
      
      // Sort angles for comparison
      angles.sort((a, b) => a - b);
      
      // Check that angles are roughly 45° (π/4) apart
      for (let i = 1; i < angles.length; i++) {
        let angleDiff = angles[i] - angles[i - 1];
        if (angleDiff < 0) angleDiff += 2 * Math.PI; // Handle wrap-around
        
        // Allow some tolerance for floating point precision
        expect(Math.abs(angleDiff - Math.PI / 4)).toBeLessThan(0.1);
      }
    });
    
    it('should preserve stroke properties in all symmetric strokes', () => {
      const result = generateSymmetricStrokes(testStroke, symmetryConfig);
      
      result.symmetricStrokes.forEach((stroke, index) => {
        expect(stroke.points).toHaveLength(testStroke.points.length);
        expect(stroke.points[0].pressure).toBe(testStroke.points[0].pressure);
        expect(stroke.points[0].timestamp).toBe(testStroke.points[0].timestamp);
        expect(stroke.id).toBe(`${testStroke.id}_axis_${index}`);
      });
    });
    
    it('should handle multi-point strokes correctly', () => {
      const multiPointStroke: StrokeData = {
        id: 'multi-point-test',
        points: [
          { x: 600, y: 400, pressure: 1.0, timestamp: 1000 },
          { x: 650, y: 450, pressure: 0.8, timestamp: 1100 },
          { x: 700, y: 500, pressure: 0.6, timestamp: 1200 },
        ],
        timestamp: 1000,
        metadata: { timestamp: 1000, deviceType: 'mouse', totalPoints: 3 }
      };
      
      const result = generateSymmetricStrokes(multiPointStroke, symmetryConfig);
      
      expect(result.symmetricStrokes).toHaveLength(8);
      
      // Check that each symmetric stroke maintains the same number of points
      result.symmetricStrokes.forEach(stroke => {
        expect(stroke.points).toHaveLength(3);
      });
      
      // Check that all start positions are unique
      const startPositions = result.symmetricStrokes.map(stroke =>
        `${stroke.points[0].x.toFixed(1)},${stroke.points[0].y.toFixed(1)}`
      );
      
      const uniqueStartPositions = new Set(startPositions);
      expect(uniqueStartPositions.size).toBe(8);
    });
  });
  
  describe('エッジケース', () => {
    it('should handle center point correctly', () => {
      const centerStroke: StrokeData = {
        id: 'center-stroke',
        points: [
          { x: 512, y: 512, pressure: 1.0, timestamp: 1000 }, // Exact center
        ],
        timestamp: 1000,
        metadata: { timestamp: 1000, deviceType: 'mouse', totalPoints: 1 }
      };
      
      const result = generateSymmetricStrokes(centerStroke, symmetryConfig);
      
      // All symmetric strokes should be at the center (same position)
      result.symmetricStrokes.forEach(stroke => {
        expect(stroke.points[0].x).toBeCloseTo(512, 1);
        expect(stroke.points[0].y).toBeCloseTo(512, 1);
      });
    });
  });
});