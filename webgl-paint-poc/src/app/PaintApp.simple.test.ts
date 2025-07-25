/**
 * PaintAppの簡単なテスト
 * 基本的な機能のみテスト
 */

import { describe, it, expect } from 'vitest';
import { PaintApp } from './PaintApp';
import { PaintAppFactory } from './PaintAppFactory';

describe('PaintApp Simple Tests', () => {
  it('should export PaintApp class', () => {
    expect(PaintApp).toBeDefined();
    expect(typeof PaintApp).toBe('function');
  });

  it('should throw error for non-existent canvas', () => {
    expect(() => {
      PaintAppFactory.create({
        canvasId: 'non-existent-canvas',
        displaySize: { width: 500, height: 500 },
        enableDebug: false,
      });
    }).toThrow('Canvas element with id "non-existent-canvas" not found');
  });
});