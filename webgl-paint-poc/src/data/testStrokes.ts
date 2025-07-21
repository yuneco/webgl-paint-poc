import * as CoreTypes from '../types/core';

type StrokeData = CoreTypes.StrokeData;
type StrokePoint = CoreTypes.StrokePoint;
const SymmetryMode = CoreTypes.SymmetryMode;

// Helper function to create stroke points
function createStrokePoint(x: number, y: number, pressure: number = 0.8, timestampOffset: number = 0): StrokePoint {
  return {
    x,
    y,
    pressure,
    timestamp: Date.now() + timestampOffset,
  };
}

// Test stroke 1: Simple horizontal line
export const horizontalLineStroke: StrokeData = {
  id: 'test-horizontal-line',
  points: [
    createStrokePoint(200, 512, 0.5, 0),
    createStrokePoint(300, 512, 0.7, 10),
    createStrokePoint(400, 512, 0.8, 20),
    createStrokePoint(500, 512, 0.9, 30),
    createStrokePoint(600, 512, 0.8, 40),
    createStrokePoint(700, 512, 0.7, 50),
    createStrokePoint(800, 512, 0.5, 60),
  ],
  symmetryMode: SymmetryMode.RADIAL_8,
  timestamp: Date.now(),
  completed: true,
};

// Test stroke 2: Vertical line
export const verticalLineStroke: StrokeData = {
  id: 'test-vertical-line',
  points: [
    createStrokePoint(512, 200, 0.6, 0),
    createStrokePoint(512, 300, 0.7, 10),
    createStrokePoint(512, 400, 0.8, 20),
    createStrokePoint(512, 500, 0.9, 30),
    createStrokePoint(512, 600, 0.8, 40),
    createStrokePoint(512, 700, 0.7, 50),
    createStrokePoint(512, 800, 0.6, 60),
  ],
  symmetryMode: SymmetryMode.RADIAL_8,
  timestamp: Date.now(),
  completed: true,
};

// Test stroke 3: Diagonal line (center to corner)
export const diagonalLineStroke: StrokeData = {
  id: 'test-diagonal-line',
  points: [
    createStrokePoint(512, 512, 0.8, 0),
    createStrokePoint(550, 550, 0.9, 10),
    createStrokePoint(588, 588, 0.9, 20),
    createStrokePoint(626, 626, 0.8, 30),
    createStrokePoint(664, 664, 0.7, 40),
    createStrokePoint(702, 702, 0.6, 50),
    createStrokePoint(740, 740, 0.5, 60),
  ],
  symmetryMode: SymmetryMode.RADIAL_8,
  timestamp: Date.now(),
  completed: true,
};

// Test stroke 4: Simple arc (quarter circle)
export const arcStroke: StrokeData = {
  id: 'test-arc',
  points: (() => {
    const points: StrokePoint[] = [];
    const centerX = 512;
    const centerY = 512;
    const radius = 100;
    const steps = 20;
    
    for (let i = 0; i <= steps; i++) {
      const angle = (Math.PI / 2) * (i / steps); // 0 to 90 degrees
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const pressure = 0.5 + (0.4 * Math.sin((Math.PI * i) / steps)); // Varying pressure
      
      points.push(createStrokePoint(x, y, pressure, i * 5));
    }
    
    return points;
  })(),
  symmetryMode: SymmetryMode.RADIAL_8,
  timestamp: Date.now(),
  completed: true,
};

// Test stroke 5: Complex curved path (S-curve)
export const complexCurveStroke: StrokeData = {
  id: 'test-complex-curve',
  points: (() => {
    const points: StrokePoint[] = [];
    const steps = 30;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      
      // S-curve using sine wave
      const x = 300 + t * 400; // Move from x=300 to x=700
      const y = 512 + Math.sin(t * Math.PI * 2) * 80; // Sine wave with amplitude 80
      
      // Varying pressure based on curve position
      const pressure = 0.4 + 0.5 * Math.sin(t * Math.PI);
      
      points.push(createStrokePoint(x, y, pressure, i * 3));
    }
    
    return points;
  })(),
  symmetryMode: SymmetryMode.RADIAL_8,
  timestamp: Date.now(),
  completed: true,
};

// Test stroke 6: Spiral path
export const spiralStroke: StrokeData = {
  id: 'test-spiral',
  points: (() => {
    const points: StrokePoint[] = [];
    const centerX = 512;
    const centerY = 512;
    const steps = 40;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * Math.PI * 4; // 2 full rotations
      const radius = t * 60; // Expanding radius
      
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const pressure = 0.3 + 0.6 * (1 - t); // Decreasing pressure
      
      points.push(createStrokePoint(x, y, pressure, i * 4));
    }
    
    return points;
  })(),
  symmetryMode: SymmetryMode.RADIAL_8,
  timestamp: Date.now(),
  completed: true,
};

// Test stroke 7: Sharp angular path (zigzag)
export const zigzagStroke: StrokeData = {
  id: 'test-zigzag',
  points: (() => {
    const points: StrokePoint[] = [];
    const segments = 8;
    const amplitude = 60;
    
    for (let i = 0; i <= segments * 2; i++) {
      const x = 300 + (i / (segments * 2)) * 400;
      const y = 512 + (i % 2 === 0 ? amplitude : -amplitude);
      const pressure = 0.6 + 0.3 * (i % 2);
      
      points.push(createStrokePoint(x, y, pressure, i * 8));
    }
    
    return points;
  })(),
  symmetryMode: SymmetryMode.RADIAL_8,
  timestamp: Date.now(),
  completed: true,
};

// Collection of all test strokes
export const allTestStrokes: StrokeData[] = [
  horizontalLineStroke,
  verticalLineStroke,
  diagonalLineStroke,
  arcStroke,
  complexCurveStroke,
  spiralStroke,
  zigzagStroke,
];

// Test patterns for different symmetry scenarios
export const testPatterns = {
  // Single strokes for basic testing
  singleStrokes: [horizontalLineStroke, verticalLineStroke, diagonalLineStroke],
  
  // Curved strokes for advanced testing
  curvedStrokes: [arcStroke, complexCurveStroke, spiralStroke],
  
  // Angular strokes for edge case testing
  angularStrokes: [zigzagStroke],
  
  // All strokes combined
  allStrokes: allTestStrokes,
};

// Helper functions for validation
export function validateStrokeData(stroke: StrokeData): boolean {
  if (!stroke.id || stroke.points.length === 0) return false;
  
  return stroke.points.every(point => 
    point.x >= 0 && point.x <= 1024 &&
    point.y >= 0 && point.y <= 1024 &&
    point.pressure >= 0 && point.pressure <= 1
  );
}

export function getStrokeStats(stroke: StrokeData) {
  const points = stroke.points;
  const totalLength = points.reduce((length, point, index) => {
    if (index === 0) return 0;
    const prev = points[index - 1];
    const dx = point.x - prev.x;
    const dy = point.y - prev.y;
    return length + Math.sqrt(dx * dx + dy * dy);
  }, 0);
  
  const avgPressure = points.reduce((sum, point) => sum + point.pressure, 0) / points.length;
  const duration = points.length > 1 ? points[points.length - 1].timestamp - points[0].timestamp : 0;
  
  return {
    pointCount: points.length,
    totalLength: Math.round(totalLength),
    averagePressure: Math.round(avgPressure * 100) / 100,
    duration,
  };
}