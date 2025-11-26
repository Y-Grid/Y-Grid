# Y-Grid

A high-performance web-based grid component built with HTML5 Canvas.

Forked from [x-spreadsheet](https://github.com/myliang/x-spreadsheet).

## Installation

```shell
npm install y-grid
```

## Usage

```html
<div id="y-grid"></div>
```

```javascript
import YGrid from 'y-grid';
import 'y-grid/style.css';

const grid = new YGrid('#y-grid')
  .loadData({})
  .change(data => {
    // save data
  });
```

### Options

```javascript
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

```javascript
grid.on('cell-selected', (cell, ri, ci) => {});
grid.on('cells-selected', (cell, { sri, sci, eri, eci }) => {});
grid.on('cell-edited', (text, ri, ci) => {});
```

### Cell Operations

```javascript
// Update cell text: cellText(ri, ci, text, sheetIndex = 0)
grid.cellText(5, 5, 'hello').cellText(6, 5, 'world').reRender();

// Get cell: cell(ri, ci, sheetIndex = 0)
grid.cell(ri, ci);

// Get cell style: cellStyle(ri, ci, sheetIndex = 0)
grid.cellStyle(ri, ci);
```

## Features

- Canvas-based rendering
- Undo & Redo
- Copy, Cut, Paste
- Cell formatting (font, color, borders, alignment)
- Merge cells
- Freeze rows/columns
- Basic formulas (SUM, AVERAGE, MAX, MIN, IF, AND, OR, CONCAT)
- Row/column resize, insert, delete, hide
- Multiple sheets
- Data validations
- CSV import (built-in)

## Plugins

Optional plugins for extended functionality:

```shell
npm install y-grid-excel  # Excel file import
```

```javascript
import YGrid from 'y-grid';
import excelPlugin from 'y-grid-excel';

const grid = new YGrid('#y-grid')
  .use(excelPlugin);

// Now supports .xlsx import
await grid.importFile(excelFile);
```

## Development

This is a monorepo using npm workspaces.

```shell
git clone https://github.com/user/y-grid.git
cd y-grid
npm install
npm run dev
```

Open your browser and visit http://localhost:8080.

### Project Structure

```
y-grid/
├── packages/
│   └── y-grid/        # Core package
│       ├── src/
│       ├── tests/
│       └── dist/
├── demo/              # Demo application
└── docs/              # Documentation
```

### Commands

```shell
npm run dev        # Start dev server
npm run build      # Build for production
npm run test       # Run tests
npm run lint       # Lint code
npm run typecheck  # Type check
```

## Browser Support

Modern browsers (Chrome, Firefox, Safari, Edge).

## License

MIT
