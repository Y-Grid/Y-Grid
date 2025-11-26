# PRD: File Import

## Overview

**CSV import is built into core** (`y-grid`). Excel import is a **separate npm package** (`y-grid-excel`).

---

## Problem Statement

Currently, there's no way for users to load their own data into the grid. The demo only shows hardcoded sample data. Users want to:

1. Test the grid with their own datasets
2. Quickly visualize CSV/Excel files
3. Benchmark performance with real-world data sizes

CSV parsing is lightweight (~2KB). Excel parsing requires the `xlsx` library (~200KB gzipped) - too heavy for core.

---

## Goals

- **CSV in core**: Zero-config CSV import for all users
- **Excel as separate package**: True zero-cost if not installed
- **Monorepo structure**: Shared tooling, easy development
- Handle large files (10K+ rows) without freezing UI
- Provide feedback during import (progress, errors)

---

## Package Structure

```
y-grid (npm)         → Core library with CSV support (~50KB)
y-grid-excel (npm)   → Excel plugin, peer depends on y-grid (~200KB)
```

### Monorepo Layout

```
y-grid/
├── packages/
│   ├── y-grid/                 # Core package
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── core/
│   │   │   │   ├── plugin.ts       # Plugin interface
│   │   │   │   └── csv-parser.ts   # Built-in CSV
│   │   │   └── ...
│   │   └── dist/
│   │
│   └── y-grid-excel/           # Excel plugin package
│       ├── package.json        # peer: y-grid, dep: xlsx
│       ├── src/
│       │   ├── index.ts
│       │   └── parser.ts
│       └── dist/
│
├── package.json                # Workspace root (npm workspaces)
└── demo/                       # Shared demo
```

### Package Dependencies

**y-grid/package.json**:
```json
{
  "name": "y-grid",
  "version": "1.0.0",
  "main": "dist/y-grid.js",
  "module": "dist/y-grid.esm.js",
  "types": "dist/index.d.ts"
}
```

**y-grid-excel/package.json**:
```json
{
  "name": "y-grid-excel",
  "version": "1.0.0",
  "main": "dist/y-grid-excel.js",
  "module": "dist/y-grid-excel.esm.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "y-grid": "^1.0.0"
  },
  "dependencies": {
    "xlsx": "^0.18.5"
  }
}
```

---

## User Flow

```
1. User clicks file icon in header
2. Native file picker opens (accept: .csv, .xlsx, .xls)
3. User selects file
4. Loading indicator appears
5. File is parsed
6. Grid is populated with data
7. Success: Grid shows data, toast confirms row count
   Error: Toast shows error message
```

---

## Solution Design

### Core: CSV Import (y-grid)

CSV import is built into the Spreadsheet class:

```typescript
// In y-grid core
class Spreadsheet {
  // Built-in CSV support
  importCSV(file: File, options?: CSVOptions): Promise<ImportResult>;

  // Generic import - CSV works out of the box
  importFile(file: File): Promise<ImportResult>;

  // Plugin system
  use(plugin: Plugin, options?: any): this;
}

interface CSVOptions {
  hasHeader?: boolean;     // default: true
  delimiter?: string;      // default: auto-detect
  maxRows?: number;        // default: 100000
}

interface Plugin {
  name: string;
  install(grid: Spreadsheet, options?: any): void;
  uninstall?(grid: Spreadsheet): void;
}
```

### Excel Import (y-grid-excel)

Separate npm package that extends y-grid:

```typescript
// y-grid-excel/src/index.ts
import type { Plugin, Spreadsheet } from 'y-grid';
import { parseExcel } from './parser';

export const excelPlugin: Plugin = {
  name: 'excel',
  install(grid, options = {}) {
    // Extend importFile to handle .xlsx/.xls
    const originalImport = grid.importFile.bind(grid);

    grid.importFile = async (file: File) => {
      if (file.name.match(/\.xlsx?$/i)) {
        return grid.importExcel(file);
      }
      return originalImport(file);
    };

    // Add dedicated Excel method
    grid.importExcel = async (file: File) => {
      const data = await parseExcel(file, options);
      return grid.loadData(data);
    };
  }
};

export default excelPlugin;
```

### Usage

```bash
# Install core
npm install y-grid

# Optionally install Excel support
npm install y-grid-excel
```

```typescript
import { Spreadsheet } from 'y-grid';

// CSV works out of the box
const grid = new Spreadsheet('#container');
await grid.importCSV(csvFile);
await grid.importFile(csvFile);  // also works
```

```typescript
// With Excel support
import { Spreadsheet } from 'y-grid';
import excelPlugin from 'y-grid-excel';

const grid = new Spreadsheet('#container')
  .use(excelPlugin);

await grid.importFile(excelFile);  // now handles .xlsx
await grid.importExcel(excelFile); // dedicated method
```

### UI Component

**Location**: Demo header / toolbar (added by plugin)

```
[📁] [Grid Title]                    [other controls...]
 ^
 File import button (added by plugin)
```

**Button behavior**:
- Icon: folder/file icon (SVG)
- Tooltip: "Import CSV or Excel file"
- Click: Opens native file picker
- Accepts: `.csv`, `.xlsx`, `.xls`

### File Parsing

**CSV Parser**: Use built-in or lightweight library

```typescript
interface ParseOptions {
  hasHeader: boolean;      // first row is header (default: true)
  delimiter?: string;      // auto-detect or specify
  encoding?: string;       // default: UTF-8
}

async function parseCSV(file: File, options?: ParseOptions): Promise<ParseResult>;
```

**Excel Parser**: Use SheetJS (xlsx) library

```typescript
async function parseExcel(file: File, sheetIndex?: number): Promise<ParseResult>;
```

**Common result format**:

```typescript
interface ParseResult {
  headers: string[];       // column headers
  data: CellValue[][];     // row-major data
  rowCount: number;
  colCount: number;
  warnings?: string[];     // non-fatal issues
}
```

### Import Flow

```typescript
class FileImporter {
  constructor(grid: Spreadsheet);

  // Main entry point
  async import(file: File): Promise<ImportResult>;

  // Events
  onProgress?: (percent: number) => void;
  onError?: (error: Error) => void;
  onSuccess?: (result: ImportResult) => void;
}

interface ImportResult {
  rowCount: number;
  colCount: number;
  duration: number;        // ms
  truncated: boolean;      // if hit row limit
}
```

### Large File Handling

For files > 10K rows:
1. Parse in chunks (streaming for CSV)
2. Show progress indicator
3. Use `requestIdleCallback` or Web Worker for parsing
4. Consider row limit with warning (e.g., 100K rows max)

```typescript
const MAX_ROWS = 100_000;
const CHUNK_SIZE = 1000;

async function* parseCSVChunked(file: File): AsyncGenerator<CellValue[][]> {
  // Yield chunks of rows for progressive loading
}
```

---

## Implementation Plan

### Step 0: Monorepo Setup ✅ DONE

1. ~~Create `packages/` directory~~
2. ~~Move existing `src/` to `packages/y-grid/src/`~~
3. ~~Set up npm workspaces~~
4. ~~Update build scripts for multi-package~~

**Files**:
- `package.json` → workspace root with `"workspaces": ["packages/*"]`
- `packages/y-grid/package.json`

### Step 1: Plugin System (Foundation)

1. Define `Plugin` interface in `packages/y-grid/src/core/plugin.ts`
2. Add `use()` method to Spreadsheet class
3. Plugin registry for tracking installed plugins

**Files**:
- `packages/y-grid/src/core/plugin.ts` (NEW)
- `packages/y-grid/src/index.ts` → update Spreadsheet class

### Step 2: CSV Parser (Core) ✅ DONE

1. ~~Implement CSV parser in core~~
2. ~~Handle edge cases:~~
   - ~~Quoted fields with commas~~
   - ~~Newlines in quoted fields~~
   - ~~Different delimiters (comma, tab, semicolon)~~
3. ~~Auto-detect delimiter~~
4. ~~Add `importCSV()` and `importCSVText()` to YGrid class~~

**Files**:
- `packages/y-grid/src/core/csv-parser.ts` ✅
- `packages/y-grid/src/index.js` → added import methods ✅

### Step 3: Demo UI ✅ DONE

1. ~~Add file icon button to demo header (open folder icon)~~
2. ~~Wire up click → file input → `importCSV()`~~
3. Show loading state during import (TODO)
4. Show success/error toast (TODO - console.log for now)

**Files**:
- `demo/index.html` ✅
- `packages/y-grid/assets/sprite.svg` → added file-import & save icons ✅
- `packages/y-grid/src/index.less` → added icon CSS ✅

### Step 4: Excel Plugin Package

1. Create `packages/y-grid-excel/` directory
2. Set up package.json with peer dependency on y-grid
3. Implement Excel parser using `xlsx`
4. Export plugin that extends `importFile()`

**Files**:
- `packages/y-grid-excel/package.json` (NEW)
- `packages/y-grid-excel/src/index.ts` (NEW)
- `packages/y-grid-excel/src/parser.ts` (NEW)

### Step 5: UX Polish

1. Progress indicator for large files
2. Auto-fit columns after import (optional)
3. Better error messages

---

## Dependencies

**Core** (no new dependencies):
- Built-in CSV parser (~2KB)

**Excel Plugin**:
- `xlsx` (SheetJS) - ~200KB gzipped
- Installed only if user adds excel plugin to their project

---

## File Structure

Already defined in Package Structure section above. Key files:

**y-grid (core)**:
```
packages/y-grid/src/
├── core/
│   ├── plugin.ts          # Plugin interface
│   └── csv-parser.ts      # Built-in CSV parser
└── index.ts               # Exports Spreadsheet with CSV + plugin support
```

**y-grid-excel (plugin)**:
```
packages/y-grid-excel/src/
├── index.ts               # Plugin entry, exports excelPlugin
└── parser.ts              # Excel parsing using xlsx
```

### Build Output

```
# Published to npm as separate packages
y-grid          → ~50KB (core + CSV)
y-grid-excel    → ~200KB (xlsx bundled)
```

---

## API

### Public API (for library users)

```typescript
// Option 1: Method on Spreadsheet
spreadsheet.importFile(file: File): Promise<ImportResult>;

// Option 2: Standalone importer
const importer = new FileImporter(spreadsheet);
await importer.import(file);

// Option 3: Load parsed data directly
spreadsheet.loadData({
  headers: ['Name', 'Age', 'City'],
  rows: [
    ['Alice', 30, 'NYC'],
    ['Bob', 25, 'LA'],
  ]
});
```

### Events

```typescript
spreadsheet.on('import:start', (file: File) => {});
spreadsheet.on('import:progress', (percent: number) => {});
spreadsheet.on('import:success', (result: ImportResult) => {});
spreadsheet.on('import:error', (error: Error) => {});
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| Empty file | Show error: "File is empty" |
| Invalid CSV | Show error with line number |
| Corrupt Excel | Show error: "Unable to read file" |
| Very wide (1000+ cols) | Warning, may be slow |
| Very tall (100K+ rows) | Truncate with warning |
| Mixed encodings | Try UTF-8, fallback to Latin-1 |
| Binary in CSV | Skip row, show warning |
| Multiple sheets (Excel) | Use first sheet, future: sheet picker |

---

## Success Criteria

- [x] File icon visible in demo header
- [x] Click opens file picker
- [x] CSV import works (basic and quoted fields)
- [ ] Excel import works (.xlsx)
- [ ] Progress shown for files > 5K rows
- [x] Error messages are user-friendly
- [ ] 50K row CSV imports in < 3 seconds
- [ ] No UI freeze during import

---

## Out of Scope (Future)

- Export to CSV/Excel (separate PRD)
- Drag-and-drop file import
- URL import (fetch remote file)
- Google Sheets import
- Multiple sheet support (sheet picker UI)
- Column type detection (date, number, currency)
- Import settings dialog (delimiter, encoding, header row)

---

## Priority

**Medium** - Nice demo feature, helps with performance testing, but not core to grid performance goals.

### Recommended Order

1. **Step 0 (Monorepo)** - Do before any major refactoring
2. **Step 1 (Plugin System)** - Enables future plugins
3. **Step 2 (CSV Parser)** - Core feature
4. **Step 3 (Demo UI)** - Quick win for demo
5. **Step 4 (Excel Plugin)** - Optional, lower priority
6. **Step 5 (Polish)** - After rendering pipeline is optimized

### Timing Consideration

Monorepo setup (Step 0) should happen early - it's easier to restructure before major code changes. Could be done as part of Phase 1 (Foundation) in the main refactoring plan.

CSV import should wait for RenderScheduler (Phase 2, Step 2) so large file imports benefit from batched rendering.
