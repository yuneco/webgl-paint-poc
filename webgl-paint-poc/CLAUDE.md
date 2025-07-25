# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Rules

### Development Server Management
- **Server Access**: Check if http://localhost:5173/ is already running before starting the dev server
- **Start Command**: Use `pnpm run dev` (not `npm run dev`) only if localhost:5173 is not accessible
- **Playwright Testing**: Always use Playwright MCP for browser interaction testing and debugging UI issues

### Browser Testing Protocol
- For UI functionality testing and debugging, use `mcp__playwright__browser_navigate` to http://localhost:5173/
- Use Playwright MCP tools for DOM interaction, form testing, and visual verification
- Capture screenshots or snapshots when reporting UI issues

## Essential Commands

### Development
- `pnpm run dev` - Start development server (only if localhost:5173 is not running)
- `npm run build` - Build for production (TypeScript compilation + Vite build)
- `npm run typecheck` - Type checking only
- `npm run preview` - Preview production build

### Testing
- `npm test` - Run all tests (Vitest browser mode with Chromium)
- `npm test -- --run` - Run tests once without watch mode
- `npm test -- --run src/path/to/specific.test.ts` - Run specific test file
- `npm test -- src/input/` - Run all tests in input directory

## Architecture Overview

This is a **WebGL-based symmetry paint engine PoC** with real-time 8-axis radial symmetry drawing capabilities. The architecture follows functional programming principles with separated concerns.

### Core System Components

**Input Processing Pipeline:**
```
Raw Input → Coordinate Transform → Input Correction → Symmetry Transform → WebGL Rendering
```

**State Management:**
- **Zustand stores**: Separated into core (drawing logic) and UI (demo interface) stores
- **Pure functions**: All processing functions are stateless and side-effect free
- **Unidirectional data flow**: Input → State → Render cycle

**Key Architectural Layers:**

1. **Input Layer** (`src/input/`):
   - `InputEventHandler`: Raw pointer event normalization
   - `InputProcessor`: Basic throttling and filtering
   - `ExtendedInputProcessor`: Advanced correction pipeline (Task 6.6)
   - **Input Correction System**: Pressure correction + coordinate smoothing with <16ms latency requirement

2. **Mathematics Layer** (`src/math/`):
   - `Matrix3x3`: 3x3 matrix operations for transformations
   - `splineUtils`: Catmull-Rom spline interpolation and smoothing algorithms

3. **Symmetry System** (`src/symmetry/`):
   - `transform.ts`: 8-axis radial symmetry transformations (D8 dihedral group)
   - `symmetryRenderer.ts`: Generates symmetric strokes from single input

4. **WebGL Rendering** (`src/webgl/`):
   - `context.ts`: WebGL context initialization and feature detection
   - `shaders.ts`: Vertex and fragment shader management
   - `buffers.ts`: WebGL buffer management for stroke data
   - `renderer.ts`: Main rendering pipeline

5. **State Management** (`src/store/`):
   - `coreStore.ts`: Core application state (drawing, symmetry, performance)
   - `uiStore.ts`: UI-specific state (demo controls, debug settings)
   - Includes Task 6.6 input correction UI state

6. **Application Layer** (`src/app/`):
   - `PaintApp.ts`: Main application class integrating all systems
   - `PaintAppFactory.ts`: Factory for creating configured instances

### Performance Requirements

- **60fps target**: Continuous drawing performance maintained
- **<16ms input latency**: Task 6.6 requirement for input correction pipeline
- **<1ms processing time per point**: Individual correction operations
- **WebGL optimization**: Vertex buffer management and batch rendering

### Testing Architecture

**Browser-based Testing:**
- Uses Vitest with WebdriverIO for real browser WebGL context
- Tests run in Chromium with headless: false (required for WebGL)
- Setup in `src/setup.ts` with WebGL test environment initialization

**Test Categories:**
- **Unit tests**: Mathematical accuracy, pure function behavior
- **Integration tests**: Component interaction, full pipeline testing  
- **Performance tests**: Latency measurement, throughput validation
- **WebGL tests**: Shader compilation, buffer operations, rendering accuracy

### Key Design Patterns

**Function-Based Architecture:**
- Input correction functions are pure: `(input, history, config) => output[]`
- Coordinate transformations use immutable matrix operations
- Symmetry transforms are mathematical functions without side effects

**Configuration-Driven:**
- Device-specific optimizations (Apple Pencil, Wacom, generic)
- Correction pipeline configurability (pressure, smoothing, real-time vs quality)
- UI state drives correction behavior through Zustand stores

**Streaming Processing:**
- `createStreamingCorrector()` maintains bounded history for real-time processing
- Input throttling and adaptive quality degradation under time pressure

### Critical Implementation Details

**Coordinate Systems:**
- Canvas coordinates: 0-1024 (fixed size)
- WebGL normalized coordinates: -1 to 1
- Pointer event coordinates: Device-dependent, transformed via ViewTransformState

**Symmetry Mathematics:**
- 8-axis radial symmetry using dihedral group D8
- 4 reflection axes + 3 rotations + identity
- Center point fixed at (512, 512)

**Input Correction (Task 6.6):**
- **Pressure correction**: Device calibration, temporal smoothing, noise filtering
- **Coordinate smoothing**: Linear (real-time) vs Catmull-Rom (quality) algorithms
- **Performance monitoring**: Comprehensive metrics collection with <16ms validation

### File Organization Logic

```
src/
├── input/          # Input processing pipeline (including Task 6.6 corrections)
├── math/           # Mathematical utilities (matrices, splines)
├── symmetry/       # 8-axis symmetry transformation system
├── webgl/          # WebGL rendering pipeline
├── store/          # Zustand state management (core + UI)
├── app/            # Application integration layer
├── types/          # TypeScript type definitions
└── integration/    # Cross-system integration tests
```

### Demo Interface

The `index.html` contains a comprehensive demo with:
- **Interactive paint canvas**: Real-time drawing with symmetry
- **Static test canvas**: Programmatic stroke rendering
- **Task 6.6 controls**: Pressure correction and smoothing parameter adjustment
- **Performance monitoring**: Real-time metrics display

### Development Notes

**WebGL Context Requirements:**
- Requires real browser context for testing (headless: false in vitest.config.ts)
- Feature detection for required WebGL extensions
- Proper cleanup and error handling for context loss

**Performance Monitoring:**
- Global performance monitor available via `getGlobalPerformanceMonitor()`
- Benchmark suite for regression testing
- Quality metrics for correction effectiveness assessment

**Common Issues:**
- File-based serving may fail due to CORS; use development server
- WebGL context initialization requires error handling for older browsers
- Input correction settings need integration with PaintApp for live functionality