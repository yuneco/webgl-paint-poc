// WebGL renderer for stroke drawing

import * as CoreTypes from '../types/core';
import { initializeWebGL } from './context';
import { createBasicShaderProgram, setupShaderUniforms } from './shaders';
import type { ShaderProgram } from './shaders';
import { 
  strokeDataToVertexData, 
  multipleStrokesToVertexData,
  createVertexBuffer,
  bindVertexBuffer,
  unbindVertexAttributes,
  deleteVertexBuffer,
  drawVertexBufferAsLineStrip,
  drawVertexBuffer
} from './buffers';

type StrokeData = CoreTypes.StrokeData;

export interface WebGLRenderer {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  shaderProgram: ShaderProgram;
  canvasWidth: number;
  canvasHeight: number;
}

export class RendererInitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RendererInitializationError';
  }
}

/**
 * Initialize the WebGL renderer
 */
export function initializeRenderer(canvasId: string): WebGLRenderer {
  try {
    // Initialize WebGL context
    const webglContext = initializeWebGL(canvasId);
    const { gl, canvas } = webglContext;

    // Create shader program
    const shaderProgram = createBasicShaderProgram(gl);

    // Setup initial uniforms
    setupShaderUniforms(gl, shaderProgram, canvas.width, canvas.height);

    // Set up WebGL viewport
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Clear color (white background as per spec)
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    
    // Enable blending for smooth lines
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    console.log('WebGL renderer initialized successfully:', {
      canvasSize: [canvas.width, canvas.height],
      shaderProgram: 'basic',
      viewport: [0, 0, canvas.width, canvas.height],
    });

    return {
      canvas,
      gl,
      shaderProgram,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    };
  } catch (error) {
    throw new RendererInitializationError(
      `Failed to initialize WebGL renderer: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Clear the canvas
 */
export function clearCanvas(renderer: WebGLRenderer): void {
  renderer.gl.clear(renderer.gl.COLOR_BUFFER_BIT);
}

/**
 * Set the drawing color
 */
export function setDrawingColor(
  renderer: WebGLRenderer, 
  red: number, 
  green: number, 
  blue: number, 
  alpha: number = 1.0
): void {
  renderer.gl.useProgram(renderer.shaderProgram.program);
  
  if (renderer.shaderProgram.uniforms.color) {
    renderer.gl.uniform4f(renderer.shaderProgram.uniforms.color, red, green, blue, alpha);
  }
}

/**
 * Render a single stroke as line strip
 */
export function renderStroke(renderer: WebGLRenderer, stroke: StrokeData): void {
  if (stroke.points.length === 0) {
    return; // Nothing to draw
  }

  const { gl, shaderProgram } = renderer;

  // Convert stroke to vertex data
  const vertexData = strokeDataToVertexData(stroke);
  
  // Create vertex buffer
  const vertexBuffer = createVertexBuffer(gl, vertexData);

  try {
    // Use shader program
    gl.useProgram(shaderProgram.program);

    // Bind vertex buffer and attributes
    bindVertexBuffer(
      gl,
      vertexBuffer,
      shaderProgram.attributes.position,
      shaderProgram.attributes.pressure
    );

    // Draw the stroke
    if (stroke.points.length === 1) {
      // Single point - draw as point
      drawVertexBuffer(gl, vertexBuffer);
    } else {
      // Multiple points - draw as line strip
      drawVertexBufferAsLineStrip(gl, vertexBuffer);
    }

    // Unbind attributes
    unbindVertexAttributes(
      gl,
      shaderProgram.attributes.position,
      shaderProgram.attributes.pressure
    );
  } finally {
    // Clean up buffer
    deleteVertexBuffer(gl, vertexBuffer);
  }
}

/**
 * Render multiple strokes as line strips
 */
export function renderStrokes(renderer: WebGLRenderer, strokes: StrokeData[]): void {
  if (strokes.length === 0) {
    return; // Nothing to draw
  }

  // Clear canvas first
  clearCanvas(renderer);

  // Render each stroke individually to maintain proper line strip behavior
  for (const stroke of strokes) {
    renderStroke(renderer, stroke);
  }
}

/**
 * Render all strokes as points (for debugging/testing)
 */
export function renderStrokesAsPoints(renderer: WebGLRenderer, strokes: StrokeData[]): void {
  if (strokes.length === 0) {
    return;
  }

  const { gl, shaderProgram } = renderer;

  // Convert all strokes to combined vertex data
  const vertexData = multipleStrokesToVertexData(strokes);
  
  // Create vertex buffer
  const vertexBuffer = createVertexBuffer(gl, vertexData);

  try {
    // Use shader program
    gl.useProgram(shaderProgram.program);

    // Bind vertex buffer and attributes
    bindVertexBuffer(
      gl,
      vertexBuffer,
      shaderProgram.attributes.position,
      shaderProgram.attributes.pressure
    );

    // Draw all points
    drawVertexBuffer(gl, vertexBuffer);

    // Unbind attributes
    unbindVertexAttributes(
      gl,
      shaderProgram.attributes.position,
      shaderProgram.attributes.pressure
    );
  } finally {
    // Clean up buffer
    deleteVertexBuffer(gl, vertexBuffer);
  }
}

/**
 * Render a test pattern with fixed strokes (preserves current color)
 */
export function renderTestPattern(renderer: WebGLRenderer, strokes: StrokeData[]): void {
  // Clear canvas with white background
  clearCanvas(renderer);

  // Render all test strokes (preserves current drawing color)
  renderStrokes(renderer, strokes);

  console.log('Test pattern rendered:', {
    strokeCount: strokes.length,
    totalPoints: strokes.reduce((sum, stroke) => sum + stroke.points.length, 0),
  });
}

/**
 * Clean up renderer resources
 */
export function cleanupRenderer(renderer: WebGLRenderer): void {
  const { gl, shaderProgram } = renderer;
  
  if (gl.isProgram(shaderProgram.program)) {
    gl.deleteProgram(shaderProgram.program);
  }
  
  console.log('Renderer cleanup completed');
}