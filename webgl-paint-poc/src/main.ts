import { initializeWebGL, testWebGLFeatures, WebGLInitializationError } from './webgl/context';

async function initializeApp() {
  try {
    console.log('Initializing WebGL Symmetry Paint PoC...');
    
    // Initialize WebGL context
    const webglContext = initializeWebGL('paint-canvas');
    
    // Test WebGL features
    const featuresSupported = testWebGLFeatures(webglContext.gl);
    if (!featuresSupported) {
      throw new WebGLInitializationError('Required WebGL features are not supported');
    }
    
    // Clear the canvas to white
    webglContext.gl.clear(webglContext.gl.COLOR_BUFFER_BIT);
    
    console.log('WebGL initialization successful!');
    console.log('Context:', webglContext);
    
  } catch (error) {
    console.error('Failed to initialize WebGL:', error);
    
    // Display error message to user
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      color: red;
      background: #ffe6e6;
      border: 1px solid red;
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
      font-family: monospace;
    `;
    
    if (error instanceof WebGLInitializationError) {
      errorDiv.textContent = `WebGL Error: ${error.message}`;
    } else {
      errorDiv.textContent = `Unexpected error: ${String(error)}`;
    }
    
    const appDiv = document.getElementById('app');
    if (appDiv) {
      appDiv.appendChild(errorDiv);
    }
  }
}

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
