// Quick debug script to test the transform
import * as Transform from './src/symmetry/transform.js';

const point = { x: 612, y: 512 }; // 100 pixels right of center
console.log('Original point:', point);

const result = Transform.transformPointByAxis(point, 0);
console.log('Transformed by axis 0:', result);

const centerRelative = { x: point.x - 512, y: point.y - 512 };
console.log('Relative to center:', centerRelative);

const resultRelative = { x: result.x - 512, y: result.y - 512 };
console.log('Result relative to center:', resultRelative);

// Manual calculation
const angle = 0;
console.log('Axis angle:', angle);
console.log('Rotation angle to Y-axis:', -angle - Math.PI/2);

// Test the reflection matrix directly
const reflection = Transform.createReflectionMatrix();
console.log('Reflection matrix:', reflection);

const reflectedPoint = Transform.applyTransformToPoint(centerRelative, reflection);
console.log('Direct reflection result:', reflectedPoint);