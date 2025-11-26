# y-grid

> A high-performance web-based spreadsheet component. Forked from [x-spreadsheet](https://github.com/myliang/x-spreadsheet).

## Installation

```shell
npm install y-grid
```

## Usage

```html
<div id="spreadsheet"></div>
```

```javascript
import Spreadsheet from "y-grid";

const s = new Spreadsheet("#spreadsheet")
  .loadData({})
  .change(data => {
    // save data to db
  });

// data validation
s.validate()
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
const s = new Spreadsheet("#spreadsheet")
s.on('cell-selected', (cell, ri, ci) => {});
s.on('cells-selected', (cell, { sri, sci, eri, eci }) => {});
s.on('cell-edited', (text, ri, ci) => {});
```

### Cell operations

```javascript
const s = new Spreadsheet("#spreadsheet")

// Update cell text: cellText(ri, ci, text, sheetIndex = 0)
s.cellText(5, 5, 'xxxx').cellText(6, 5, 'yyy').reRender();

// Get cell: cell(ri, ci, sheetIndex = 0)
s.cell(ri, ci);

// Get cell style: cellStyle(ri, ci, sheetIndex = 0)
s.cellStyle(ri, ci);
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
git clone https://github.com/nicksinclair/y-grid.git
cd y-grid
npm install
npm run dev
```

Open your browser and visit http://localhost:8080.

## Browser Support

Modern browsers (Chrome, Firefox, Safari).

## License

MIT
