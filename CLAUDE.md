# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

y-grid is a high-performance web-based grid library that renders using HTML5 Canvas. Forked from x-spreadsheet.

This is a **monorepo** using npm workspaces:
- `packages/y-grid/` - Core grid package
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
cd packages/y-grid && npx vitest run tests/core/formula.test.js
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
│       │   ├── index.js       # Main entry point (Spreadsheet class)
│       │   ├── core/          # Data layer
│       │   ├── component/     # UI components
│       │   ├── canvas/        # Canvas drawing utilities
│       │   └── locale/        # i18n
│       ├── tests/
│       ├── assets/
│       ├── vite.config.js
│       ├── tsconfig.json
│       └── biome.json
├── demo/                      # Demo application (shared)
├── docs/                      # Documentation & PRDs
└── package.json               # Workspace root
```

## Architecture

### Core Data Flow

1. **Spreadsheet** (`src/index.js`) - Main entry point, manages multiple sheets via `DataProxy`
2. **DataProxy** (`src/core/data-proxy.js`) - Central data store for each sheet:
   - Cell data, styles, merges, validations
   - Selection state (`Selector`)
   - Scroll position (`Scroll`)
   - Undo/redo history (`History`)
3. **Sheet** (`src/component/sheet.js`) - UI controller:
   - Canvas rendering via `Table`
   - User input handling
   - Toolbar, context menus, scrollbars

### Rendering

All content is drawn on a single `<canvas>` element by `Table` (`src/component/table.js`) using drawing utilities from `src/canvas/draw.js`.

### Key Modules

- `src/core/cell-range.js` - CellRange class for range operations
- `src/core/alphabet.js` - Column letter ↔ index conversion (A=0, B=1)
- `src/core/row.js` / `src/core/col.js` - Row/column dimensions
- `src/core/formula.js` - Formula functions (SUM, AVERAGE, MAX, MIN, IF, etc.)

### Component Pattern

UI components use a lightweight DOM helper:
```javascript
import { h } from './element';
const div = h('div', 'my-class').children(child1, child2);
```

## Configuration

**Biome** (`packages/y-grid/biome.json`):
- Single quotes
- Semicolons required
- 2-space indentation

**TypeScript** (`packages/y-grid/tsconfig.json`):
- Mixed JS/TS codebase (`allowJs: true`)
- Incremental migration in progress

## Roadmap

See `docs/refactoring_plan.md` for the full roadmap. Key priorities:

1. **Performance** - Virtual scrolling, dirty region tracking, layered canvas
2. **TypeScript** - Incremental migration
3. **Plugin system** - For optional features like Excel import
