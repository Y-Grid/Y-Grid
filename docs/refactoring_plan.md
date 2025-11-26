# Y-Grid Refactoring Plan

## Vision

**Build a high-performance canvas-based grid library.**

Not a spreadsheet. Not an Excel clone. A grid that can handle 100K+ rows smoothly.

Basic formulas (SUM, AVERAGE, IF, etc.) are kept as opt-in features, but performance is the #1 priority.

---

## Core Problem

The current codebase was designed as a "looks like Excel" demo, not a performance-focused data grid. Key issues:

1. **No true virtualization** - Renders more cells than necessary
2. **Full canvas redraws** - Every interaction triggers complete repaint
3. **Naive data structures** - Nested objects don't scale to large datasets
4. **Monolithic architecture** - `DataProxy` does too much, hard to optimize
5. **Synchronous formula evaluation** - Blocks rendering

---

## Phase 1: Foundation (Current)

**Goal**: Clean codebase, monorepo structure, TypeScript setup, dev workflow

### 1.1 Codebase Conventions
- [x] Rename files to kebab-case
- [x] Rename `test/` to `tests/`
- [x] Update imports

### 1.2 Monorepo Setup
- [ ] Create `packages/` directory
- [ ] Move `src/` to `packages/y-grid/src/`
- [ ] Set up pnpm workspaces
- [ ] Create `packages/y-grid/package.json`
- [ ] Update root `package.json` as workspace root
- [ ] Update build scripts for multi-package
- [ ] Move `demo/` to root level (shared)
- [ ] Move `tests/` to `packages/y-grid/tests/`

### 1.3 TypeScript Setup
- [x] Install TypeScript
- [x] Create `tsconfig.json` with `allowJs: true`
- [ ] Add `npm run typecheck` script
- [ ] Configure Vite for mixed JS/TS

### 1.4 Dev Workflow
- [ ] Fix `npm run dev` to work with demo
- [ ] Hot reload during development

---

## Phase 2: Rendering Pipeline (HIGH PRIORITY)

**Goal**: Only render what's visible, only redraw what changed

### 2.1 Virtual Viewport
Calculate and render only visible cells:

```
visibleRows = ceil(viewportHeight / avgRowHeight) + buffer
visibleCols = ceil(viewportWidth / avgColWidth) + buffer
```

Tasks:
- [ ] Create `Viewport` class to manage visible range
- [ ] Calculate visible row/col indices from scroll position
- [ ] Add buffer rows/cols for smooth scrolling (e.g., 5 extra each direction)
- [ ] Update `Table.render()` to use viewport, not full data range

### 2.2 Dirty Region Tracking
Don't redraw everything on every change:

```typescript
interface DirtyRegion {
  type: 'cell' | 'row' | 'col' | 'range' | 'all';
  area: CellRange | null;
}
```

Tasks:
- [ ] Create `DirtyTracker` class
- [ ] Mark regions dirty on: data change, style change, selection change, scroll
- [ ] Implement partial canvas redraw (clip to dirty region)
- [ ] Clear dirty flags after render

### 2.3 Layered Canvas
Separate static content from dynamic overlays:

```
Layer 1 (bottom): Grid lines, cell backgrounds
Layer 2 (middle): Cell content, text
Layer 3 (top): Selection, highlights, cursor
```

Tasks:
- [ ] Create multi-canvas stack in `Table`
- [ ] Render grid/backgrounds to base layer (rarely changes)
- [ ] Render cell content to content layer
- [ ] Render selection to overlay layer (changes often, cheap to redraw)
- [ ] Only redraw affected layers

### 2.4 RequestAnimationFrame Batching
Don't render on every event:

```typescript
class RenderScheduler {
  private pending = false;

  schedule() {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.render();
      this.pending = false;
    });
  }
}
```

Tasks:
- [ ] Create `RenderScheduler`
- [ ] Queue all render requests through scheduler
- [ ] Batch multiple changes into single frame
- [ ] Implement render priority (selection > content > grid)

---

## Phase 3: Data Layer (HIGH PRIORITY)

**Goal**: Data structures that scale to 100K+ rows

### 3.1 Columnar Storage
Current: `rows[ri].cells[ci].text` - object traversal per cell access
Better: Flat typed arrays per column

```typescript
class ColumnStore {
  // Sparse storage for large datasets with gaps
  private data: Map<number, CellValue> = new Map();

  // Or dense storage for continuous data
  private dense: CellValue[] = [];

  get(row: number): CellValue;
  set(row: number, value: CellValue): void;
}
```

Tasks:
- [ ] Design `ColumnStore` interface
- [ ] Implement sparse storage (Map-based) for typical use
- [ ] Implement dense storage (Array-based) for bulk data
- [ ] Create `DataStore` to manage columns
- [ ] Migrate away from nested `rows.cells` structure

### 3.2 Row/Column Metadata
Separate dimensions from data:

```typescript
class RowManager {
  private heights: number[] = [];      // or Map for sparse
  private hidden: Set<number> = new Set();
  private defaultHeight: number = 25;

  getHeight(index: number): number;
  getY(index: number): number;  // cumulative, cached
  findRowAtY(y: number): number;  // binary search
}
```

Tasks:
- [ ] Create `RowManager` with height caching
- [ ] Create `ColManager` with width caching
- [ ] Cache cumulative positions (avoid summing on every access)
- [ ] Implement binary search for coordinate-to-index lookup

### 3.3 Selection State
Decouple selection from data:

```typescript
class SelectionManager {
  primary: CellRange;
  ranges: CellRange[];  // multi-select

  isSelected(row: number, col: number): boolean;
  getSelectionForRow(row: number): number[];  // fast column lookup
}
```

Tasks:
- [ ] Extract selection from `DataProxy`
- [ ] Create standalone `SelectionManager`
- [ ] Optimize `isSelected()` for render loop
- [ ] Support multi-range selection

---

## Phase 4: Scroll Performance

**Goal**: 60fps scrolling on large datasets

### 4.1 Scroll Position Management
```typescript
class ScrollManager {
  x: number = 0;
  y: number = 0;

  // Cached derived values
  firstVisibleRow: number = 0;
  firstVisibleCol: number = 0;
  offsetY: number = 0;  // pixel offset within first row
  offsetX: number = 0;

  setScroll(x: number, y: number): void;
}
```

Tasks:
- [ ] Create `ScrollManager` with derived value caching
- [ ] Debounce scroll events (or use passive listeners)
- [ ] Calculate row/col indices only when scroll position changes
- [ ] Pre-calculate visible range on scroll start

### 4.2 Scroll Rendering Optimization
- [ ] Use CSS transform for sub-cell scroll offset (GPU accelerated)
- [ ] Implement "scroll by row" mode for very large datasets
- [ ] Add momentum/inertial scrolling support
- [ ] Pre-render adjacent regions during idle time

---

## Phase 5: Caching

**Goal**: Avoid redundant work

### 5.1 Text Measurement Cache
`measureText()` is expensive. Cache results:

```typescript
class TextMetricsCache {
  private cache: Map<string, TextMetrics> = new Map();

  measure(text: string, font: string): TextMetrics {
    const key = `${font}|${text}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, ctx.measureText(text));
    }
    return this.cache.get(key)!;
  }
}
```

Tasks:
- [ ] Create `TextMetricsCache` with LRU eviction
- [ ] Use cache in all text rendering
- [ ] Invalidate on font change
- [ ] Consider pre-measuring common strings

### 5.2 Cell Render Cache
For cells that don't change often:

```typescript
class CellRenderCache {
  // Cache rendered cells as ImageBitmap
  private cache: Map<string, ImageBitmap> = new Map();

  getCacheKey(row: number, col: number, value: any, style: Style): string;
  get(key: string): ImageBitmap | undefined;
  set(key: string, bitmap: ImageBitmap): void;
}
```

Tasks:
- [ ] Create cell render cache
- [ ] Generate cache keys from content + style hash
- [ ] Use `OffscreenCanvas` for cache rendering
- [ ] Implement cache eviction strategy

---

## Phase 6: Formula Engine (LOW PRIORITY)

**Goal**: Keep formulas working but don't let them block rendering

### 6.1 Lazy Evaluation
Only calculate visible/requested cells:

```typescript
class FormulaEngine {
  evaluate(row: number, col: number): CellValue {
    // Check if already calculated and not dirty
    // Calculate only when needed
  }

  markDirty(range: CellRange): void;
}
```

Tasks:
- [ ] Make formula evaluation lazy
- [ ] Track cell dependencies
- [ ] Only recalculate dirty cells
- [ ] Defer off-screen formula calculation

### 6.2 Async Calculation (Future)
- [ ] Move heavy calculations to Web Worker
- [ ] Show placeholder while calculating
- [ ] Batch formula updates

---

## Phase 7: TypeScript Migration (ONGOING)

Migrate files to TypeScript incrementally, prioritizing:

1. **Core data structures** (enables type-safe refactoring)
   - [ ] `src/core/cell-range.ts`
   - [x] `src/core/alphabet.ts`
   - [x] `src/core/clipboard.ts`
   - [ ] `src/core/row.ts`
   - [ ] `src/core/col.ts`

2. **New code** (all new modules in TypeScript)
   - [ ] `src/core/viewport.ts`
   - [ ] `src/core/dirty-tracker.ts`
   - [ ] `src/core/render-scheduler.ts`

3. **Rendering** (after architecture stabilizes)
   - [ ] `src/canvas/draw.ts`
   - [ ] `src/component/table.ts`

4. **Components** (last, most churn expected)
   - [ ] `src/component/sheet.ts`
   - [ ] Others as needed

---

## Phase 8: Renderer Abstraction (FUTURE)

**Goal**: Allow different rendering backends

```typescript
interface Renderer {
  fillRect(x: number, y: number, w: number, h: number, color: string): void;
  strokeRect(x: number, y: number, w: number, h: number, style: StrokeStyle): void;
  drawText(text: string, x: number, y: number, style: TextStyle): void;
  drawLine(x1: number, y1: number, x2: number, y2: number, style: LineStyle): void;
  clear(): void;
  // ...
}

class Canvas2DRenderer implements Renderer { ... }
class WebGLRenderer implements Renderer { ... }  // future
```

Tasks:
- [ ] Define `Renderer` interface
- [ ] Implement `Canvas2DRenderer`
- [ ] Refactor `Table` to use `Renderer`
- [ ] (Future) `WebGLRenderer` for extreme performance

---

## Priority Summary

| Phase | Priority | Impact | Effort |
|-------|----------|--------|--------|
| 2. Rendering Pipeline | **CRITICAL** | Very High | Medium |
| 3. Data Layer | **CRITICAL** | Very High | High |
| 4. Scroll Performance | HIGH | High | Medium |
| 5. Caching | MEDIUM | Medium | Low |
| 1. Foundation | MEDIUM | Low | Low |
| 7. TypeScript | ONGOING | Medium | Ongoing |
| 6. Formula Engine | LOW | Low | Medium |
| 8. Renderer Abstraction | FUTURE | Medium | High |

---

## Success Metrics

- [ ] Render 10K rows at 60fps scroll
- [ ] Render 100K rows at 30fps scroll
- [ ] Initial render < 100ms for 10K rows
- [ ] Memory usage < 100MB for 100K rows
- [ ] Bundle size < 50KB gzipped (core only)

---

## Non-Goals

- Full Excel formula compatibility
- Excel file import/export
- Collaborative editing
- Cell formatting beyond basics
- Charts/visualizations

These can be add-ons, but the core must stay lean and fast.
