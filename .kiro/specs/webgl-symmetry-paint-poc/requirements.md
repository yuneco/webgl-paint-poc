# Requirements Document

## Introduction

WebGL ベースの対称ペイントツールの Proof of Concept（PoC）を開発する。この PoC の主目的は、WebGL 描画エンジンの性能検証と、対称描画・タイリング表示機能の技術的実現可能性を確認することである。既存の Canvas2D ベースの実装（symmpaint）で発生したパフォーマンス問題を解決し、将来的なブラシパターン作成ツールの基盤技術として活用する。

## Requirements

### Requirement 1: WebGL 描画エンジンの性能検証

**User Story:** As a developer, I want to verify WebGL rendering performance for symmetrical drawing, so that I can determine if it's suitable for a full-featured brush pattern creation tool.

#### Acceptance Criteria

1. WHEN the application starts THEN the system SHALL initialize a 1024x1024 WebGL canvas
2. WHEN a user draws on the canvas THEN the system SHALL maintain 60fps during continuous drawing operations
3. WHEN drawing with symmetry enabled THEN the system SHALL render all symmetric strokes without visible lag
4. WHEN measuring performance THEN the system SHALL provide FPS counter and memory usage indicators
5. IF drawing performance drops below 30fps THEN the system SHALL log performance metrics for analysis

### Requirement 2: 対称描画機能の実装

**User Story:** As a user, I want to draw with automatic symmetry, so that I can create symmetric patterns efficiently.

#### Acceptance Criteria

1. WHEN the canvas is initialized THEN the system SHALL set the center point (512, 512) as the symmetry origin
2. WHEN a user draws a stroke THEN the system SHALL automatically generate symmetric copies of the stroke
3. WHEN drawing occurs THEN the system SHALL support configurable symmetry axes (initially fixed at 8-way symmetry)
4. WHEN symmetric strokes are rendered THEN all strokes SHALL appear simultaneously without delay
5. WHEN the symmetry origin is at canvas center THEN all symmetric patterns SHALL be properly aligned

### Requirement 3: ズーム・タイリング表示機能

**User Story:** As a user, I want to zoom out and see tiled patterns, so that I can preview how my pattern looks when repeated.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL provide a zoom slider control
2. WHEN zoom level is at 100% THEN the system SHALL display only the main 1024x1024 canvas
3. WHEN zoom level is below 100% THEN the system SHALL display tiled repetitions of the canvas pattern
4. WHEN zooming out THEN the tiling SHALL update smoothly without performance degradation
5. WHEN tiled patterns are displayed THEN they SHALL seamlessly connect at boundaries
6. WHEN zoom changes THEN the system SHALL maintain the center point as the zoom focus

### Requirement 4: 入力処理とスムージング

**User Story:** As a user, I want smooth drawing input with pressure sensitivity, so that I can create natural-looking strokes.

#### Acceptance Criteria

1. WHEN using a pressure-sensitive device THEN the system SHALL capture and apply pressure values to stroke width
2. WHEN drawing quickly THEN the system SHALL apply smoothing to prevent jagged lines
3. WHEN touch input is used THEN the system SHALL properly handle touch events for tablet compatibility
4. WHEN input events occur THEN the system SHALL process them with minimal latency
5. WHEN drawing continuously THEN the system SHALL maintain consistent stroke quality

### Requirement 5: 技術仕様とパフォーマンス測定

**User Story:** As a developer, I want comprehensive performance metrics, so that I can evaluate the technical feasibility for production use.

#### Acceptance Criteria

1. WHEN the application runs THEN the system SHALL display real-time FPS counter
2. WHEN drawing operations occur THEN the system SHALL monitor memory usage patterns
3. WHEN performance testing THEN the system SHALL log input latency measurements
4. WHEN WebGL context is used THEN the system SHALL efficiently manage GPU resources
5. WHEN long drawing sessions occur THEN the system SHALL detect and report memory leaks
6. WHEN comparing with Canvas2D THEN the system SHALL provide performance comparison data

### Requirement 6: 最小限の UI 実装

**User Story:** As a user, I want essential controls for testing, so that I can interact with the PoC effectively.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL provide a zoom slider (10% to 200%)
2. WHEN UI controls are displayed THEN they SHALL not interfere with drawing area
3. WHEN performance metrics are shown THEN they SHALL be clearly visible but non-intrusive
4. WHEN using the application THEN no complex UI elements SHALL be implemented (colors, brush sizes are fixed)
5. WHEN testing on tablets THEN the UI SHALL be touch-friendly

### Requirement 7: TypeScript 実装とモジュラー設計

**User Story:** As a developer, I want clean, maintainable code structure, so that the PoC can evolve into a full application.

#### Acceptance Criteria

1. WHEN implementing the PoC THEN the system SHALL use TypeScript for type safety
2. WHEN organizing code THEN the system SHALL separate concerns into distinct modules
3. WHEN WebGL operations are implemented THEN they SHALL be encapsulated in dedicated classes
4. WHEN adding new features THEN the modular structure SHALL support easy extension
5. WHEN building the project THEN the system SHALL use modern build tools (Vite recommended)
