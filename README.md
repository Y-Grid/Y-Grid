# Y-Grid

A high-performance web-based spreadsheet component built with HTML5 Canvas.

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
import YGrid from "y-grid";

const grid = new YGrid("#y-grid")
  .loadData({})
  .change(data => {
    // save data
  });

// validate data
grid.validate()
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
const grid = new YGrid("#y-grid")
grid.on('cell-selected', (cell, ri, ci) => {});
grid.on('cells-selected', (cell, { sri, sci, eri, eci }) => {});
grid.on('cell-edited', (text, ri, ci) => {});
```

### Cell Operations

```javascript
const grid = new YGrid("#y-grid")

// Update cell text: cellText(ri, ci, text, sheetIndex = 0)
grid.cellText(5, 5, 'hello').cellText(6, 5, 'world').reRender();

// Get cell: cell(ri, ci, sheetIndex = 0)
grid.cell(ri, ci);

// Get cell style: cellStyle(ri, ci, sheetIndex = 0)
grid.cellStyle(ri, ci);
```

## Features

- Undo & Redo
- Paint format
- Clear format
- Format
- Font (name, size, bold, italic)
- Underline & Strike
- Text color & Fill color
- Borders
- Merge cells
- Align (horizontal & vertical)
- Text wrapping
- Freeze cell
- Functions (SUM, AVERAGE, MAX, MIN, IF, AND, OR, CONCAT)
- Resize row-height, col-width
- Copy, Cut, Paste
- Autofill
- Insert/Delete row & column
- Hide row & column
- Multiple sheets
- Print
- Data validations

## Development

```shell
git clone https://github.com/Y-Grid/Y-Grid.git
cd Y-Grid
npm install
npm run dev
```

Open your browser and visit http://localhost:8080.

## Browser Support

Modern browsers (Chrome, Firefox, Safari).

## License

MIT
