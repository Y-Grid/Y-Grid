# PRD: Two-Layer Architecture (Meta-data / Real-data)

## Overview

Split the grid into two distinct layers: an optional **meta-data layer** for presentation (headers, titles, merged cells) and a **real-data layer** optimized for high-performance rendering of large datasets.

---

## Problem Statement

### Current State

The grid treats all cells uniformly, supporting merged cells throughout. This creates problems:

1. **Merged cells block columnar storage** - Can't use flat arrays when cells span multiple rows/columns
2. **Performance penalty** - Merge lookups on every render cycle
3. **Breaks data operations** - Sorting, filtering, selection don't work well with merged cells
4. **Complexity** - Every feature must handle merge edge cases

### Research Findings

Analysis of 12 grid/spreadsheet products shows:

| Product Type       | Merge Cells   | Examples                               |
| ------------------ | ------------- | -------------------------------------- |
| Spreadsheet clones | ✅ Yes        | Handsontable, jspreadsheet             |
| Data grids         | ❌ No/Limited | Tabulator, DevExtreme, react-data-grid |
| Modern data tools  | ❌ No         | Tableau, Airtable                      |

**Key insight**: Merged cells are a **presentation feature**, not a data feature. They belong in headers/titles, not in the data area.

---

## Why Merged Cells Are Not Supported in the Data Layer

### Industry Research

We analyzed 12 grid and spreadsheet products to understand how the industry handles merged cells:

| Product         | Type             | Merge Cells           | Notes                                                                     |
| --------------- | ---------------- | --------------------- | ------------------------------------------------------------------------- |
| AG Grid         | Data Grid        | ⚠️ Yes (with caveats) | "Breaks row/cell calculations", "cell selection will not work correctly"  |
| Handsontable    | Spreadsheet      | ✅ Yes                | "Scrolling may feel slower" with large spans                              |
| SlickGrid       | Data Grid        | ⚠️ Partial            | Colspan yes, rowspan only in forks. "Side effects require your own logic" |
| Tabulator       | Data Grid        | ❌ No                 | Not native, workarounds via rowFormatter                                  |
| DevExtreme      | Data Grid        | ❌ No                 | Requested since 2016, still not built-in for JS version                   |
| Syncfusion      | Data Grid        | ✅ Yes                | Via queryCellInfo event                                                   |
| Kendo UI        | Data Grid        | ✅ Yes                | "Not possible to have different colSpan for rows with rowSpan"            |
| jspreadsheet    | Spreadsheet      | ✅ Yes                | Spreadsheet-focused product                                               |
| Luckysheet      | Spreadsheet      | ✅ Yes                | Now deprecated, replaced by Univer                                        |
| react-data-grid | Data Grid        | ⚠️ Partial            | colSpan only, no rowSpan                                                  |
| Tableau         | BI/Visualization | ❌ No                 | Data visualization tool, not a spreadsheet                                |
| Airtable        | Database         | ❌ No                 | "Don't think Excel - think Filemaker or Access"                           |

**Pattern observed:**

- **Spreadsheet clones** (Handsontable, jspreadsheet, Luckysheet) → Full merge support (mimicking Excel)
- **Data grids** (Tabulator, DevExtreme, react-data-grid) → No or limited support (focused on data operations)
- **Modern data tools** (Tableau, Airtable) → No merge cells (data-first design)

### Problems with Merged Cells in Data Grids

Industry sources consistently highlight these issues:

1. **Breaks data operations**

   - "Merged cells break the uniform structure of rows and columns, making it impossible to filter or sort data accurately"
   - Pivot tables don't work with merged cells
   - Copy/paste becomes unpredictable

2. **Performance impact**

   - "When cells span thousands of rows or columns, scrolling may feel slower"
   - VBA benchmarks: "4 minutes with merge, 1 second without"
   - Memory overhead from tracking merge regions

3. **Blocks architectural optimization**

   - Cannot use columnar storage (flat arrays) when cells span multiple rows
   - Every render cycle must check "is this cell part of a merge?"
   - Virtual scrolling becomes complex with variable-height merged regions

4. **Even when supported, it's problematic**
   - AG Grid: "Cell Selection will not work correctly when spanning cells"
   - SlickGrid: "Side effects (Filtering, Sorting, Paging) require your own logic"
   - Kendo: "Limitations in how HTML tables can rowSpan/colSpan"

### The Real Use Case for Merged Cells

From the research, legitimate use cases for merged cells are:

- Report titles spanning multiple columns
- Column group headers
- Visual grouping for presentation
- Metadata and attribution

These are all **presentation concerns**, not data concerns. They belong in a header/title area, not in the scrollable data region.

As one source put it: "Merged cells should ONLY be used outside the data area... only to aggregate meta-data."

### Our Decision

Y-Grid's goal is **high-performance rendering of 100K+ rows**. Supporting merged cells in the data layer would:

- Block columnar storage (Phase 3.1)
- Complicate virtual scrolling
- Break sort/filter operations
- Add overhead to every render cycle

Instead, we provide a **meta-data layer** for presentation needs (titles, headers, merged cells) while keeping the **data layer** optimized and merge-free.

This aligns with how successful data grids (Tabulator, Airtable) and BI tools (Tableau) handle it: data is data, presentation is separate.

---

## Solution: Two-Layer Architecture

```
┌────────────────────────────────────────────────────────┐
│  Report Title: Q4 Sales Analysis                       │  ← META-DATA
│  Generated: 2024-12-01    Region: North America        │    (optional, supports merge)
├───────┬──────────┬─────────┬─────────┬───────────┬─────┤
│  ID   │  Product │   Qty   │  Price  │   Total   │     │  ← META-DATA (headers, optional)
├───────┼──────────┼─────────┼─────────┼───────────┼─────┤
│  001  │  Widget  │   100   │   5.00  │   500.00  │  ▲  │  ← REAL-DATA
│  002  │  Gadget  │   200   │   3.50  │   700.00  │  █  │    (scrollable, no merge)
│  ...  │   ...    │   ...   │   ...   │    ...    │  █  │
│  100K │   ...    │   ...   │   ...   │    ...    │  ▼  │
└───────┴──────────┴─────────┴─────────┴───────────┴─────┘
```

### Layer Comparison

| Aspect                   | Meta-data Layer             | Real-data Layer             |
| ------------------------ | --------------------------- | --------------------------- |
| **Purpose**              | Presentation, context       | Data display & manipulation |
| **Row count**            | Few (0-20)                  | Many (100K+)                |
| **Merge cells**          | ✅ Supported                | ❌ Not supported            |
| **Rendering**            | DOM or simple canvas        | Optimized canvas (layered)  |
| **Data structure**       | Current nested `rows.cells` | Columnar storage            |
| **Sorting**              | N/A                         | ✅ Full support             |
| **Filtering**            | N/A                         | ✅ Full support             |
| **Formulas**             | ❌ Not supported            | ✅ Supported                |
| **Selection**            | Limited                     | ✅ Full support             |
| **Virtual scrolling**    | Not needed                  | ✅ Required                 |
| **Column-aligned**       | ❌ No (free-form)           | ✅ Yes                      |
| **Performance priority** | Low                         | Critical                    |

### Column Headers

Column headers belong to the **meta-data layer**. Options:

1. **Default** - Auto-generated headers showing column IDs (A, B, C, ...)
2. **Custom labels** - Shows user-defined labels (SKU, Name, Price, ...)
3. **Hidden** - No headers (`showColumnHeaders: false`), build your own in meta-data rows

Since headers are in the meta-data layer, they stay fixed while data scrolls vertically.

```
With headers:                    Without headers (DIY):
┌───────────────────┐            ┌───────────────────┐
│ Title (merged)    │ ← meta     │ Title (merged)    │ ← meta
├─────┬─────┬───────┤            ├─────┬─────┬───────┤
│ SKU │Name │ Price │ ← meta     │ SKU │Name │ Price │ ← meta (custom row)
├─────┼─────┼───────┤            ├─────┼─────┼───────┤
│ 001 │ Wid │  5.0  │ ← data     │ 001 │ Wid │  5.0  │ ← data
│ 002 │ Gad │  3.5  │ ← data     │ 002 │ Gad │  3.5  │ ← data
└─────┴─────┴───────┘            └─────┴─────┴───────┘
```

---

## Meta-data Layer

### Purpose

Provide a flexible area for:

- Report titles and subtitles
- Date ranges, filters applied, generation timestamps
- Column group headers spanning multiple columns
- Footnotes, legends, data source attribution
- Any presentation element that benefits from merged cells

### Characteristics

- **Optional** - Grid works without it
- **Fixed position** - Does not scroll with data (or scrolls horizontally only)
- **Small** - Typically 1-20 rows
- **Flexible layout** - Merged cells, rich formatting, custom styles
- **Not part of data operations** - Excluded from sort, filter, export (unless explicitly included)

### Implementation

Reuse existing rendering code (simplified):

```typescript
interface MetaDataConfig {
  enabled: boolean;
  rows: MetaRow[];
  height?: number; // Fixed height or auto
  position: "top" | "bottom" | "both";
}

interface MetaRow {
  height?: number;
  cells: MetaCell[];
}

interface MetaCell {
  text: string;
  colspan?: number;
  rowspan?: number;
  style?: CellStyle;
}
```

### Rendering Options

1. **DOM-based** (simpler)

   - Use HTML table or divs
   - Native text selection, accessibility
   - Easy styling with CSS

2. **Canvas-based** (consistent)
   - Match look and feel with data layer
   - Single rendering approach
   - Use existing `Table` component (non-optimized)

**Recommendation**: Start with DOM-based for simplicity. Most meta-data is static after initial render.

---

## Real-data Layer

### Purpose

High-performance rendering of tabular data at scale.

### Characteristics

- **Core of the grid** - Always present
- **Virtual scrolling** - Only render visible cells
- **Columnar storage** - Flat arrays per column
- **No merged cells** - Every cell is independent
- **Full data operations** - Sort, filter, search, select
- **Optimized rendering** - Layered canvas, dirty tracking, RAF batching

### Data Structure

```typescript
interface RealDataStore {
  // Columnar storage
  columns: Map<string, ColumnData>;

  // Row metadata (heights, hidden state)
  rowManager: RowManager;

  // Column metadata (widths, hidden state)
  colManager: ColManager;

  // No merge tracking needed!
}

interface ColumnData {
  id: string;
  type: "string" | "number" | "boolean" | "date";

  // Dense storage for continuous data
  values: TypedArray | string[];

  // Or sparse storage for data with gaps
  sparse?: Map<number, CellValue>;
}
```

### Rendering

Use `OptimizedTable` with full rendering pipeline:

- Viewport calculation
- Dirty region tracking
- Layered canvas (grid, content, overlay)
- RAF batching

---

## Integration

### Grid Component Structure

```typescript
class YGrid {
  private metaLayer?: MetaDataLayer;
  private dataLayer: RealDataLayer;

  constructor(container: HTMLElement, options: GridOptions) {
    if (options.metaData?.enabled) {
      this.metaLayer = new MetaDataLayer(options.metaData);
    }
    this.dataLayer = new RealDataLayer(options.data);
  }
}
```

### Container Layout

```typescript
// Vertical stacking
const layout = `
  <div class="y-grid">
    <div class="y-grid-meta">      <!-- Optional, fixed height -->
      <!-- DOM or canvas for meta-data -->
    </div>
    <div class="y-grid-data">      <!-- Fills remaining space -->
      <!-- Optimized canvas layers -->
    </div>
  </div>
`;
```

### Scroll Behavior

| Scroll Direction | Meta-data              | Real-data |
| ---------------- | ---------------------- | --------- |
| Vertical         | Fixed (doesn't scroll) | Scrolls   |
| Horizontal       | Scrolls with data      | Scrolls   |

This keeps meta-data visible while scrolling through large datasets.

---

## API Design

### Configuration

```typescript
const grid = new YGrid(container, {
  // Meta-data layer (optional)
  metaData: {
    enabled: true,
    position: "top",
    rows: [
      {
        height: 40,
        cells: [
          { text: "Q4 Sales Report", colspan: 5, style: { font: "bold 18px" } },
        ],
      },
      {
        cells: [
          { text: "Region: North America", colspan: 2 },
          { text: "Period: Oct-Dec 2024", colspan: 3 },
        ],
      },
    ],
  },

  // Real-data layer
  showColumnHeaders: true, // Set to false to hide default headers
  columns: [
    { id: "A", label: "SKU", width: 60 }, // Shows "SKU" in header
    { id: "B", label: "Product", width: 150 }, // Shows "Product" in header
    { id: "C", label: "Qty", width: 80 }, // Shows "Qty" in header
    { id: "D", label: "Price", width: 80 }, // Shows "Price" in header
    { id: "E", width: 100 }, // No label = shows "E"
  ],

  data: [
    { A: "001", B: "Widget", C: 100, D: 5.0, E: 500.0 },
    // ... 100K more rows
  ],
});

// Formulas still reference by ID
// =SUM(D1:D100) works regardless of label
```

### Methods

```typescript
// Meta-data operations
grid.setMetaData(config: MetaDataConfig): void;
grid.updateMetaCell(row: number, col: number, value: string): void;
grid.showMetaData(): void;
grid.hideMetaData(): void;

// Real-data operations (unchanged)
grid.setData(data: RowData[]): void;
grid.getData(): RowData[];
grid.sort(column: string, direction: 'asc' | 'desc'): void;
grid.filter(predicate: FilterFn): void;
// ...
```

---

## Migration Path

### For Existing Users

1. **No merged cells in data** - No changes needed
2. **Merged cells for headers only** - Move to meta-data layer
3. **Merged cells in data area** - Not supported; restructure data or use grouping

### API Change

```typescript
// Real-data layer has no merge method - it simply doesn't exist
// Merging is only available in meta-data configuration

// Meta-data supports merge via colspan/rowspan
grid.setMetaData({
  rows: [{ cells: [{ text: "Header", colspan: 3 }] }],
});
```

---

## Implementation Plan

### Phase 1: Meta-data Layer (Low effort)

1. Create `MetaDataLayer` component
2. DOM-based rendering with HTML table
3. Support colspan/rowspan
4. Basic styling (font, alignment, background)
5. Horizontal scroll sync with data layer

### Phase 2: Real-data Layer Optimization (High effort)

1. Implement columnar `DataStore` (Phase 3.1 from refactoring plan)
2. Remove merge cell support from data layer
3. Integrate with `OptimizedTable`
4. Full sort/filter support

### Phase 3: Integration

1. Create unified `YGrid` wrapper
2. Layout management (meta + data)
3. Scroll synchronization
4. API unification

---

## Success Criteria

- [ ] Meta-data layer renders with merged cells
- [ ] Real-data layer handles 100K rows at 60fps scroll
- [ ] Horizontal scroll synced between layers
- [ ] Sort/filter work on real-data without merge complications
- [ ] Memory usage < 100MB for 100K rows
- [ ] Clean migration path for existing users

---

## Out of Scope

- Merged cells in real-data layer (explicitly not supported)
- Vertical scroll sync for meta-data (meta-data stays fixed)
- Editable meta-data cells (read-only for v1)
- Meta-data in exported files (data export only for v1)

---

## Risks & Mitigations

| Risk                              | Impact | Mitigation                                 |
| --------------------------------- | ------ | ------------------------------------------ |
| Breaking change for merge users   | Medium | Clear migration docs, deprecation warnings |
| Two rendering systems to maintain | Low    | Meta-data layer is simple, rarely changes  |
| Scroll sync complexity            | Medium | See detailed analysis below                |
| User confusion about layers       | Medium | Clear docs, examples, error messages       |

### Horizontal Scroll Sync with Merged Cells

When meta-data has merged cells and the user scrolls horizontally, there are edge cases to handle:

```
Initial state:                    After scrolling right:
┌─────────────────────────┐       ┌─────────────────────────┐
│  Title (spans A:E)      │       │le (spans A:E)           │  ← What happens here?
├─────┬─────┬─────┬─────┬─┤       ├─────┬─────┬─────┬─────┬─┤
│  A  │  B  │  C  │  D  │E│       │  C  │  D  │  E  │  F  │G│
├─────┼─────┼─────┼─────┼─┤       ├─────┼─────┼─────┼─────┼─┤
│  1  │  2  │  3  │  4  │5│       │  3  │  4  │  5  │  6  │7│
```

**Options to handle this:**

1. **Clip merged cells** (recommended)
   - Merged cell scrolls with data, gets clipped at viewport edge
   - Simple to implement, predictable behavior
   - Matches how frozen columns typically work

2. **Keep merged cells fixed**
   - Title area doesn't scroll horizontally
   - Only column headers and data scroll
   - More complex: need to split meta-data into "fixed" and "scrollable" regions

3. **Repeat merged cell content**
   - Show partial content with ellipsis or continuation indicator
   - More complex, may look cluttered

**Recommendation:** Start with option 1 (clip). It's the simplest and users will understand that scrolling hides part of the title. If users need fixed titles, they can use CSS to position content outside the grid.

**Implementation notes:**
- Meta-data canvas/DOM must sync `scrollLeft` with data layer
- Use `overflow: hidden` on meta-data container
- Merged cells render at their original position, clipping handles the rest

---

## References

- [Refactoring Plan](./refactoring_plan.md) - Phase 3: Data Layer
- [Rendering Pipeline PRD](./prd-rendering-pipeline.md) - OptimizedTable implementation
