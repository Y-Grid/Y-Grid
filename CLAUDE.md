# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

y-grid is a web-based JavaScript spreadsheet library that renders using HTML5 Canvas. Forked from x-spreadsheet.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server at http://localhost:8080
npm run build        # Production build (outputs to dist/)
npm run preview      # Preview production build
npm run lint         # Run Biome linter
npm run lint:fix     # Auto-fix lint issues
npm run format       # Format code with Biome
npm run test         # Run tests with Mocha + nyc coverage
```

### Running a single test

```bash
./node_modules/mocha/bin/mocha --require @babel/register test/core/formula_test.js
```

## Architecture

### Core Data Flow

The spreadsheet follows a data-driven architecture:

1. **Spreadsheet** (`src/index.js`) - Main entry point that manages multiple sheets via `DataProxy` instances
2. **DataProxy** (`src/core/data_proxy.js`) - Central data store for each sheet. Manages:
   - Cell data, styles, merges, validations
   - Selection state (`Selector`)
   - Scroll position (`Scroll`)
   - Undo/redo history (`History`)
   - Clipboard operations
   - Auto-filter and sorting
3. **Sheet** (`src/component/sheet.js`) - UI controller that coordinates:
   - Canvas rendering via `Table`
   - User input via `Editor`, `Selector`, keyboard/mouse events
   - Toolbar, context menus, scrollbars, resizers

### Rendering

All spreadsheet content is drawn on a single `<canvas>` element by `Table` (`src/component/table.js`) which uses drawing utilities from `src/canvas/draw.js`.

### Key Core Modules

- `src/core/cell_range.js` - CellRange class for range operations (A1:B5 style)
- `src/core/alphabet.js` - Column letter ↔ index conversion (A=0, B=1, etc.)
- `src/core/row.js` / `src/core/col.js` - Row/column data and dimensions
- `src/core/merge.js` - Merged cell tracking
- `src/core/formula.js` - Built-in formula functions (SUM, AVERAGE, MAX, MIN, IF, AND, OR, CONCAT)

### Component Structure

UI components in `src/component/` use a lightweight DOM helper (`element.js`) for creating elements:
```javascript
import { h } from './element';
const div = h('div', 'my-class').children(child1, child2);
```

### Localization

Locale files in `src/locale/` (en.js, zh-cn.js, de.js, nl.js). Use `locale()` and `t()` from `src/locale/locale.js`.

## Configuration

Biome is used for linting and formatting (see `biome.json`):
- Single quotes
- Semicolons required
- 2-space indentation
- Parameter reassignment allowed
