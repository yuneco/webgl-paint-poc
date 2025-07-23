# Project Structure & Organization

## Directory Layout

```
webgl-paint-poc/
├── src/
│   ├── app/           # Main application orchestration
│   ├── data/          # Test data and fixtures
│   ├── input/         # Input processing and coordinate transforms
│   ├── integration/   # Integration tests
│   ├── math/          # Mathematical utilities (matrices, transforms)
│   ├── store/         # State management (Zustand stores)
│   ├── symmetry/      # Symmetry transformation logic
│   ├── types/         # TypeScript type definitions
│   └── webgl/         # WebGL rendering engine
├── public/            # Static assets
└── .kiro/
    └── specs/         # Project specifications and design docs
```

## Module Organization Principles

### Separation of Concerns

- **Input layer**: Raw event handling, coordinate transformation, throttling
- **State layer**: Application state management, immutable updates
- **Rendering layer**: WebGL operations, shader management, buffer handling
- **Business logic**: Symmetry calculations, stroke processing, performance monitoring

### File Naming Conventions

- **Implementation files**: PascalCase (e.g., `PaintApp.ts`, `WebGLRenderer.ts`)
- **Test files**: Same name + `.test.ts` suffix
- **Type definition files**: Descriptive names (e.g., `core.ts`, `coordinates.ts`)
- **Integration tests**: Descriptive names in `integration/` folder

## Key Modules

### `/src/app/`

- **PaintApp.ts**: Main application class orchestrating all systems
- **PaintApp.test.ts**: Application-level integration tests
- Entry point for the complete drawing application

### `/src/input/`

- **InputEventHandler.ts**: Raw pointer/touch event processing
- **InputProcessor.ts**: High-level input coordination
- **InputThrottler.ts**: Performance optimization for input events
- **CoordinateTransform.ts**: Coordinate system conversions

### `/src/webgl/`

- **WebGLRenderer.ts**: High-level rendering interface
- **context.ts**: WebGL context initialization and feature detection
- **shaders.ts**: Shader compilation and management
- **buffers.ts**: Vertex buffer management
- **renderer.ts**: Low-level rendering operations

### `/src/store/`

- **coreStore.ts**: Core application state (drawing, symmetry, view)
- **uiStore.ts**: UI-specific state (controls, debug info)
- **index.ts**: Store integration and helper functions

### `/src/symmetry/`

- **transform.ts**: Mathematical symmetry transformations
- **symmetryRenderer.ts**: Symmetry-aware rendering logic

### `/src/types/`

- **core.ts**: Core data structures (StrokeData, StrokePoint, etc.)
- **coordinates.ts**: Coordinate system type definitions
- **state.ts**: State management type definitions

## Import Conventions

### Relative Imports

- Use relative imports within the same module directory
- Use absolute imports from `src/` for cross-module dependencies

### Example Import Patterns

```typescript
// Within same module
import { InputThrottler } from "./InputThrottler";

// Cross-module imports
import { StrokeData } from "../types/core";
import { coreStore } from "../store/coreStore";
```

## Testing Structure

### Test File Organization

- **Unit tests**: Co-located with implementation files
- **Integration tests**: Separate `/src/integration/` directory
- **Test data**: Centralized in `/src/data/` directory

### Test Categories

- **Unit tests**: Individual class/function testing
- **Integration tests**: Multi-component interaction testing
- **Browser tests**: WebGL context and rendering validation

## Configuration Files

### Root Level

- **package.json**: Dependencies and scripts
- **tsconfig.json**: TypeScript compilation settings
- **vitest.config.ts**: Test configuration with browser support
- **index.html**: Application entry point

### Development

- **src/setup.ts**: Test environment setup
- **src/vite-env.d.ts**: Vite type definitions

## Code Organization Rules

### Functional-First Architecture

- **Primary approach**: Pure functions with explicit dependencies
- **State management**: Centralized in Zustand stores, never duplicated in classes
- **Data flow**: Unidirectional - State → Functions → New State
- **Side effects**: Isolated and explicit, never hidden in class methods

### Function Organization Principles

- **Pure functions first**: Stateless functions over stateful classes
- **Explicit parameters**: All dependencies passed as function parameters
- **Immutable operations**: Never mutate input parameters
- **Single responsibility**: One function, one clear purpose
- **Predictable behavior**: Same input always produces same output
- **Coordinate transformations**: Always implemented as pure functions
- **State updates**: Through immutable patterns only
- **Error handling**: Explicit return types, avoid exceptions

### Class Usage Restrictions

- **Prohibited patterns**:

  - Classes that maintain application state (use Zustand instead)
  - Classes with configuration state (use function parameters)
  - Classes that duplicate store state (violates single source of truth)
  - Large orchestration classes (break into pure functions)

- **Permitted patterns**:
  - Mathematical utilities (Matrix3x3) - immutable operations only
  - Error types - simple data containers
  - Resource managers - WebGL contexts with explicit lifecycle
  - Small, focused utilities without state

### Anti-Patterns to Avoid

- **Stateful coordinators**: Large classes that orchestrate multiple systems
- **Configuration holders**: Classes that store settings or preferences
- **State duplicators**: Classes that cache or mirror Zustand state
- **Hidden dependencies**: Classes that access global state internally
- **Mutable operations**: Classes that modify their input parameters

### Module Dependencies

- No circular dependencies between modules
- Clear dependency hierarchy: app → store/input/webgl → types/math
- Shared utilities in dedicated modules (math, types)
