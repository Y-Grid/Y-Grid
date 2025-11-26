# PRD: Rendering Pipeline

## Overview

Rebuild the rendering pipeline to achieve 60fps scrolling on 10K+ row datasets.

**Current State**: Every interaction triggers a full canvas redraw. No dirty tracking, no layering, no render batching.

**Target State**: Only render visible cells, only redraw what changed, batch updates to animation frames.

---

## Problem Statement

### Current Bottlenecks

1. **`Table.render()` redraws everything**
   - Called on scroll, selection, edit, resize
   - Loops through entire visible range every time
   - No concept of "what changed"

2. **No viewport calculation**
   - `viewRange` comes from `DataProxy`, includes more than visible
   - No buffer management for smooth scrolling

3. **Single canvas**
   - Selection changes = full redraw
   - Grid lines redrawn even when only content changes

4. **Synchronous rendering**
   - Multiple events can trigger multiple renders per frame
   - No batching, no priority

### Evidence

From `src/component/table.js`:
```javascript
render() {
  this.draw.resize(data.viewWidth(), data.viewHeight());
  this.clear();  // <- clears entire canvas

  const viewRange = data.viewRange();
  renderContentGrid.call(this, viewRange, ...);  // <- redraws all grid lines
  renderContent.call(this, viewRange, ...);      // <- redraws all cells
  renderFixedHeaders.call(this, ...);            // <- redraws all headers
  // ... every single time
}
```

---

## Goals

| Metric | Current | Target |
|--------|---------|--------|
| 10K rows scroll | ~15fps | 60fps |
| 100K rows scroll | unusable | 30fps |
| Selection change render | ~50ms | <5ms |
| Cell edit render | ~50ms | <5ms |

---

## Solution Design

### Component 1: Viewport

**File**: `src/core/viewport.ts`

Manages which cells are visible and need rendering.

```typescript
interface ViewportConfig {
  containerWidth: number;
  containerHeight: number;
  bufferRows: number;      // extra rows above/below (default: 5)
  bufferCols: number;      // extra cols left/right (default: 3)
}

interface VisibleRange {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
  // Pixel offsets for partial cell at edges
  offsetX: number;
  offsetY: number;
}

class Viewport {
  constructor(config: ViewportConfig);

  // Set scroll position, returns true if visible range changed
  setScroll(x: number, y: number): boolean;

  // Get current visible range (cached)
  getVisibleRange(): VisibleRange;

  // Check if a cell is in visible range
  isVisible(row: number, col: number): boolean;

  // Update on resize
  setSize(width: number, height: number): void;

  // Dependencies
  setRowManager(rm: RowManager): void;
  setColManager(cm: ColManager): void;
}
```

**Key behaviors**:
- Uses binary search to find first visible row/col from scroll position
- Caches visible range, only recalculates when scroll position changes
- Includes buffer zone for pre-rendering

---

### Component 2: DirtyTracker

**File**: `src/core/dirty-tracker.ts`

Tracks what regions need redrawing.

```typescript
type DirtyType = 'cell' | 'row' | 'col' | 'range' | 'layer' | 'all';

interface DirtyRegion {
  type: DirtyType;
  layer?: 'grid' | 'content' | 'overlay';
  // For cell/range types
  rowStart?: number;
  rowEnd?: number;
  colStart?: number;
  colEnd?: number;
}

class DirtyTracker {
  // Mark regions dirty
  markCell(row: number, col: number): void;
  markRow(row: number): void;
  markCol(col: number): void;
  markRange(rowStart: number, colStart: number, rowEnd: number, colEnd: number): void;
  markLayer(layer: 'grid' | 'content' | 'overlay'): void;
  markAll(): void;

  // Query
  isDirty(): boolean;
  getDirtyRegions(): DirtyRegion[];

  // After render
  clear(): void;

  // Optimization: collapse overlapping regions
  optimize(): void;
}
```

**Key behaviors**:
- Coalesces multiple dirty marks (e.g., 100 cell marks → 1 range)
- Separate tracking per layer
- `optimize()` merges overlapping regions before render

---

### Component 3: RenderScheduler

**File**: `src/core/render-scheduler.ts`

Batches render requests to animation frames.

```typescript
type RenderPriority = 'high' | 'normal' | 'low';

interface RenderRequest {
  priority: RenderPriority;
  layer?: 'grid' | 'content' | 'overlay';
}

class RenderScheduler {
  constructor(renderFn: () => void);

  // Request a render (batched to next frame)
  schedule(request?: RenderRequest): void;

  // Force immediate render (use sparingly)
  flush(): void;

  // Pause/resume (for bulk operations)
  pause(): void;
  resume(): void;

  // Stats
  getFrameTime(): number;  // last render duration
}
```

**Key behaviors**:
- Multiple `schedule()` calls per frame → single render
- High priority requests processed first
- Tracks render timing for performance monitoring
- `pause()`/`resume()` for bulk data loads

---

### Component 4: LayeredCanvas

**File**: `src/canvas/layered-canvas.ts`

Manages multiple canvas layers.

```typescript
interface Layer {
  name: string;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  zIndex: number;
}

class LayeredCanvas {
  constructor(container: HTMLElement);

  // Layer management
  createLayer(name: string, zIndex: number): Layer;
  getLayer(name: string): Layer;

  // Resize all layers
  setSize(width: number, height: number): void;

  // Clear specific layer
  clearLayer(name: string): void;

  // Clear all
  clearAll(): void;

  // Get drawing context for layer
  getContext(name: string): CanvasRenderingContext2D;
}
```

**Standard layers**:
```
z-index 0: 'grid'     - Grid lines, cell backgrounds
z-index 1: 'content'  - Cell text, icons
z-index 2: 'overlay'  - Selection, highlights, cursor, frozen indicator
```

**Key behaviors**:
- All canvases absolutely positioned, stacked
- Each layer clears/redraws independently
- Transparent backgrounds on upper layers

---

## Implementation Plan

### Step 1: Viewport (Foundation)

1. Create `src/core/viewport.ts`
2. Implement binary search for row/col lookup
3. Add buffer zone logic
4. Unit tests with mock row/col managers
5. Integrate with `Table` - replace `data.viewRange()`

**Dependencies**: Needs `RowManager`/`ColManager` interfaces (can mock initially)

**Validation**: Log visible range on scroll, verify it's minimal

---

### Step 2: RenderScheduler (Quick Win)

1. Create `src/core/render-scheduler.ts`
2. Wrap `Table.render()` with scheduler
3. Add frame timing measurement
4. Add pause/resume for bulk operations

**Dependencies**: None

**Validation**: Console log showing batched renders, measure fps

---

### Step 3: DirtyTracker (Enable Partial Redraws)

1. Create `src/core/dirty-tracker.ts`
2. Mark dirty on: data change, style change, selection, scroll
3. Integrate with `Table.render()` - check dirty before redraw
4. Implement region coalescing

**Dependencies**: None, but needs integration points in Sheet/DataProxy

**Validation**: Log dirty regions, verify minimal regions marked

---

### Step 4: LayeredCanvas (Separate Concerns)

1. Create `src/canvas/layered-canvas.ts`
2. Refactor `Table` to use LayeredCanvas
3. Move grid rendering to grid layer
4. Move content rendering to content layer
5. Move selection rendering to overlay layer
6. Update dirty tracking to specify layer

**Dependencies**: Steps 1-3 complete

**Validation**: Selection changes only redraw overlay layer

---

### Step 5: Partial Redraw (Final Integration)

1. Implement clip-based partial redraw
2. Only redraw dirty regions within visible viewport
3. Optimize common paths:
   - Scroll: shift existing content, draw new edges
   - Selection: only redraw overlay
   - Single cell edit: only redraw that cell

**Dependencies**: Steps 1-4 complete

**Validation**: Hit target metrics

---

## API Changes

### Table

```typescript
// Before
class Table {
  render(): void;  // full redraw
}

// After
class Table {
  // Request render (batched)
  requestRender(priority?: RenderPriority): void;

  // Force immediate (rare)
  forceRender(): void;

  // Partial invalidation
  invalidateCell(row: number, col: number): void;
  invalidateRange(range: CellRange): void;
  invalidateSelection(): void;
  invalidateAll(): void;
}
```

### Sheet Integration Points

```typescript
// On data change
this.table.invalidateCell(row, col);
this.table.requestRender();

// On selection change
this.table.invalidateSelection();
this.table.requestRender('high');

// On scroll
this.table.requestRender();

// On bulk load
this.table.pauseRender();
// ... load data ...
this.table.resumeRender();
this.table.invalidateAll();
```

---

## File Structure

```
src/
├── core/
│   ├── viewport.ts          # NEW
│   ├── dirty-tracker.ts     # NEW
│   └── render-scheduler.ts  # NEW
├── canvas/
│   ├── layered-canvas.ts    # NEW
│   └── draw.js              # existing, minimal changes
└── component/
    └── table.js → table.ts  # major refactor
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing functionality | High | Incremental integration, feature flags |
| Performance regression during refactor | Medium | Benchmark before/after each step |
| Complex merge conflicts | Low | Work on isolated new files first |
| Edge cases (frozen rows, merged cells) | Medium | Test matrix for special cases |

---

## Testing Strategy

### Unit Tests

- `viewport.test.ts`: Range calculation, buffer zones, edge cases
- `dirty-tracker.test.ts`: Region coalescing, layer separation
- `render-scheduler.test.ts`: Batching, priority, pause/resume

### Integration Tests

- Scroll performance benchmark (10K, 50K, 100K rows)
- Selection change timing
- Cell edit timing
- Frozen row/col rendering
- Merged cell rendering

### Manual Testing

- Visual inspection of rendering artifacts
- Scroll smoothness on various devices
- Memory usage over time (leak detection)

---

## Success Criteria

- [ ] 10K rows: 60fps scroll sustained
- [ ] 100K rows: 30fps scroll sustained
- [ ] Selection change: <5ms render time
- [ ] Single cell edit: <5ms render time
- [ ] No visual artifacts or flicker
- [ ] All existing features still work (frozen, merge, filter)
- [ ] Memory stable over 1 hour of usage

---

## Out of Scope

- WebGL renderer (Phase 8)
- Web Worker offloading (future)
- Virtual DOM for overlays (not needed with canvas)
- Touch gesture optimization (separate effort)
