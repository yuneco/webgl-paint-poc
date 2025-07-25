# Technology Stack & Build System

## Core Technologies

### Frontend Stack

- **TypeScript**: Strict mode enabled with ES2022 target
- **Vite**: Build tool and dev server with HMR support
- **WebGL 1.0**: Graphics rendering with ANGLE_instanced_arrays extension
- **Zustand**: Lightweight state management library
- **Vanilla JavaScript**: No framework dependencies for core functionality

### Testing & Quality

- **Vitest**: Unit and integration testing framework
- **Browser Testing**: Chromium via WebDriverIO for WebGL context testing
- **TypeScript Compiler**: Strict linting with unused parameter detection

### Development Tools

- **pnpm**: Package manager (lockfile present)
- **ESNext Modules**: Modern ES module system
- **Source Maps**: Development debugging support

## Build Commands

### Development

```bash
# Start development server with hot reload
npm run dev
# or
pnpm dev
```

### Testing

```bash
# Run all tests (requires browser context for WebGL)
npm test
# or
pnpm test
```

### Production Build

```bash
# TypeScript compilation + Vite build
npm run build
# or
pnpm build
```

### Preview

```bash
# Preview production build locally
npm run preview
# or
pnpm preview
```

## Technical Constraints

### WebGL Implementation

- **WebGL 1.0 only**: No WebGL2 dependencies
- **Extension usage**: ANGLE_instanced_arrays for symmetry rendering
- **Fallback strategy**: Multiple draw calls if instancing unavailable
- **Canvas size**: Fixed 1024x1024 logical resolution

### Performance Requirements

- **Target FPS**: 60fps minimum during continuous drawing
- **Memory management**: No memory leaks during 10+ minute sessions
- **Input latency**: <16ms from pointer event to render completion

### Browser Compatibility

- **Primary targets**: Chrome, Firefox, Safari (desktop)
- **Secondary targets**: iPad Safari, Android Chrome
- **Device support**: Apple Pencil, Wacom pressure-sensitive devices

## Architecture Patterns

### Functional-First Design Principles

- **Pure functions preferred**: Stateless functions over stateful classes
- **Explicit dependencies**: All required state passed as parameters
- **Immutable data**: No mutation of input parameters
- **Single responsibility**: Each function has one clear purpose
- **Predictable behavior**: Same input always produces same output
- **Testability**: Pure functions enable easy unit testing without mocks

### State Management

- **Centralized state**: All application state managed by Zustand stores
- **No duplicate state**: Classes must not maintain local state that duplicates store state
- **Immutable updates**: Pure functions for state transitions
- **Unidirectional data flow**: State → View → Actions → State
- **Explicit state dependencies**: Functions receive state as parameters, not through class properties
- **State isolation**: Drawing, input, view, and performance states are clearly separated

### Coordinate Systems

- **Canvas coordinates**: 0-1024 logical space
- **WebGL coordinates**: -1 to 1 normalized device coordinates
- **Pointer coordinates**: DOM offset coordinates
- **Transform matrices**: 3x3 matrices for all coordinate conversions
- **Pure transformation functions**: All coordinate conversions implemented as stateless functions

### Class Usage Guidelines

- **Avoid stateful classes**: Classes should not maintain application state
- **Permitted class usage**:
  - Mathematical utilities (Matrix3x3) - immutable operations only
  - Error types - simple data structures without behavior
  - Resource managers - WebGL contexts, GPU resources with explicit lifecycle
  - DOM integration - Canvas management, event listener coordination
- **Prohibited class usage**:
  - Application logic coordination (use functions + Zustand)
  - Input processing with internal state (use pure functions)
  - Coordinate transformation with cached state (use pure functions)
  - Configuration management (use Zustand stores)
  - Symmetry rendering with internal config (use pure functions with explicit parameters)

### Pure Function Implementation Patterns

- **Input processing**: Event normalization and filtering as pure functions
- **Coordinate transformation**: All transformations as stateless functions with explicit parameters
- **Symmetry generation**: Mathematical transformations without internal configuration
- **State updates**: Immutable state transitions through Zustand actions

### Error Handling

- **WebGL context loss**: Automatic recovery mechanisms
- **Shader compilation**: Detailed error logging and fallbacks
- **Input validation**: Coordinate clamping and pressure normalization
- **Functional error handling**: Return Result<T, E> types instead of throwing exceptions
- **Coordinate transformation errors**: Explicit error types with context information

### Implementation Success Metrics

- **Zero stateful classes**: All application logic implemented as pure functions
- **Centralized state**: All state managed through Zustand stores
- **Test coverage**: 100% test success rate maintained during refactoring
- **Performance**: No regression in 60fps target during continuous drawing
- **Code reduction**: Significant reduction in lines of code through elimination of duplicate state management
