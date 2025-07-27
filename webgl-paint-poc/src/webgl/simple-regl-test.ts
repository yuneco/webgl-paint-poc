// Simple test to verify regl-line works in isolation
// @ts-ignore
import regl from 'regl';
// @ts-ignore
import createLineRenderer from 'regl-line';

export function createSimpleReglTest() {
  // Create a simple canvas
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  canvas.style.border = '2px solid red';
  canvas.style.position = 'fixed';
  canvas.style.top = '10px';
  canvas.style.left = '10px';
  canvas.style.zIndex = '9999';
  
  document.body.appendChild(canvas);
  
  console.log('🧪 Creating simple regl test canvas');
  
  try {
    // Initialize regl exactly like the working test
    const reglInstance = regl({
      canvas: canvas,
      extensions: ['OES_element_index_uint'],
      attributes: {
        antialias: true,
        alpha: true,
      }
    });
    
    console.log('✅ Regl instance created');
    
    // Create line renderer
    const lineRenderer = createLineRenderer(reglInstance);
    console.log('✅ Line renderer created:', typeof lineRenderer, Object.keys(lineRenderer));
    
    // Clear with white background
    reglInstance.clear({
      color: [1, 1, 1, 1],
      depth: 1
    });
    
    console.log('✅ Canvas cleared');
    
    // Draw a simple red diagonal line
    const testPoints = [
      [-0.8, -0.8],
      [0.8, 0.8]
    ];
    
    lineRenderer.setPoints(testPoints);
    lineRenderer.setStyle({
      thickness: 20,
      color: [1, 0, 0, 1], // Red
      join: 'round',
      cap: 'round'
    });
    lineRenderer.draw();
    
    console.log('✅ Simple test line drawn');
    
    // Return cleanup function
    return () => {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      reglInstance.destroy();
    };
    
  } catch (error) {
    console.error('❌ Simple regl test failed:', error);
    return () => {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }
}