# Y-Grid

A high-performance web-based grid component built with HTML5 Canvas.

Forked from [x-spreadsheet](https://github.com/myliang/x-spreadsheet).

## Installation

```shell
npm install @y-grid/y-grid
```

## Usage

```html
<div id="y-grid"></div>
```

```typescript
import YGrid from '@y-grid/y-grid';
import '@y-grid/y-grid/style.css';

const grid = new YGrid('#y-grid')
  .loadData({})
  .change(data => {
    // save data
  });
```

### Options

```typescript
{
  mode: 'edit', // edit | read
  showToolbar: true,
  showGrid: true,
  showContextmenu: true,
  view: {
    height: () => document.documentElement.clientHeight,
    width: () => document.documentElement.clientWidth,
  },
  row: {
    len: 100,
    height: 25,
  },
  col: {
    len: 26,
    width: 100,
    indexWidth: 60,
    minWidth: 60,
  },
  style: {
    bgcolor: '#ffffff',
    align: 'left',
    valign: 'middle',
    textwrap: false,
    strike: false,
    underline: false,
    color: '#0a0a0a',
    font: {
      name: 'Helvetica',
      size: 10,
      bold: false,
      italic: false,
    },
  },
}
```

### Events

```typescript
grid.on('cell-selected', (cell, ri, ci) => {});
grid.on('cells-selected', (cell, { sri, sci, eri, eci }) => {});
grid.on('cell-edited', (text, ri, ci) => {});
```

### Cell Operations

```typescript
// Update cell text: cellText(ri, ci, text, sheetIndex = 0)
grid.cellText(5, 5, 'hello').cellText(6, 5, 'world').reRender();

// Get cell: cell(ri, ci, sheetIndex = 0)
grid.cell(ri, ci);

// Get cell style: cellStyle(ri, ci, sheetIndex = 0)
grid.cellStyle(ri, ci);
```

### CSV Import

```typescript
// Import from file
await grid.importCSV(file);

// Import from text
grid.importCSVText('name,age\nJohn,30\nJane,25');
```

## Features

- Canvas-based rendering
- Full TypeScript support
- Undo & Redo
- Copy, Cut, Paste
- Cell formatting (font, color, borders, alignment)
- Merge cells
- Freeze rows/columns
- Basic formulas (SUM, AVERAGE, MAX, MIN, IF, AND, OR, CONCAT)
- Row/column resize, insert, delete, hide
- Multiple sheets
- Data validations
- CSV import (built-in, RFC 4180 compliant)

## Browser Support

Modern browsers (Chrome, Firefox, Safari, Edge).

## License

MIT
