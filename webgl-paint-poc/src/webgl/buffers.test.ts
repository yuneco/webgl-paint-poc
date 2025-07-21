import { describe, it, expect, beforeEach } from 'vitest';
import {
  strokePointsToVertexData,
  strokeDataToVertexData,
  multipleStrokesToVertexData,
  createVertexBuffer,
  updateVertexBuffer,
  bindVertexBuffer,
  unbindVertexAttributes,
  deleteVertexBuffer,
  drawVertexBuffer,
  drawVertexBufferAsLineStrip,
  validateVertexData,
  calculateVertexDataMemoryUsage,
  getVertexDataStats,
  BufferCreationError,
} from './buffers';
import { initializeWebGL } from './context';
import { createBasicShaderProgram } from './shaders';
import { horizontalLineStroke, arcStroke, allTestStrokes } from '../data/testStrokes';
import * as CoreTypes from '../types/core';

type StrokePoint = CoreTypes.StrokePoint;

describe('WebGL Buffers (Browser Mode)', () => {
  let canvas: HTMLCanvasElement;
  let gl: WebGLRenderingContext;

  beforeEach(() => {
    // Create a fresh canvas for each test
    canvas = document.createElement('canvas');
    canvas.id = 'test-canvas';
    canvas.width = 1024;
    canvas.height = 1024;
    document.body.appendChild(canvas);

    // Initialize WebGL
    const webglContext = initializeWebGL('test-canvas');
    gl = webglContext.gl;
  });

  describe('Vertex Data Conversion', () => {
    it('should convert stroke points to vertex data', () => {
      const points: StrokePoint[] = [
        { x: 100, y: 200, pressure: 0.5, timestamp: 1000 },
        { x: 200, y: 300, pressure: 0.8, timestamp: 1010 },
        { x: 300, y: 400, pressure: 0.6, timestamp: 1020 },
      ];

      const vertexData = strokePointsToVertexData(points);

      expect(vertexData.vertexCount).toBe(3);
      expect(vertexData.vertices.length).toBe(9); // 3 points * 3 components

      // Check first point data
      expect(vertexData.vertices[0]).toBeCloseTo(100); // x
      expect(vertexData.vertices[1]).toBeCloseTo(200); // y
      expect(vertexData.vertices[2]).toBeCloseTo(0.5); // pressure

      // Check second point data
      expect(vertexData.vertices[3]).toBeCloseTo(200); // x
      expect(vertexData.vertices[4]).toBeCloseTo(300); // y
      expect(vertexData.vertices[5]).toBeCloseTo(0.8); // pressure

      // Check third point data
      expect(vertexData.vertices[6]).toBeCloseTo(300); // x
      expect(vertexData.vertices[7]).toBeCloseTo(400); // y
      expect(vertexData.vertices[8]).toBeCloseTo(0.6); // pressure
    });

    it('should handle empty stroke points', () => {
      const vertexData = strokePointsToVertexData([]);

      expect(vertexData.vertexCount).toBe(0);
      expect(vertexData.vertices.length).toBe(0);
    });

    it('should convert stroke data to vertex data', () => {
      const vertexData = strokeDataToVertexData(horizontalLineStroke);

      expect(vertexData.vertexCount).toBe(horizontalLineStroke.points.length);
      expect(vertexData.vertices.length).toBe(horizontalLineStroke.points.length * 3);

      // Verify first point conversion
      const firstPoint = horizontalLineStroke.points[0];
      expect(vertexData.vertices[0]).toBeCloseTo(firstPoint.x);
      expect(vertexData.vertices[1]).toBeCloseTo(firstPoint.y);
      expect(vertexData.vertices[2]).toBeCloseTo(firstPoint.pressure);
    });

    it('should combine multiple strokes into vertex data', () => {
      const strokes = [horizontalLineStroke, arcStroke];
      const vertexData = multipleStrokesToVertexData(strokes);

      const expectedVertexCount = horizontalLineStroke.points.length + arcStroke.points.length;
      expect(vertexData.vertexCount).toBe(expectedVertexCount);
      expect(vertexData.vertices.length).toBe(expectedVertexCount * 3);

      // Verify that data from both strokes is present
      // First stroke data should be at the beginning
      expect(vertexData.vertices[0]).toBeCloseTo(horizontalLineStroke.points[0].x);
      expect(vertexData.vertices[1]).toBeCloseTo(horizontalLineStroke.points[0].y);
      expect(vertexData.vertices[2]).toBeCloseTo(horizontalLineStroke.points[0].pressure);

      // Second stroke data should be after first stroke
      const secondStrokeOffset = horizontalLineStroke.points.length * 3;
      expect(vertexData.vertices[secondStrokeOffset]).toBeCloseTo(arcStroke.points[0].x);
      expect(vertexData.vertices[secondStrokeOffset + 1]).toBeCloseTo(arcStroke.points[0].y);
      expect(vertexData.vertices[secondStrokeOffset + 2]).toBeCloseTo(arcStroke.points[0].pressure);
    });

    it('should handle empty stroke array', () => {
      const vertexData = multipleStrokesToVertexData([]);

      expect(vertexData.vertexCount).toBe(0);
      expect(vertexData.vertices.length).toBe(0);
    });
  });

  describe('WebGL Buffer Operations', () => {
    it('should create vertex buffer successfully', () => {
      const vertexData = strokeDataToVertexData(horizontalLineStroke);
      const vertexBuffer = createVertexBuffer(gl, vertexData);

      expect(vertexBuffer.buffer).toBeDefined();
      expect(gl.isBuffer(vertexBuffer.buffer)).toBe(true);
      expect(vertexBuffer.vertexCount).toBe(vertexData.vertexCount);
      expect(vertexBuffer.attributeSize).toBe(12); // 3 floats * 4 bytes

      // Verify buffer content size
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer.buffer);
      const bufferSize = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE);
      expect(bufferSize).toBe(vertexData.vertices.byteLength);

      // Clean up
      deleteVertexBuffer(gl, vertexBuffer);
    });

    it('should handle empty vertex data buffer creation', () => {
      const emptyVertexData = { vertices: new Float32Array(0), vertexCount: 0 };
      const vertexBuffer = createVertexBuffer(gl, emptyVertexData);

      expect(vertexBuffer.buffer).toBeDefined();
      expect(gl.isBuffer(vertexBuffer.buffer)).toBe(true);
      expect(vertexBuffer.vertexCount).toBe(0);

      // Clean up
      deleteVertexBuffer(gl, vertexBuffer);
    });

    it('should update existing vertex buffer', () => {
      const initialVertexData = strokeDataToVertexData(horizontalLineStroke);
      const vertexBuffer = createVertexBuffer(gl, initialVertexData);

      const newVertexData = strokeDataToVertexData(arcStroke);
      updateVertexBuffer(gl, vertexBuffer, newVertexData);

      expect(vertexBuffer.vertexCount).toBe(newVertexData.vertexCount);

      // Verify buffer size changed
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer.buffer);
      const bufferSize = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE);
      expect(bufferSize).toBe(newVertexData.vertices.byteLength);

      // Clean up
      deleteVertexBuffer(gl, vertexBuffer);
    });

    it('should bind vertex buffer attributes correctly', () => {
      const shaderProgram = createBasicShaderProgram(gl);
      const vertexData = strokeDataToVertexData(horizontalLineStroke);
      const vertexBuffer = createVertexBuffer(gl, vertexData);

      // Should not throw when binding attributes
      expect(() => {
        bindVertexBuffer(
          gl,
          vertexBuffer,
          shaderProgram.attributes.position,
          shaderProgram.attributes.pressure
        );
      }).not.toThrow();

      // Verify attributes are enabled
      expect(gl.getVertexAttrib(shaderProgram.attributes.position, gl.VERTEX_ATTRIB_ARRAY_ENABLED)).toBe(true);
      expect(gl.getVertexAttrib(shaderProgram.attributes.pressure, gl.VERTEX_ATTRIB_ARRAY_ENABLED)).toBe(true);

      // Clean up
      unbindVertexAttributes(gl, shaderProgram.attributes.position, shaderProgram.attributes.pressure);
      deleteVertexBuffer(gl, vertexBuffer);
      gl.deleteProgram(shaderProgram.program);
    });

    it('should unbind vertex attributes', () => {
      const shaderProgram = createBasicShaderProgram(gl);
      const vertexData = strokeDataToVertexData(horizontalLineStroke);
      const vertexBuffer = createVertexBuffer(gl, vertexData);

      // Bind then unbind
      bindVertexBuffer(
        gl,
        vertexBuffer,
        shaderProgram.attributes.position,
        shaderProgram.attributes.pressure
      );
      unbindVertexAttributes(gl, shaderProgram.attributes.position, shaderProgram.attributes.pressure);

      // Verify attributes are disabled
      expect(gl.getVertexAttrib(shaderProgram.attributes.position, gl.VERTEX_ATTRIB_ARRAY_ENABLED)).toBe(false);
      expect(gl.getVertexAttrib(shaderProgram.attributes.pressure, gl.VERTEX_ATTRIB_ARRAY_ENABLED)).toBe(false);

      // Clean up
      deleteVertexBuffer(gl, vertexBuffer);
      gl.deleteProgram(shaderProgram.program);
    });

    it('should delete vertex buffer', () => {
      const vertexData = strokeDataToVertexData(horizontalLineStroke);
      const vertexBuffer = createVertexBuffer(gl, vertexData);

      expect(gl.isBuffer(vertexBuffer.buffer)).toBe(true);

      deleteVertexBuffer(gl, vertexBuffer);

      expect(gl.isBuffer(vertexBuffer.buffer)).toBe(false);
    });
  });

  describe('Drawing Operations', () => {
    it('should draw vertex buffer as points', () => {
      const shaderProgram = createBasicShaderProgram(gl);
      const vertexData = strokeDataToVertexData(horizontalLineStroke);
      const vertexBuffer = createVertexBuffer(gl, vertexData);

      gl.useProgram(shaderProgram.program);
      bindVertexBuffer(
        gl,
        vertexBuffer,
        shaderProgram.attributes.position,
        shaderProgram.attributes.pressure
      );

      // Should not throw when drawing
      expect(() => {
        drawVertexBuffer(gl, vertexBuffer);
      }).not.toThrow();

      // Clean up
      unbindVertexAttributes(gl, shaderProgram.attributes.position, shaderProgram.attributes.pressure);
      deleteVertexBuffer(gl, vertexBuffer);
      gl.deleteProgram(shaderProgram.program);
    });

    it('should draw vertex buffer as line strip', () => {
      const shaderProgram = createBasicShaderProgram(gl);
      const vertexData = strokeDataToVertexData(horizontalLineStroke);
      const vertexBuffer = createVertexBuffer(gl, vertexData);

      gl.useProgram(shaderProgram.program);
      bindVertexBuffer(
        gl,
        vertexBuffer,
        shaderProgram.attributes.position,
        shaderProgram.attributes.pressure
      );

      // Should not throw when drawing
      expect(() => {
        drawVertexBufferAsLineStrip(gl, vertexBuffer);
      }).not.toThrow();

      // Clean up
      unbindVertexAttributes(gl, shaderProgram.attributes.position, shaderProgram.attributes.pressure);
      deleteVertexBuffer(gl, vertexBuffer);
      gl.deleteProgram(shaderProgram.program);
    });

    it('should handle empty buffer drawing', () => {
      const emptyVertexData = { vertices: new Float32Array(0), vertexCount: 0 };
      const vertexBuffer = createVertexBuffer(gl, emptyVertexData);

      // Should not throw when drawing empty buffer
      expect(() => {
        drawVertexBuffer(gl, vertexBuffer);
        drawVertexBufferAsLineStrip(gl, vertexBuffer);
      }).not.toThrow();

      // Clean up
      deleteVertexBuffer(gl, vertexBuffer);
    });
  });

  describe('Validation and Utilities', () => {
    it('should validate correct vertex data', () => {
      const vertexData = strokeDataToVertexData(horizontalLineStroke);
      expect(validateVertexData(vertexData)).toBe(true);
    });

    it('should validate empty vertex data', () => {
      const emptyVertexData = { vertices: new Float32Array(0), vertexCount: 0 };
      expect(validateVertexData(emptyVertexData)).toBe(true);
    });

    it('should reject invalid vertex data with length mismatch', () => {
      const invalidVertexData = {
        vertices: new Float32Array([1, 2, 3, 4, 5]), // 5 components, not divisible by 3
        vertexCount: 2, // Claims 2 vertices but should be 6 components
      };
      expect(validateVertexData(invalidVertexData)).toBe(false);
    });

    it('should reject vertex data with invalid values', () => {
      const invalidVertexData = {
        vertices: new Float32Array([100, 200, 0.5, NaN, 300, 0.8]), // Contains NaN
        vertexCount: 2,
      };
      expect(validateVertexData(invalidVertexData)).toBe(false);
    });

    it('should calculate memory usage correctly', () => {
      const vertexData = strokeDataToVertexData(horizontalLineStroke);
      const memoryUsage = calculateVertexDataMemoryUsage(vertexData);
      
      expect(memoryUsage).toBe(vertexData.vertices.byteLength);
      expect(memoryUsage).toBe(vertexData.vertexCount * 3 * 4); // 3 floats * 4 bytes
    });

    it('should provide vertex data statistics', () => {
      const vertexData = strokeDataToVertexData(horizontalLineStroke);
      const stats = getVertexDataStats(vertexData);

      expect(stats.vertexCount).toBe(vertexData.vertexCount);
      expect(stats.memoryUsage).toBe(vertexData.vertices.byteLength);
      expect(typeof stats.minX).toBe('number');
      expect(typeof stats.maxX).toBe('number');
      expect(typeof stats.minY).toBe('number');
      expect(typeof stats.maxY).toBe('number');
      expect(typeof stats.minPressure).toBe('number');
      expect(typeof stats.maxPressure).toBe('number');

      // Verify ranges make sense
      expect(stats.minX).toBeLessThanOrEqual(stats.maxX);
      expect(stats.minY).toBeLessThanOrEqual(stats.maxY);
      expect(stats.minPressure).toBeLessThanOrEqual(stats.maxPressure);
    });

    it('should handle empty data statistics', () => {
      const emptyVertexData = { vertices: new Float32Array(0), vertexCount: 0 };
      const stats = getVertexDataStats(emptyVertexData);

      expect(stats.vertexCount).toBe(0);
      expect(stats.memoryUsage).toBe(0);
      expect(stats.minX).toBe(0);
      expect(stats.maxX).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle buffer creation failure gracefully', () => {
      // Mock createBuffer to fail
      const originalCreateBuffer = gl.createBuffer;
      (gl as any).createBuffer = (): WebGLBuffer | null => null;

      const vertexData = strokeDataToVertexData(horizontalLineStroke);

      expect(() => {
        createVertexBuffer(gl, vertexData);
      }).toThrow(BufferCreationError);

      // Restore original function
      gl.createBuffer = originalCreateBuffer;
    });
  });

  describe('Performance and Memory Tests', () => {
    it('should handle large vertex data efficiently', () => {
      const largeVertexData = multipleStrokesToVertexData(allTestStrokes);
      
      // Should be able to create buffer with all test strokes
      const vertexBuffer = createVertexBuffer(gl, largeVertexData);
      
      expect(vertexBuffer.vertexCount).toBeGreaterThan(0);
      expect(gl.isBuffer(vertexBuffer.buffer)).toBe(true);

      // Should be able to draw without error
      const shaderProgram = createBasicShaderProgram(gl);
      gl.useProgram(shaderProgram.program);
      bindVertexBuffer(
        gl,
        vertexBuffer,
        shaderProgram.attributes.position,
        shaderProgram.attributes.pressure
      );

      expect(() => {
        drawVertexBuffer(gl, vertexBuffer);
      }).not.toThrow();

      // Clean up
      unbindVertexAttributes(gl, shaderProgram.attributes.position, shaderProgram.attributes.pressure);
      deleteVertexBuffer(gl, vertexBuffer);
      gl.deleteProgram(shaderProgram.program);
    });

    it('should properly manage buffer memory lifecycle', () => {
      const buffers = [];

      // Create multiple buffers
      for (let i = 0; i < 5; i++) {
        const vertexData = strokeDataToVertexData(allTestStrokes[i % allTestStrokes.length]);
        const vertexBuffer = createVertexBuffer(gl, vertexData);
        buffers.push(vertexBuffer);
      }

      // Verify all buffers are valid
      buffers.forEach(buffer => {
        expect(gl.isBuffer(buffer.buffer)).toBe(true);
      });

      // Delete all buffers
      buffers.forEach(buffer => {
        deleteVertexBuffer(gl, buffer);
      });

      // Verify all buffers are deleted
      buffers.forEach(buffer => {
        expect(gl.isBuffer(buffer.buffer)).toBe(false);
      });
    });
  });
});