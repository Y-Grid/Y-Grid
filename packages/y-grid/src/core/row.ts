import { expr2expr } from './alphabet';
import type { CellRange } from './cell-range';
import helper from './helper';
import type { Cell, Row, RowData } from './types';

export interface RowsConfig {
  len: number;
  height: number;
}

class Rows {
  _: Record<string, Row> = {};
  len: number;
  // default row height
  height: number;

  constructor({ len, height }: RowsConfig) {
    this.len = len;
    this.height = height;
  }

  getHeight(ri: number): number {
    if (this.isHide(ri)) return 0;
    const row = this.get(ri);
    if (row?.height) {
      return row.height;
    }
    return this.height;
  }

  setHeight(ri: number, v: number): void {
    const row = this.getOrNew(ri);
    row.height = v;
  }

  unhide(idx: number): void {
    let index = idx;
    while (index > 0) {
      index -= 1;
      if (this.isHide(index)) {
        this.setHide(index, false);
      } else break;
    }
  }

  isHide(ri: number): boolean {
    const row = this.get(ri);
    return !!row?.hide;
  }

  setHide(ri: number, v: boolean): void {
    const row = this.getOrNew(ri);
    if (v === true) row.hide = true;
    else row.hide = undefined;
  }

  setStyle(ri: number, style: number): void {
    const row = this.getOrNew(ri);
    row.style = style;
  }

  sumHeight(min: number, max: number, exceptSet?: Set<number>): number {
    return helper.rangeSum(min, max, (i) => {
      if (exceptSet?.has(i)) return 0;
      return this.getHeight(i);
    });
  }

  totalHeight(): number {
    return this.sumHeight(0, this.len);
  }

  get(ri: number): Row | undefined {
    return this._[ri];
  }

  getOrNew(ri: number): Row {
    this._[ri] = this._[ri] || { cells: {} };
    return this._[ri];
  }

  getCell(ri: number, ci: number): Cell | null {
    const row = this.get(ri);
    if (row !== undefined && row.cells !== undefined && row.cells[ci] !== undefined) {
      return row.cells[ci];
    }
    return null;
  }

  getCellMerge(ri: number, ci: number): [number, number] {
    const cell = this.getCell(ri, ci);
    if (cell?.merge) return cell.merge;
    return [0, 0];
  }

  getCellOrNew(ri: number, ci: number): Cell {
    const row = this.getOrNew(ri);
    row.cells[ci] = row.cells[ci] || {};
    return row.cells[ci];
  }

  // what: all | text | format
  setCell(ri: number, ci: number, cell: Cell, what: 'all' | 'text' | 'format' = 'all'): void {
    const row = this.getOrNew(ri);
    if (what === 'all') {
      row.cells[ci] = cell;
    } else if (what === 'text') {
      row.cells[ci] = row.cells[ci] || {};
      row.cells[ci].text = cell.text;
    } else if (what === 'format') {
      row.cells[ci] = row.cells[ci] || {};
      row.cells[ci].style = cell.style;
      if (cell.merge) row.cells[ci].merge = cell.merge;
    }
  }

  setCellText(ri: number, ci: number, text: string): void {
    const cell = this.getCellOrNew(ri, ci);
    if (cell.editable !== false) cell.text = text;
  }

  // what: all | format | text
  copyPaste(
    srcCellRange: CellRange,
    dstCellRange: CellRange,
    what: 'all' | 'text' | 'format',
    autofill = false,
    cb: (ri: number, ci: number, cell: Cell) => void = () => {}
  ): void {
    const { sri, sci, eri, eci } = srcCellRange;
    const dsri = dstCellRange.sri;
    const dsci = dstCellRange.sci;
    const deri = dstCellRange.eri;
    const deci = dstCellRange.eci;
    const [rn, cn] = srcCellRange.size();
    const [drn, dcn] = dstCellRange.size();
    let isAdd = true;
    let dn = 0;
    if (deri < sri || deci < sci) {
      isAdd = false;
      if (deri < sri) dn = drn;
      else dn = dcn;
    }
    for (let i = sri; i <= eri; i += 1) {
      if (this._[i]) {
        for (let j = sci; j <= eci; j += 1) {
          if (this._[i].cells?.[j]) {
            for (let ii = dsri; ii <= deri; ii += rn) {
              for (let jj = dsci; jj <= deci; jj += cn) {
                const nri = ii + (i - sri);
                const nci = jj + (j - sci);
                const ncell = helper.cloneDeep(this._[i].cells[j]);
                // ncell.text
                if (autofill && ncell && ncell.text && ncell.text.length > 0) {
                  const { text } = ncell;
                  let n = jj - dsci + (ii - dsri) + 2;
                  if (!isAdd) {
                    n -= dn + 1;
                  }
                  if (text[0] === '=') {
                    ncell.text = text.replace(/[a-zA-Z]{1,3}\d+/g, (word) => {
                      let [xn, yn] = [0, 0];
                      if (sri === dsri) {
                        xn = n - 1;
                      } else {
                        yn = n - 1;
                      }
                      if (/^\d+$/.test(word)) return word;
                      return expr2expr(word, xn, yn);
                    });
                  } else if (
                    (rn <= 1 && cn > 1 && (dsri > eri || deri < sri)) ||
                    (cn <= 1 && rn > 1 && (dsci > eci || deci < sci)) ||
                    (rn <= 1 && cn <= 1)
                  ) {
                    const result = /[\\.\d]+$/.exec(text);
                    if (result !== null) {
                      const index = Number(result[0]) + n - 1;
                      ncell.text = text.substring(0, result.index) + index;
                    }
                  }
                }
                this.setCell(nri, nci, ncell, what);
                cb(nri, nci, ncell);
              }
            }
          }
        }
      }
    }
  }

  cutPaste(srcCellRange: CellRange, dstCellRange: CellRange): void {
    const ncellmm: Record<string, Row> = {};
    this.each((ri) => {
      this.eachCells(ri, (ci) => {
        let nri = Number.parseInt(ri, 10);
        let nci = Number.parseInt(ci, 10);
        if (srcCellRange.includes(nri, nci)) {
          nri = dstCellRange.sri + (nri - srcCellRange.sri);
          nci = dstCellRange.sci + (nci - srcCellRange.sci);
        }
        ncellmm[nri] = ncellmm[nri] || { cells: {} };
        ncellmm[nri].cells[nci] = this._[ri].cells[ci];
      });
    });
    this._ = ncellmm;
  }

  // src: Array<Array<String>>
  paste(src: string[][], dstCellRange: CellRange): void {
    if (src.length <= 0) return;
    const { sri, sci } = dstCellRange;
    src.forEach((row, i) => {
      const ri = sri + i;
      row.forEach((cell, j) => {
        const ci = sci + j;
        this.setCellText(ri, ci, cell);
      });
    });
  }

  insert(sri: number, n = 1): void {
    const ndata: Record<string, Row> = {};
    this.each((ri, row) => {
      let nri = Number.parseInt(ri, 10);
      if (nri >= sri) {
        nri += n;
        this.eachCells(ri, (_ci, cell) => {
          if (cell.text && cell.text[0] === '=') {
            cell.text = cell.text.replace(/[a-zA-Z]{1,3}\d+/g, (word) =>
              expr2expr(word, 0, n, (_x, y) => y >= sri)
            );
          }
        });
      }
      ndata[nri] = row;
    });
    this._ = ndata;
    this.len += n;
  }

  delete(sri: number, eri: number): void {
    const n = eri - sri + 1;
    const ndata: Record<string, Row> = {};
    this.each((ri, row) => {
      const nri = Number.parseInt(ri, 10);
      if (nri < sri) {
        ndata[nri] = row;
      } else if (nri > eri) {
        ndata[nri - n] = row;
        this.eachCells(ri, (_ci, cell) => {
          if (cell.text && cell.text[0] === '=') {
            cell.text = cell.text.replace(/[a-zA-Z]{1,3}\d+/g, (word) =>
              expr2expr(word, 0, -n, (_x, y) => y > eri)
            );
          }
        });
      }
    });
    this._ = ndata;
    this.len -= n;
  }

  insertColumn(sci: number, n = 1): void {
    this.each((ri, row) => {
      const rndata: Record<string, Cell> = {};
      this.eachCells(ri, (ci, cell) => {
        let nci = Number.parseInt(ci, 10);
        if (nci >= sci) {
          nci += n;
          if (cell.text && cell.text[0] === '=') {
            cell.text = cell.text.replace(/[a-zA-Z]{1,3}\d+/g, (word) =>
              expr2expr(word, n, 0, (x) => x >= sci)
            );
          }
        }
        rndata[nci] = cell;
      });
      row.cells = rndata;
    });
  }

  deleteColumn(sci: number, eci: number): void {
    const n = eci - sci + 1;
    this.each((ri, row) => {
      const rndata: Record<string, Cell> = {};
      this.eachCells(ri, (ci, cell) => {
        const nci = Number.parseInt(ci, 10);
        if (nci < sci) {
          rndata[nci] = cell;
        } else if (nci > eci) {
          rndata[nci - n] = cell;
          if (cell.text && cell.text[0] === '=') {
            cell.text = cell.text.replace(/[a-zA-Z]{1,3}\d+/g, (word) =>
              expr2expr(word, -n, 0, (x) => x > eci)
            );
          }
        }
      });
      row.cells = rndata;
    });
  }

  // what: all | text | format | merge
  deleteCells(cellRange: CellRange, what: 'all' | 'text' | 'format' | 'merge' = 'all'): void {
    cellRange.each((i, j) => {
      this.deleteCell(i, j, what);
    });
  }

  // what: all | text | format | merge
  deleteCell(ri: number, ci: number, what: 'all' | 'text' | 'format' | 'merge' = 'all'): void {
    const row = this.get(ri);
    if (row !== undefined) {
      const cell = this.getCell(ri, ci);
      if (cell !== null && cell.editable !== false) {
        if (what === 'all') {
          delete row.cells[ci];
        } else if (what === 'text') {
          if (cell.text) cell.text = undefined;
          if (cell.value) cell.value = undefined;
        } else if (what === 'format') {
          if (cell.style !== undefined) cell.style = undefined;
          if (cell.merge) cell.merge = undefined;
        } else if (what === 'merge') {
          if (cell.merge) cell.merge = undefined;
        }
      }
    }
  }

  maxCell(): [number, number] {
    const keys = Object.keys(this._);
    const ri = keys[keys.length - 1];
    const col = this._[ri];
    if (col) {
      const { cells } = col;
      const ks = Object.keys(cells);
      const ci = ks[ks.length - 1];
      return [Number.parseInt(ri, 10), Number.parseInt(ci, 10)];
    }
    return [0, 0];
  }

  each(cb: (ri: string, row: Row) => void): void {
    for (const [ri, row] of Object.entries(this._)) {
      cb(ri, row);
    }
  }

  eachCells(ri: string | number, cb: (ci: string, cell: Cell) => void): void {
    if (this._[ri]?.cells) {
      for (const [ci, cell] of Object.entries(this._[ri].cells)) {
        cb(ci, cell);
      }
    }
  }

  setData(d: RowData): void {
    if (d.len) {
      this.len = d.len as number;
      d.len = undefined;
    }
    this._ = d as unknown as Record<string, Row>;
  }

  getData(): RowData {
    const { len } = this;
    return Object.assign({ len }, this._) as RowData;
  }
}

export default {};
export { Rows };
