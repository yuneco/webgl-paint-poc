// WebGL buffer management for stroke rendering

import * as CoreTypes from '../types/core';

type StrokeData = CoreTypes.StrokeData;
type StrokePoint = CoreTypes.StrokePoint;

export interface VertexBuffer {
  buffer: WebGLBuffer;
  vertexCount: number;
  attributeSize: number; // bytes per vertex
}

export interface StrokeVertexData {
  vertices: Float32Array;
  vertexCount: number;
}

export class BufferCreationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BufferCreationError';
  }
}

/**
 * Convert stroke points to interleaved vertex data
 * Format: [x, y, pressure, x, y, pressure, ...]
 */
export function strokePointsToVertexData(points: StrokePoint[]): StrokeVertexData {
  if (points.length === 0) {
    return {
      vertices: new Float32Array(0),
      vertexCount: 0,
    };
  }

  // Each vertex has 3 components: x, y, pressure
  const verticesPerPoint = 1;
  const componentsPerVertex = 3;
  const totalComponents = points.length * verticesPerPoint * componentsPerVertex;
  
  const vertices = new Float32Array(totalComponents);
  
  let offset = 0;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    
    // Position (x, y) - canvas coordinates
    vertices[offset] = point.x;
    vertices[offset + 1] = point.y;
    
    // Pressure
    vertices[offset + 2] = point.pressure;
    
    offset += componentsPerVertex;
  }
  
  return {
    vertices,
    vertexCount: points.length,
  };
}

/**
 * Convert stroke data to vertex data suitable for WebGL rendering
 */
export function strokeDataToVertexData(stroke: StrokeData): StrokeVertexData {
  return strokePointsToVertexData(stroke.points);
}

/**
 * Convert multiple stroke data to combined vertex data
 */
export function multipleStrokesToVertexData(strokes: StrokeData[]): StrokeVertexData {
  if (strokes.length === 0) {
    return {
      vertices: new Float32Array(0),
      vertexCount: 0,
    };
  }

  // Calculate total vertices needed
  let totalVertexCount = 0;
  for (const stroke of strokes) {
    totalVertexCount += stroke.points.length;
  }

  // Each vertex has 3 components: x, y, pressure
  const componentsPerVertex = 3;
  const totalComponents = totalVertexCount * componentsPerVertex;
  const vertices = new Float32Array(totalComponents);

  let offset = 0;
  for (const stroke of strokes) {
    const strokeVertexData = strokeDataToVertexData(stroke);
    vertices.set(strokeVertexData.vertices, offset);
    offset += strokeVertexData.vertices.length;
  }

  return {
    vertices,
    vertexCount: totalVertexCount,
  };
}

/**
 * Create a WebGL vertex buffer from vertex data
 */
export function createVertexBuffer(
  gl: WebGLRenderingContext,
  vertexData: StrokeVertexData
): VertexBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new BufferCreationError('Failed to create WebGL buffer');
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData.vertices, gl.STATIC_DRAW);

  // Verify buffer creation
  const bufferSize = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE);
  const expectedSize = vertexData.vertices.byteLength;
  
  if (bufferSize !== expectedSize) {
    gl.deleteBuffer(buffer);
    throw new BufferCreationError(
      `Buffer size mismatch: expected ${expectedSize}, got ${bufferSize}`
    );
  }

  console.log('Vertex buffer created:', {
    vertexCount: vertexData.vertexCount,
    bufferSize,
    componentsPerVertex: 3,
  });

  return {
    buffer,
    vertexCount: vertexData.vertexCount,
    attributeSize: 3 * 4, // 3 floats * 4 bytes per float
  };
}

/**
 * Update an existing vertex buffer with new data
 */
export function updateVertexBuffer(
  gl: WebGLRenderingContext,
  vertexBuffer: VertexBuffer,
  vertexData: StrokeVertexData
): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData.vertices, gl.STATIC_DRAW);
  
  // Update vertex count
  vertexBuffer.vertexCount = vertexData.vertexCount;
  
  console.log('Vertex buffer updated:', {
    vertexCount: vertexData.vertexCount,
    bufferSize: vertexData.vertices.byteLength,
  });
}

/**
 * Bind vertex buffer and configure vertex attributes
 */
export function bindVertexBuffer(
  gl: WebGLRenderingContext,
  vertexBuffer: VertexBuffer,
  positionLocation: number,
  pressureLocation: number
): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer.buffer);
  
  // Each vertex has 3 components: x, y, pressure
  const componentsPerVertex = 3;
  const stride = componentsPerVertex * 4; // 4 bytes per float
  
  // Position attribute (x, y) - first 2 components
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(
    positionLocation,
    2, // size (x, y)
    gl.FLOAT, // type
    false, // normalized
    stride, // stride
    0 // offset
  );
  
  // Pressure attribute - 3rd component
  gl.enableVertexAttribArray(pressureLocation);
  gl.vertexAttribPointer(
    pressureLocation,
    1, // size (pressure only)
    gl.FLOAT, // type
    false, // normalized
    stride, // stride
    2 * 4 // offset (skip x, y)
  );
}

/**
 * Unbind vertex attributes
 */
export function unbindVertexAttributes(
  gl: WebGLRenderingContext,
  positionLocation: number,
  pressureLocation: number
): void {
  gl.disableVertexAttribArray(positionLocation);
  gl.disableVertexAttribArray(pressureLocation);
}

/**
 * Delete a vertex buffer and free GPU memory
 */
export function deleteVertexBuffer(
  gl: WebGLRenderingContext,
  vertexBuffer: VertexBuffer
): void {
  if (gl.isBuffer(vertexBuffer.buffer)) {
    gl.deleteBuffer(vertexBuffer.buffer);
    console.log('Vertex buffer deleted');
  }
}

/**
 * Draw vertices as points (for testing)
 */
export function drawVertexBuffer(
  gl: WebGLRenderingContext,
  vertexBuffer: VertexBuffer
): void {
  if (vertexBuffer.vertexCount > 0) {
    gl.drawArrays(gl.POINTS, 0, vertexBuffer.vertexCount);
  }
}

/**
 * Draw vertices as line strip (for stroke rendering)
 */
export function drawVertexBufferAsLineStrip(
  gl: WebGLRenderingContext,
  vertexBuffer: VertexBuffer
): void {
  if (vertexBuffer.vertexCount > 1) {
    gl.drawArrays(gl.LINE_STRIP, 0, vertexBuffer.vertexCount);
  }
}

/**
 * Validate vertex data integrity
 */
export function validateVertexData(vertexData: StrokeVertexData): boolean {
  if (vertexData.vertexCount === 0 && vertexData.vertices.length === 0) {
    return true; // Empty data is valid
  }

  // Check if vertex count matches array length
  const expectedLength = vertexData.vertexCount * 3; // 3 components per vertex
  if (vertexData.vertices.length !== expectedLength) {
    console.error('Vertex data validation failed: length mismatch', {
      expected: expectedLength,
      actual: vertexData.vertices.length,
      vertexCount: vertexData.vertexCount,
    });
    return false;
  }

  // Check for invalid values (NaN, Infinity)
  for (let i = 0; i < vertexData.vertices.length; i++) {
    const value = vertexData.vertices[i];
    if (!isFinite(value)) {
      console.error('Vertex data validation failed: invalid value at index', i, value);
      return false;
    }
  }

  return true;
}

/**
 * Calculate memory usage of vertex data
 */
export function calculateVertexDataMemoryUsage(vertexData: StrokeVertexData): number {
  return vertexData.vertices.byteLength;
}

/**
 * Get vertex data statistics for debugging
 */
export function getVertexDataStats(vertexData: StrokeVertexData) {
  if (vertexData.vertexCount === 0) {
    return {
      vertexCount: 0,
      memoryUsage: 0,
      minX: 0, maxX: 0,
      minY: 0, maxY: 0,
      minPressure: 0, maxPressure: 0,
    };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minPressure = Infinity, maxPressure = -Infinity;

  for (let i = 0; i < vertexData.vertices.length; i += 3) {
    const x = vertexData.vertices[i];
    const y = vertexData.vertices[i + 1];
    const pressure = vertexData.vertices[i + 2];

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (pressure < minPressure) minPressure = pressure;
    if (pressure > maxPressure) maxPressure = pressure;
  }

  return {
    vertexCount: vertexData.vertexCount,
    memoryUsage: calculateVertexDataMemoryUsage(vertexData),
    minX: minX === Infinity ? 0 : minX,
    maxX: maxX === -Infinity ? 0 : maxX,
    minY: minY === Infinity ? 0 : minY,
    maxY: maxY === -Infinity ? 0 : maxY,
    minPressure: minPressure === Infinity ? 0 : minPressure,
    maxPressure: maxPressure === -Infinity ? 0 : maxPressure,
  };
}