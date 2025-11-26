# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

y-grid is a high-performance web-based grid library that renders using HTML5 Canvas. Forked from x-spreadsheet.

This is a **monorepo** using npm workspaces:
- `packages/y-grid/` - Core grid package (includes CSV import)
- `packages/y-grid-excel/` - Excel import plugin (planned)

## Development Commands

All commands run from the repository root:

```bash
npm install          # Install dependencies (all packages)
npm run dev          # Start dev server at http://localhost:8080
npm run build        # Production build
npm run test         # Run tests with Vitest
npm run typecheck    # TypeScript type checking
npm run lint         # Run Biome linter
npm run lint:fix     # Auto-fix lint issues
npm run format       # Format code with Biome
```

### Running a single test

```bash
npm run test -- --filter="formula"
# or directly in package
cd packages/y-grid && npx vitest run tests/core/formula.test.ts
```

### Working with specific package

```bash
npm run build -w y-grid        # Build only y-grid
npm run test -w y-grid         # Test only y-grid
```

## Project Structure

```
y-grid/
├── packages/
│   └── y-grid/                # Core package
│       ├── src/
│       │   ├── index.ts       # Main entry point (YGrid class)
│       │   ├── core/          # Data layer (TypeScript)
│       │   ├── component/     # UI components (TypeScript)
│       │   ├── canvas/        # Canvas drawing utilities
│       │   └── locale/        # i18n
│       ├── tests/
│       ├── assets/
│       │   └── sprite.svg     # Toolbar icons
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── biome.json
├── demo/                      # Demo application (shared)
├── docs/                      # Documentation & PRDs
└── package.json               # Workspace root
```

## Architecture

### Core Data Flow

1. **YGrid** (`src/index.ts`) - Main entry point, manages multiple sheets via `DataProxy`
2. **DataProxy** (`src/core/data-proxy.ts`) - Central data store for each sheet:
   - Cell data, styles, merges, validations
   - Selection state (`Selector`)
   - Scroll position (`Scroll`)
   - Undo/redo history (`History`)
3. **Sheet** (`src/component/sheet.ts`) - UI controller:
   - Canvas rendering via `Table`
   - User input handling
   - Toolbar, context menus, scrollbars

### Rendering

All content is drawn on a single `<canvas>` element by `Table` (`src/component/table.ts`) using drawing utilities from `src/canvas/draw.ts`.

### Key Modules

- `src/core/cell-range.ts` - CellRange class for range operations
- `src/core/alphabet.ts` - Column letter ↔ index conversion (A=0, B=1)
- `src/core/row.ts` / `src/core/col.ts` - Row/column dimensions
- `src/core/formula.ts` - Formula functions (SUM, AVERAGE, MAX, MIN, IF, etc.)

### Component Pattern

UI components use a lightweight DOM helper:
```typescript
import { h } from './element';
const div = h('div', 'my-class').children(child1, child2);
```

## Configuration

**Biome** (`packages/y-grid/biome.json`):
- Single quotes
- Semicolons required
- 2-space indentation

**TypeScript** (`packages/y-grid/tsconfig.json`):
- Full TypeScript codebase (migration complete)

## Features

### CSV Import (Built-in)

```typescript
// Import from file
await grid.importCSV(file);

// Import from text
grid.importCSVText('name,age\nJohn,30\nJane,25');
```

The CSV parser is RFC 4180 compliant with auto-delimiter detection.

### Toolbar Icons

Custom icons can be added to the toolbar via `extendToolbar`. Available built-in icons:
- `file-import` - Open folder icon
- `save` - Floppy disk icon
- Plus all standard icons (undo, redo, bold, italic, etc.)

## Roadmap

See `docs/refactoring_plan.md` for the full roadmap. Key priorities:

1. **Performance** - Virtual scrolling, dirty region tracking, layered canvas
2. **Plugin system** - For optional features like Excel import
