# Y-Grid Issues Tracker

Issues sourced from [x-spreadsheet](https://github.com/myliang/x-spreadsheet/issues) - the original project y-grid was forked from.

---

## Performance Baseline (2024-11-26)

**Test Machine:** MacBook M4 Pro MAX (128GB RAM, Apple Silicon)

| Rows    | Load Time | Render Time | Scroll FPS | Memory |
| ------- | --------- | ----------- | ---------- | ------ |
| 100,000 | 5 ms      | 1.2 ms      | 60 FPS     | 156 MB |

**Target Thresholds (mid-range hardware):**

| Rows    | Load Time | Render Time | Scroll FPS |
| ------- | --------- | ----------- | ---------- |
| 10,000  | < 200 ms  | < 16 ms     | ≥ 55 FPS   |
| 100,000 | < 1000 ms | < 50 ms     | ≥ 30 FPS   |

To run benchmarks: Open demo, press 'P' for perf overlay, run `runBenchmark(100000)` in console.

---

## Issue Categories

- 🔴 **Critical** - Security issues, data loss, crashes
- 🟠 **High** - Major functionality broken, affects many users
- 🟡 **Medium** - Feature requests with high demand, usability issues
- 🟢 **Low** - Nice to have, minor improvements

---

## Issue #1: System Clipboard Paste Not Working

**Source:** [x-spreadsheet #475](https://github.com/myliang/x-spreadsheet/issues/475)
**Priority:** 🟠 High
**Category:** Bug

### Description

Users cannot paste content from system clipboard into the spreadsheet. Internal copy/paste works, but Ctrl+V from external sources fails.

### Testing Strategy

```typescript
// Test: External clipboard paste
describe("Clipboard", () => {
  it("should paste text from system clipboard", async () => {
    // 1. Write to system clipboard
    await navigator.clipboard.writeText("Hello\tWorld\nFoo\tBar");

    // 2. Trigger paste event
    const pasteEvent = new ClipboardEvent("paste", {
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData.setData("text/plain", "Hello\tWorld\nFoo\tBar");

    // 3. Dispatch to grid
    grid.el.dispatchEvent(pasteEvent);

    // 4. Verify cells populated
    expect(grid.cell(0, 0).text).toBe("Hello");
    expect(grid.cell(0, 1).text).toBe("World");
    expect(grid.cell(1, 0).text).toBe("Foo");
    expect(grid.cell(1, 1).text).toBe("Bar");
  });
});
```

### Acceptance Criteria

- [ ] Paste from external text editors works
- [ ] Paste from Excel/Google Sheets preserves tab-delimited structure
- [ ] Works in Chrome, Firefox, Safari, Edge

---

## Issue #2: Smooth Scrolling

**Source:** [x-spreadsheet #540](https://github.com/myliang/x-spreadsheet/issues/540)
**Priority:** 🟡 Medium
**Category:** Enhancement

### Description

Scrolling is jerky/jumpy. Users want smooth, pixel-based scrolling like Google Sheets.

### Testing Strategy

```typescript
// Test: Scroll performance
describe("Scroll Performance", () => {
  it("should maintain 60fps during scroll", async () => {
    const grid = createGridWith10kRows();
    const fpsSamples: number[] = [];

    // Monitor FPS during scroll
    const scrollTest = new Promise((resolve) => {
      let lastTime = performance.now();
      let frames = 0;

      const measure = () => {
        frames++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
          fpsSamples.push(frames);
          frames = 0;
          lastTime = now;
        }
        if (fpsSamples.length < 5) requestAnimationFrame(measure);
        else resolve(fpsSamples);
      };
      requestAnimationFrame(measure);

      // Simulate continuous scroll
      simulateScroll(grid, { deltaY: 100, duration: 5000 });
    });

    const fps = await scrollTest;
    const avgFps = fps.reduce((a, b) => a + b) / fps.length;
    expect(avgFps).toBeGreaterThan(55); // Allow some variance
  });
});
```

### Acceptance Criteria

- [ ] Average 60fps scroll with 10K rows
- [ ] No visible stutter or frame drops
- [ ] Smooth momentum/inertia on trackpad

---

## Issue #3: XLSX Import/Export

**Source:** [x-spreadsheet #419](https://github.com/myliang/x-spreadsheet/issues/419), [#20](https://github.com/myliang/x-spreadsheet/issues/20), [#55](https://github.com/myliang/x-spreadsheet/issues/55)
**Priority:** 🟠 High
**Category:** Feature

### Description

Users need to import and export Excel (.xlsx) files. Currently only JSON is supported.

### Testing Strategy

```typescript
// Test: XLSX round-trip
describe("XLSX Import/Export", () => {
  it("should preserve data through import/export cycle", async () => {
    // 1. Load test data
    grid.loadData([
      {
        rows: {
          0: { cells: { 0: { text: "Name" }, 1: { text: "Value" } } },
          1: { cells: { 0: { text: "Test" }, 1: { text: "123" } } },
        },
      },
    ]);

    // 2. Export to XLSX
    const xlsxBlob = await grid.exportXLSX();

    // 3. Import back
    const newGrid = createGrid();
    await newGrid.importXLSX(xlsxBlob);

    // 4. Verify data preserved
    expect(newGrid.cell(0, 0).text).toBe("Name");
    expect(newGrid.cell(1, 1).text).toBe("123");
  });

  it("should preserve cell styles", async () => {
    // Test bold, colors, borders survive round-trip
  });

  it("should preserve formulas", async () => {
    // Test =SUM(A1:A10) survives round-trip
  });
});
```

### Acceptance Criteria

- [ ] Import .xlsx files (drag-drop or file picker)
- [ ] Export to .xlsx format
- [ ] Preserve: text, numbers, formulas, basic styles
- [ ] Handle files up to 10MB / 100K cells

---

## Issue #4: Cross-Sheet Formula References

**Source:** [x-spreadsheet #515](https://github.com/myliang/x-spreadsheet/issues/515), [#728](https://github.com/myliang/x-spreadsheet/issues/728)
**Priority:** 🟡 Medium
**Category:** Feature

### Description

Cannot reference cells from other sheets in formulas. Need syntax like `=Sheet2!A1` or `='Sheet Name'!A1:B10`.

### Testing Strategy

```typescript
describe("Cross-Sheet Formulas", () => {
  it("should resolve references to other sheets", () => {
    grid.loadData([
      { name: "Sheet1", rows: { 0: { cells: { 0: { text: "=Sheet2!A1" } } } } },
      { name: "Sheet2", rows: { 0: { cells: { 0: { text: "100" } } } } },
    ]);

    expect(grid.cell(0, 0, 0).text).toBe("=Sheet2!A1");
    expect(grid.getCellValue(0, 0, 0)).toBe(100);
  });

  it("should handle sheet names with spaces", () => {
    // ='My Sheet'!A1 syntax
  });

  it("should update when referenced sheet changes", () => {
    // Dependency tracking across sheets
  });
});
```

### Acceptance Criteria

- [ ] Support `=SheetName!A1` syntax
- [ ] Support `='Sheet Name'!A1` for names with spaces
- [ ] Cross-sheet SUM, AVERAGE, etc. work
- [ ] Changes in source sheet update dependent cells

---

## Issue #5: XSS Security Vulnerability ✅ RESOLVED

**Source:** [x-spreadsheet #580](https://github.com/myliang/x-spreadsheet/issues/580)
**Priority:** 🔴 Critical
**Category:** Security
**Status:** Fixed (2024-11-26)

### Description

Cell content is not properly sanitized, allowing XSS attacks through malicious cell data.

### Solution Implemented

Added `escapeHtml()` utility function and `safeHtml()` method to the Element class:

1. **`src/component/element.ts`**: Added `escapeHtml()` function that escapes `<`, `>`, `&`, `"`, and `'` characters
2. **`src/component/element.ts`**: Added `safeHtml()` method that uses `escapeHtml()` before setting innerHTML
3. **`src/component/editor.ts`**: Updated all `textlineEl.html()` calls to use `safeHtml()`
4. **`src/component/suggest.ts`**: Updated label rendering to use `safeHtml()`
5. **`src/component/message.ts`**: Updated toast content to use `safeHtml()`
6. **`src/component/tooltip.ts`**: Updated tooltip content to use `safeHtml()`

### Test Coverage

Added comprehensive XSS tests in `tests/security/xss.test.ts`:
- 37 test cases covering various XSS payloads
- Tests for script tags, img onerror, SVG onload, attribute injection, etc.
- Edge cases for long strings, null bytes, HTML comments, CDATA sections

### Acceptance Criteria

- [x] All user input sanitized before rendering
- [x] HTML entities escaped in cell display
- [x] Imported data sanitized
- [x] No script execution possible through cell content

---

## Issue #6: Responsive Width on Window Resize

**Source:** [x-spreadsheet #448](https://github.com/myliang/x-spreadsheet/issues/448)
**Priority:** 🟡 Medium
**Category:** Enhancement

### Description

Spreadsheet doesn't resize when browser window is resized. Should be responsive.

### Testing Strategy

```typescript
describe("Responsive Resize", () => {
  it("should resize on window resize", async () => {
    const container = document.getElementById("grid-container");
    container.style.width = "800px";
    const grid = new YGrid(container);

    expect(grid.getWidth()).toBe(800);

    // Simulate resize
    container.style.width = "1200px";
    window.dispatchEvent(new Event("resize"));

    await nextTick();
    expect(grid.getWidth()).toBe(1200);
  });

  it("should handle container resize (ResizeObserver)", async () => {
    // Test ResizeObserver-based resize detection
  });
});
```

### Acceptance Criteria

- [ ] Grid resizes on window resize
- [ ] Grid resizes on container resize
- [ ] Debounced to avoid performance issues
- [ ] Scrollbars adjust appropriately

---

## Issue #7: Firefox Paste Disabled

**Source:** [x-spreadsheet #721](https://github.com/myliang/x-spreadsheet/issues/721)
**Priority:** 🟠 High
**Category:** Bug

### Description

Paste functionality is completely broken in Firefox browser.

### Testing Strategy

```typescript
// Run in Firefox (playwright/puppeteer)
describe("Firefox Compatibility", () => {
  it("should paste in Firefox", async () => {
    // Use Playwright with Firefox
    const browser = await playwright.firefox.launch();
    const page = await browser.newPage();
    await page.goto("/demo");

    // Copy text
    await page.evaluate(() => {
      navigator.clipboard.writeText("Test");
    });

    // Paste
    await page.keyboard.press("Control+V");

    // Verify
    const cellValue = await page.evaluate(() => {
      return window.grid.cell(0, 0).text;
    });
    expect(cellValue).toBe("Test");
  });
});
```

### Acceptance Criteria

- [ ] Ctrl+V works in Firefox
- [ ] Context menu paste works in Firefox
- [ ] Works with Firefox's clipboard API

---

## Issue #8: Memory Leak on Navigation

**Source:** [x-spreadsheet #720](https://github.com/myliang/x-spreadsheet/issues/720)
**Priority:** 🟠 High
**Category:** Bug

### Description

Memory leaks occur when navigating away from page containing spreadsheet, or when destroying/recreating instances.

### Testing Strategy

```typescript
describe("Memory Management", () => {
  it("should not leak memory on destroy", async () => {
    const initialMemory = performance.memory?.usedJSHeapSize;

    // Create and destroy 100 instances
    for (let i = 0; i < 100; i++) {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const grid = new YGrid(container);
      grid.loadData([{ rows: generateRows(1000) }]);
      grid.destroy(); // Need to implement
      container.remove();
    }

    // Force GC if available
    if (global.gc) global.gc();
    await sleep(1000);

    const finalMemory = performance.memory?.usedJSHeapSize;
    const leakage = finalMemory - initialMemory;

    // Allow some variance, but should not grow significantly
    expect(leakage).toBeLessThan(10 * 1024 * 1024); // < 10MB
  });

  it("should remove all event listeners on destroy", () => {
    // Track event listeners, verify all removed
  });
});
```

### Acceptance Criteria

- [ ] `destroy()` method implemented
- [ ] All event listeners removed on destroy
- [ ] No detached DOM nodes after destroy
- [ ] Memory stable after repeated create/destroy cycles

---

## Issue #9: Formula Calculation Errors

**Source:** [x-spreadsheet #737](https://github.com/myliang/x-spreadsheet/issues/737)
**Priority:** 🟠 High
**Category:** Bug

### Description

Formula references calculate incorrect results. Cell references don't update properly.

### Testing Strategy

```typescript
describe("Formula Calculations", () => {
  it("should calculate cell references correctly", () => {
    grid.cellText(0, 0, "10");
    grid.cellText(0, 1, "20");
    grid.cellText(0, 2, "=A1+B1");

    expect(grid.getCellValue(0, 2)).toBe(30);
  });

  it("should update when referenced cells change", () => {
    grid.cellText(0, 0, "10");
    grid.cellText(0, 1, "=A1*2");
    expect(grid.getCellValue(0, 1)).toBe(20);

    grid.cellText(0, 0, "5");
    expect(grid.getCellValue(0, 1)).toBe(10);
  });

  it("should handle circular references", () => {
    grid.cellText(0, 0, "=B1");
    grid.cellText(0, 1, "=A1");

    expect(grid.getCellValue(0, 0)).toBe("#CIRCULAR!");
  });

  it("should calculate range functions correctly", () => {
    grid.cellText(0, 0, "1");
    grid.cellText(1, 0, "2");
    grid.cellText(2, 0, "3");
    grid.cellText(3, 0, "=SUM(A1:A3)");

    expect(grid.getCellValue(3, 0)).toBe(6);
  });
});
```

### Acceptance Criteria

- [ ] Simple references (=A1) work correctly
- [ ] Arithmetic operations work (=A1+B1\*2)
- [ ] Range functions work (=SUM(A1:A10))
- [ ] Dependency tracking updates all dependents
- [ ] Circular references detected and reported

---

## Issue #10: Sort and Filter Malfunction

**Source:** [x-spreadsheet #682](https://github.com/myliang/x-spreadsheet/issues/682), [#622](https://github.com/myliang/x-spreadsheet/issues/622), [#623](https://github.com/myliang/x-spreadsheet/issues/623)
**Priority:** 🟡 Medium
**Category:** Bug

### Description

Sorting and filtering features don't work correctly. Data gets corrupted or doesn't sort properly.

### Testing Strategy

```typescript
describe("Sort and Filter", () => {
  beforeEach(() => {
    grid.loadData([
      {
        rows: {
          0: { cells: { 0: { text: "Name" }, 1: { text: "Age" } } },
          1: { cells: { 0: { text: "Charlie" }, 1: { text: "30" } } },
          2: { cells: { 0: { text: "Alice" }, 1: { text: "25" } } },
          3: { cells: { 0: { text: "Bob" }, 1: { text: "35" } } },
        },
      },
    ]);
  });

  it("should sort ascending by column", () => {
    grid.sortByColumn(0, "asc");

    expect(grid.cell(1, 0).text).toBe("Alice");
    expect(grid.cell(2, 0).text).toBe("Bob");
    expect(grid.cell(3, 0).text).toBe("Charlie");
  });

  it("should sort descending by column", () => {
    grid.sortByColumn(1, "desc");

    expect(grid.cell(1, 1).text).toBe("35");
    expect(grid.cell(2, 1).text).toBe("30");
    expect(grid.cell(3, 1).text).toBe("25");
  });

  it("should filter rows", () => {
    grid.filterByColumn(1, (value) => parseInt(value) >= 30);

    const visibleRows = grid.getVisibleRows();
    expect(visibleRows.length).toBe(2); // Header + 2 matching rows
  });

  it("should preserve data after clearing filter", () => {
    grid.filterByColumn(1, (value) => parseInt(value) >= 30);
    grid.clearFilters();

    expect(grid.cell(2, 0).text).toBe("Alice"); // All data back
  });
});
```

### Acceptance Criteria

- [ ] Ascending/descending sort works
- [ ] Numeric sort vs string sort handled correctly
- [ ] Filter shows/hides rows correctly
- [ ] Original data preserved after clearing filter
- [ ] Sort + filter can be combined

---

## Issue #11: Read Mode Still Editable

**Source:** [x-spreadsheet #681](https://github.com/myliang/x-spreadsheet/issues/681)
**Priority:** 🟡 Medium
**Category:** Bug

### Description

In read-only mode, some elements are still editable (e.g., sheet names via double-click).

### Testing Strategy

```typescript
describe("Read Mode", () => {
  beforeEach(() => {
    grid = new YGrid("#container", { mode: "read" });
  });

  it("should not allow cell editing", () => {
    grid.cellText(0, 0, "Original");

    // Simulate double-click to edit
    simulateDoubleClick(grid, 0, 0);
    simulateTyping("New Value");
    simulateEnter();

    expect(grid.cell(0, 0).text).toBe("Original");
  });

  it("should not allow sheet name editing", () => {
    // Simulate double-click on sheet tab
    const sheetTab = document.querySelector(".y-grid-bottombar .y-grid-item");
    simulateDoubleClick(sheetTab);

    expect(sheetTab.querySelector("input")).toBeNull();
  });

  it("should not show context menu edit options", () => {
    simulateRightClick(grid, 0, 0);

    const menu = document.querySelector(".y-grid-contextmenu");
    expect(menu.textContent).not.toContain("Cut");
    expect(menu.textContent).not.toContain("Paste");
  });
});
```

### Acceptance Criteria

- [ ] Cells not editable in read mode
- [ ] Sheet names not editable in read mode
- [ ] Context menu shows only read options
- [ ] Keyboard shortcuts for editing disabled

---

## Issue #12: Blurry/Low Resolution Display

**Source:** [x-spreadsheet #675](https://github.com/myliang/x-spreadsheet/issues/675)
**Priority:** 🟡 Medium
**Category:** Bug

### Description

Display appears blurry, especially on high-DPI (Retina) screens.

### Testing Strategy

```typescript
describe("High DPI Rendering", () => {
  it("should render crisp on 2x displays", () => {
    // Mock devicePixelRatio
    Object.defineProperty(window, "devicePixelRatio", { value: 2 });

    const grid = new YGrid("#container");
    const canvas = document.querySelector("canvas");

    // Canvas should be 2x the CSS size
    const cssWidth = parseInt(canvas.style.width);
    expect(canvas.width).toBe(cssWidth * 2);
  });

  it("should render crisp on 3x displays", () => {
    Object.defineProperty(window, "devicePixelRatio", { value: 3 });
    // Similar test
  });

  it("should handle DPI changes", () => {
    // Test window move between monitors with different DPI
  });
});
```

### Acceptance Criteria

- [ ] Crisp rendering on Retina displays (2x)
- [ ] Crisp rendering on high-DPI Windows (1.5x, 2x)
- [ ] Text and lines not blurry
- [ ] Canvas scaled correctly for devicePixelRatio

---

## Issue #13: Row/Column Limit Too Low

**Source:** [x-spreadsheet #674](https://github.com/myliang/x-spreadsheet/issues/674)
**Priority:** 🟡 Medium
**Category:** Enhancement

### Description

Default row limit is too restrictive. Users need more rows for large datasets.

### Testing Strategy

```typescript
describe("Large Datasets", () => {
  it("should handle 100K rows", async () => {
    const grid = new YGrid("#container", {
      row: { len: 100000 },
    });

    // Populate data
    const data = generateRows(100000);
    grid.loadData([{ rows: data }]);

    // Should render without crashing
    expect(grid.getData()[0].rows.len).toBe(100000);

    // Should be able to scroll to end
    grid.scrollTo(99999, 0);
    expect(grid.getVisibleRange().sri).toBeGreaterThan(99990);
  });

  it("should maintain performance with 100K rows", async () => {
    // Measure initial render time
    const startTime = performance.now();
    grid.loadData([{ rows: generateRows(100000) }]);
    const loadTime = performance.now() - startTime;

    expect(loadTime).toBeLessThan(1000); // < 1 second
  });
});
```

### Acceptance Criteria

- [ ] Support configurable row limit up to 1M
- [ ] Support configurable column limit up to 16K (Excel limit)
- [ ] Performance acceptable at 100K rows
- [ ] Memory usage reasonable (< 500MB for 100K rows)

---

## Issue #14: Column Naming Error After Z

**Source:** [x-spreadsheet #672](https://github.com/myliang/x-spreadsheet/issues/672)
**Priority:** 🟡 Medium
**Category:** Bug

### Description

Column names are incorrect after column Z. Should be AA, AB, AC... but showing wrong values.

### Testing Strategy

```typescript
describe("Column Naming", () => {
  const expectedNames = [
    [0, "A"],
    [25, "Z"],
    [26, "AA"],
    [27, "AB"],
    [51, "AZ"],
    [52, "BA"],
    [701, "ZZ"],
    [702, "AAA"],
  ];

  expectedNames.forEach(([index, expected]) => {
    it(`should name column ${index} as ${expected}`, () => {
      expect(stringAt(index)).toBe(expected);
    });
  });

  it("should handle reverse conversion", () => {
    expect(expr2xy("AA1")[0]).toBe(26);
    expect(expr2xy("ZZ1")[0]).toBe(701);
    expect(expr2xy("AAA1")[0]).toBe(702);
  });
});
```

### Acceptance Criteria

- [ ] A-Z correct (0-25)
- [ ] AA-AZ correct (26-51)
- [ ] BA-ZZ correct (52-701)
- [ ] AAA+ correct (702+)
- [ ] Bidirectional conversion works

---

## Issue #15: Copy/Paste Exceptions

**Source:** [x-spreadsheet #739](https://github.com/myliang/x-spreadsheet/issues/739)
**Priority:** 🟠 High
**Category:** Bug

### Description

Errors occur during copy/paste operations, causing exceptions and data loss.

### Testing Strategy

```typescript
describe("Copy/Paste Robustness", () => {
  it("should handle copy of empty cells", () => {
    grid.selectRange(0, 0, 5, 5);
    expect(() => grid.copy()).not.toThrow();
    expect(() => grid.paste()).not.toThrow();
  });

  it("should handle copy of merged cells", () => {
    grid.merge(0, 0, 2, 2);
    grid.selectRange(0, 0, 2, 2);
    expect(() => grid.copy()).not.toThrow();
  });

  it("should handle paste into merged region", () => {
    grid.merge(0, 0, 2, 2);
    grid.cellText(5, 5, "Test");
    grid.selectRange(5, 5, 5, 5);
    grid.copy();
    grid.selectRange(0, 0, 0, 0);

    // Should either paste or show error, not throw
    expect(() => grid.paste()).not.toThrow();
  });

  it("should handle paste larger than grid", () => {
    // Copy 10x10, paste near edge of grid
    grid.selectRange(0, 0, 9, 9);
    grid.copy();
    grid.selectRange(95, 20, 95, 20); // Near row limit

    expect(() => grid.paste()).not.toThrow();
  });
});
```

### Acceptance Criteria

- [ ] No exceptions during normal copy/paste
- [ ] Empty cell copy/paste works
- [ ] Merged cell copy/paste handled gracefully
- [ ] Edge cases don't crash the application

---

## Issue #16: Programmatic Style Changes

**Source:** [x-spreadsheet #346](https://github.com/myliang/x-spreadsheet/issues/346)
**Priority:** 🟡 Medium
**Category:** Enhancement

### Description

Need API to change cell styles programmatically from JavaScript.

### Testing Strategy

```typescript
describe("Programmatic Styling API", () => {
  it("should set cell background color", () => {
    grid.setCellStyle(0, 0, { bgcolor: "#ff0000" });

    const style = grid.cellStyle(0, 0);
    expect(style.bgcolor).toBe("#ff0000");
  });

  it("should set font properties", () => {
    grid.setCellStyle(0, 0, {
      font: { bold: true, size: 14, name: "Arial" },
    });

    const style = grid.cellStyle(0, 0);
    expect(style.font.bold).toBe(true);
    expect(style.font.size).toBe(14);
  });

  it("should set range styles", () => {
    grid.setRangeStyle(0, 0, 5, 5, { bgcolor: "#00ff00" });

    for (let r = 0; r <= 5; r++) {
      for (let c = 0; c <= 5; c++) {
        expect(grid.cellStyle(r, c).bgcolor).toBe("#00ff00");
      }
    }
  });

  it("should apply styles without losing data", () => {
    grid.cellText(0, 0, "Hello");
    grid.setCellStyle(0, 0, { bgcolor: "#ff0000" });

    expect(grid.cell(0, 0).text).toBe("Hello");
  });
});
```

### Acceptance Criteria

- [ ] `setCellStyle(ri, ci, style)` method
- [ ] `setRangeStyle(sri, sci, eri, eci, style)` method
- [ ] Supports: bgcolor, color, font, border, align
- [ ] Styles persist through save/load
- [ ] Visual update immediate after style change

---

## Issue #17: Custom Column Headers

**Source:** [x-spreadsheet #724](https://github.com/myliang/x-spreadsheet/issues/724), [#678](https://github.com/myliang/x-spreadsheet/issues/678)
**Priority:** 🟢 Low
**Category:** Enhancement

### Description

Users want to replace A, B, C column headers with custom text like "Name", "Age", "Email".

### Testing Strategy

```typescript
describe("Custom Headers", () => {
  it("should display custom column headers", () => {
    grid.setColumnHeaders(["Name", "Age", "Email"]);

    const headers = document.querySelectorAll(".y-grid-header-col");
    expect(headers[0].textContent).toBe("Name");
    expect(headers[1].textContent).toBe("Age");
    expect(headers[2].textContent).toBe("Email");
  });

  it("should fall back to letters for unset headers", () => {
    grid.setColumnHeaders(["Name", "Age"]); // Only 2 set

    const headers = document.querySelectorAll(".y-grid-header-col");
    expect(headers[2].textContent).toBe("C"); // Falls back
  });

  it("should handle header click for column selection", () => {
    grid.setColumnHeaders(["Name"]);

    // Click on custom header should still select column
    simulateClick(document.querySelector(".y-grid-header-col"));

    expect(grid.getSelectedRange().sci).toBe(0);
    expect(grid.getSelectedRange().eci).toBe(0);
  });
});
```

### Acceptance Criteria

- [ ] API to set custom column headers
- [ ] Custom headers displayed instead of A, B, C
- [ ] Column selection still works
- [ ] Export includes custom headers

---

## Issue #18: Hide/Disable Sheet Bar

**Source:** [x-spreadsheet #742](https://github.com/myliang/x-spreadsheet/issues/742)
**Priority:** 🟢 Low
**Category:** Enhancement

### Description

Option to hide the bottom sheet tab bar when only using single sheet.

### Testing Strategy

```typescript
describe("Sheet Bar Visibility", () => {
  it("should hide sheet bar with option", () => {
    const grid = new YGrid("#container", { showBottomBar: false });

    const bottomBar = document.querySelector(".y-grid-bottombar");
    expect(bottomBar).toBeNull();
  });

  it("should show sheet bar by default", () => {
    const grid = new YGrid("#container");

    const bottomBar = document.querySelector(".y-grid-bottombar");
    expect(bottomBar).not.toBeNull();
  });

  it("should toggle sheet bar visibility", () => {
    const grid = new YGrid("#container");

    grid.setBottomBarVisible(false);
    expect(document.querySelector(".y-grid-bottombar").style.display).toBe(
      "none"
    );

    grid.setBottomBarVisible(true);
    expect(document.querySelector(".y-grid-bottombar").style.display).not.toBe(
      "none"
    );
  });
});
```

### Acceptance Criteria

- [ ] `showBottomBar: false` option hides tab bar
- [ ] Runtime toggle with `setBottomBarVisible()`
- [ ] Single-sheet mode works without bottom bar

---

## Issue #19: loadData Causes Unwanted Focus

**Source:** [x-spreadsheet #680](https://github.com/myliang/x-spreadsheet/issues/680)
**Priority:** 🟢 Low
**Category:** Bug

### Description

Calling `loadData()` causes the grid to steal focus from other form elements.

### Testing Strategy

```typescript
describe("Focus Management", () => {
  it("should not steal focus on loadData", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    expect(document.activeElement).toBe(input);

    grid.loadData([{ rows: {} }]);

    expect(document.activeElement).toBe(input); // Still focused
  });

  it("should focus grid when autoFocus is true", () => {
    const grid = new YGrid("#container", { autoFocus: true });

    grid.loadData([{ rows: {} }]);

    const gridEl = document.querySelector(".y-grid-overlayer");
    expect(document.activeElement).toBe(gridEl);
  });
});
```

### Acceptance Criteria

- [ ] `loadData()` doesn't steal focus by default
- [ ] `autoFocus` option controls focus behavior
- [ ] Grid can be focused programmatically with `grid.focus()`

---

## Issue #20: Proper Cleanup/Disposal

**Source:** [x-spreadsheet #670](https://github.com/myliang/x-spreadsheet/issues/670)
**Priority:** 🟡 Medium
**Category:** Enhancement

### Description

No documented way to properly clean up/dispose of a spreadsheet instance.

### Testing Strategy

```typescript
describe("Instance Disposal", () => {
  it("should remove DOM elements on destroy", () => {
    const container = document.getElementById("container");
    const grid = new YGrid(container);

    expect(container.querySelector(".y-grid")).not.toBeNull();

    grid.destroy();

    expect(container.querySelector(".y-grid")).toBeNull();
  });

  it("should remove event listeners on destroy", () => {
    const grid = new YGrid("#container");
    const spy = vi.spyOn(window, "removeEventListener");

    grid.destroy();

    expect(spy).toHaveBeenCalled();
  });

  it("should clear internal state on destroy", () => {
    const grid = new YGrid("#container");
    grid.loadData([{ rows: { 0: { cells: { 0: { text: "Test" } } } } }]);

    grid.destroy();

    expect(grid.datas).toEqual([]);
    expect(grid.sheet).toBeNull();
  });

  it("should be safe to call destroy multiple times", () => {
    const grid = new YGrid("#container");

    expect(() => {
      grid.destroy();
      grid.destroy();
    }).not.toThrow();
  });
});
```

### Acceptance Criteria

- [ ] `destroy()` method implemented
- [ ] All DOM elements removed
- [ ] All event listeners removed
- [ ] Internal references cleared
- [ ] Safe to call multiple times

---

## Summary

| #   | Issue                  | Priority    | Type        | Status |
| --- | ---------------------- | ----------- | ----------- | ------ |
| 1   | System Clipboard Paste | 🟠 High     | Bug         | Open   |
| 2   | Smooth Scrolling       | 🟡 Medium   | Enhancement | Open   |
| 3   | XLSX Import/Export     | 🟠 High     | Feature     | Open   |
| 4   | Cross-Sheet Formulas   | 🟡 Medium   | Feature     | Open   |
| 5   | XSS Vulnerability      | 🔴 Critical | Security    | Open   |
| 6   | Responsive Resize      | 🟡 Medium   | Enhancement | Open   |
| 7   | Firefox Paste          | 🟠 High     | Bug         | Open   |
| 8   | Memory Leak            | 🟠 High     | Bug         | Open   |
| 9   | Formula Errors         | 🟠 High     | Bug         | Open   |
| 10  | Sort/Filter Broken     | 🟡 Medium   | Bug         | Open   |
| 11  | Read Mode Editable     | 🟡 Medium   | Bug         | Open   |
| 12  | Blurry Display         | 🟡 Medium   | Bug         | Open   |
| 13  | Row Limit              | 🟡 Medium   | Enhancement | Open   |
| 14  | Column Naming          | 🟡 Medium   | Bug         | Open   |
| 15  | Copy/Paste Exceptions  | 🟠 High     | Bug         | Open   |
| 16  | Programmatic Styles    | 🟡 Medium   | Enhancement | Open   |
| 17  | Custom Headers         | 🟢 Low      | Enhancement | Open   |
| 18  | Hide Sheet Bar         | 🟢 Low      | Enhancement | Open   |
| 19  | Focus Stealing         | 🟢 Low      | Bug         | Open   |
| 20  | Cleanup/Disposal       | 🟡 Medium   | Enhancement | Open   |

---

## Suggested Fix Order

1. **#5 XSS Vulnerability** - Critical security issue
2. **#1 System Clipboard Paste** - Core functionality broken
3. **#7 Firefox Paste** - Browser compatibility
4. **#9 Formula Errors** - Core functionality
5. **#15 Copy/Paste Exceptions** - Data integrity
6. **#8 Memory Leak** - Performance/stability
7. **#14 Column Naming** - Basic functionality bug
8. **#11 Read Mode** - Feature not working as intended
9. **#10 Sort/Filter** - Feature not working
10. **#20 Cleanup/Disposal** - Memory management
