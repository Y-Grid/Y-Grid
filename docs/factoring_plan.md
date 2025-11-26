# Refactoring Plan: Y-Grid Modernization

This document outlines the comprehensive plan to modernize `y-grid` by migrating to TypeScript incrementally, improving the development workflow, optimizing rendering performance, and introducing a renderer abstraction layer.

## 1. Codebase Convention Cleanup

**Goal**: Standardize file naming conventions and directory structure before proceeding with other refactoring tasks.

### Conventions

1. **File names**: Use hyphen-case (kebab-case), e.g., `foo-bar.js` not `foo_bar.js`
2. **Test directory**: Use `tests/` (plural), not `test/`
3. **Test files**: Use `.test.js` or `.test.ts` suffix, e.g., `foo.test.js` not `foo_test.js`

### Tasks
- [x] Rename all source files with underscores to use hyphens
- [x] Rename `test/` directory to `tests/`
- [x] Rename all test files to use `.test.js` suffix
- [x] Update all import statements to reflect new file names
- [x] Update test configuration to use `tests/` directory

---

## 2. TypeScript Migration (Incremental)

**Goal**: Gradually convert the codebase to TypeScript to improve type safety, maintainability, and developer experience. This is an **incremental migration** - JavaScript and TypeScript will coexist during the transition.

### Strategy
- **File-by-file migration**: Convert files one at a time, starting with core modules
- **Mixed codebase**: Allow `.js` and `.ts` files to coexist
- **Progressive strictness**: Start with loose TypeScript settings, tighten over time
- **Final phase**: Disallow JavaScript once migration is complete

### Setup Tasks
- [ ] Install `typescript` and `@types/node` as dev dependencies
- [ ] Create `tsconfig.json` with `allowJs: true` and loose strictness settings
- [ ] Update `package.json` scripts to include type checking (`tsc --noEmit`)
- [ ] Update `vite.config.js` to handle mixed JS/TS codebase
- [ ] Configure build to generate `.d.ts` declaration files

### Migration Checklist (by module)

#### Core Modules
- [ ] `src/core/cell_range.js` → `src/core/cell_range.ts`
- [ ] `src/core/alphabet.js` → `src/core/alphabet.ts`
- [ ] `src/core/row.js` → `src/core/row.ts`
- [ ] `src/core/col.js` → `src/core/col.ts`
- [ ] `src/core/merge.js` → `src/core/merge.ts`
- [ ] `src/core/formula.js` → `src/core/formula.ts`
- [ ] `src/core/cell.js` → `src/core/cell.ts`
- [ ] `src/core/selector.js` → `src/core/selector.ts`
- [ ] `src/core/scroll.js` → `src/core/scroll.ts`
- [ ] `src/core/history.js` → `src/core/history.ts`
- [ ] `src/core/clipboard.js` → `src/core/clipboard.ts`
- [ ] `src/core/auto_filter.js` → `src/core/auto_filter.ts`
- [ ] `src/core/validation.js` → `src/core/validation.ts`
- [ ] `src/core/data_proxy.js` → `src/core/data_proxy.ts`

#### Canvas/Rendering
- [ ] `src/canvas/draw.js` → `src/canvas/draw.ts`

#### Components
- [ ] `src/component/element.js` → `src/component/element.ts`
- [ ] `src/component/table.js` → `src/component/table.ts`
- [ ] `src/component/sheet.js` → `src/component/sheet.ts`
- [ ] `src/component/editor.js` → `src/component/editor.ts`
- [ ] `src/component/toolbar.js` → `src/component/toolbar.ts`
- [ ] `src/component/scrollbar.js` → `src/component/scrollbar.ts`
- [ ] (other components as needed)

#### Entry Point
- [ ] `src/index.js` → `src/index.ts`

#### Type Definitions
- [ ] Create `src/types/cell.ts` - Cell, CellData interfaces
- [ ] Create `src/types/style.ts` - Style, Border, Font interfaces
- [ ] Create `src/types/range.ts` - Range, Box interfaces
- [ ] Create `src/types/config.ts` - Configuration options interface

#### Finalization
- [ ] Set `allowJs: false` in tsconfig.json
- [ ] Enable `strict: true` in tsconfig.json
- [ ] Remove all remaining `any` types

---

## 3. Dev Workflow Optimization

**Goal**: Ensure `npm run dev` builds the library in watch mode and serves the demo with the latest code automatically.

### Current State
- `demo/index.html` imports `/dist/y-grid.js`
- `npm run dev` runs `vite` (dev server), which serves `src` but the demo explicitly asks for `dist`

### Proposed Solution
We will use `vite build --watch` to continuously rebuild the `dist` artifacts, and run a static server for the `demo` directory in parallel.

### Tasks
- [ ] Install `concurrently` to run multiple commands
- [ ] Add `watch:build` script: `vite build --watch`
- [ ] Add `serve:demo` script: `vite preview`
- [ ] Update `dev` script: `concurrently "npm run watch:build" "npm run serve:demo"`
- [ ] Create `demo/index.dev.html` that imports from `/src/index.ts` directly (for HMR)
- [ ] Update `vite.config.ts` to serve `demo/index.dev.html` during `npm run dev`

---

## 4. Rendering Performance Optimization

**Goal**: Optimize rendering performance through virtual scrolling, caching, dirty region tracking, and chunked rendering.

### 4.1 Virtual Scrolling
Only render cells that are visible in the current viewport.

- [ ] Calculate visible row/column range based on scroll position
- [ ] Implement row virtualization - render only visible rows
- [ ] Implement column virtualization - render only visible columns
- [ ] Add buffer zones (render extra rows/cols outside viewport for smoother scrolling)
- [ ] Update on scroll with debouncing/throttling

### 4.2 Dirty Region Rendering
Only re-render regions that have changed.

- [ ] Implement dirty region tracking system
- [ ] Mark cells/regions as dirty on data changes
- [ ] Mark cells/regions as dirty on style changes
- [ ] Mark cells/regions as dirty on selection changes
- [ ] Only repaint dirty regions instead of full canvas
- [ ] Clear dirty flags after render

### 4.3 Text Rendering Cache
Cache rendered text to avoid expensive text measurement and drawing.

- [ ] Create text metrics cache (width, height per string/font combo)
- [ ] Create off-screen canvas for text rendering cache
- [ ] Implement cache invalidation on font/style changes
- [ ] Implement LRU eviction for cache size management

### 4.4 Cell Rendering Cache
Cache rendered cells to avoid redundant drawing operations.

- [ ] Create off-screen canvas/ImageBitmap cache for cell content
- [ ] Cache cells by content + style hash
- [ ] Implement cache invalidation strategy
- [ ] Use cached images for repeated cells (e.g., same value/style)

### 4.5 Chunked Rendering (Tiled Rendering)
Divide the grid into chunks/tiles for efficient rendering and caching.

- [ ] Define chunk size (e.g., 10x10 cells per chunk)
- [ ] Implement chunk-based rendering system
- [ ] Cache rendered chunks as ImageBitmap/off-screen canvas
- [ ] Invalidate only affected chunks on changes
- [ ] Implement chunk recycling for memory efficiency

### 4.6 Scroll Experience Optimization
Improve the perceived smoothness of scrolling.

- [ ] Implement requestAnimationFrame-based scroll rendering
- [ ] Add momentum scrolling support
- [ ] Implement scroll position prediction for pre-rendering
- [ ] Optimize scroll event handling (passive listeners, throttling)
- [ ] Consider using CSS transforms for scroll offset (GPU acceleration)

### 4.7 Data Structure Simplification
Simplify internal data structures for better performance.

- [ ] Audit current `Rows` class nested object structure
- [ ] Consider flat array storage for dense data
- [ ] Consider sparse map for sparse data
- [ ] Reduce object allocation during cell access
- [ ] Profile and optimize hot paths in data access

---

## 5. Renderer Abstraction Layer

**Goal**: Introduce an abstract renderer interface to decouple rendering logic from the specific rendering implementation, allowing future backends (Canvas2D, WebGL, WebGPU, or custom renderers).

### Architecture

```typescript
abstract class Renderer {
  abstract drawRect(x: number, y: number, width: number, height: number, style: RectStyle): void;
  abstract drawLine(x1: number, y1: number, x2: number, y2: number, style: LineStyle): void;
  abstract drawText(text: string, x: number, y: number, style: TextStyle): void;
  abstract fillRect(x: number, y: number, width: number, height: number, color: string): void;
  abstract strokeRect(x: number, y: number, width: number, height: number, style: StrokeStyle): void;
  abstract clear(): void;
  abstract beginPath(): void;
  abstract closePath(): void;
  abstract save(): void;
  abstract restore(): void;
  abstract setClip(x: number, y: number, width: number, height: number): void;
  abstract measureText(text: string, style: TextStyle): TextMetrics;
}
```

### Tasks

#### Interface Definition
- [ ] Create `src/renderer/types.ts` - RectStyle, LineStyle, TextStyle, StrokeStyle interfaces
- [ ] Create `src/renderer/renderer.ts` - Abstract Renderer base class
- [ ] Define all primitive drawing operations needed by the grid

#### Canvas2D Implementation (Current)
- [ ] Create `src/renderer/canvas2d-renderer.ts`
- [ ] Implement all abstract methods using Canvas 2D API
- [ ] Extract current rendering logic from `Draw` class
- [ ] Ensure backward compatibility with existing code

#### Refactor Existing Code
- [ ] Update `Draw` class to use `Renderer` interface
- [ ] Update `Table` component to accept `Renderer` instance
- [ ] Add renderer configuration option to Spreadsheet options

#### Future Renderer Support
- [ ] (Future) Create `src/renderer/webgl-renderer.ts`
- [ ] (Future) Create `src/renderer/webgpu-renderer.ts`
- [ ] (Future) Allow custom renderer injection via configuration

### Configuration Example

```typescript
const spreadsheet = new Spreadsheet('#container', {
  renderer: 'canvas2d', // default
  // or
  renderer: new CustomRenderer(),
});
```

---

## 6. Execution Order

1. **Codebase Convention Cleanup** (Consistency) - First priority
2. **TypeScript Migration - Setup** (Foundation)
3. **Dev Workflow Optimization** (Productivity)
4. **Renderer Abstraction Layer** (Architecture)
5. **Rendering Performance Optimization** (Performance)
6. **TypeScript Migration - Continue incrementally** (Ongoing)

### Priority Matrix

| Task | Impact | Effort | Priority |
|------|--------|--------|----------|
| Convention Cleanup | Medium | Low | Highest |
| TS Setup | Medium | Low | High |
| Dev Workflow | Medium | Low | High |
| Renderer Abstraction | High | Medium | High |
| Virtual Scrolling | High | Medium | High |
| Dirty Region Rendering | High | Medium | High |
| Text Cache | Medium | Low | Medium |
| Cell Cache | Medium | Medium | Medium |
| Chunked Rendering | High | High | Medium |
| Scroll Optimization | Medium | Low | Medium |
| Data Structure Simplification | Medium | High | Low |
| TS Full Migration | Medium | High | Ongoing |
