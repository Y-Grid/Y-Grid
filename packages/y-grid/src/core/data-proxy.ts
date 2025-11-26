/* global document */

import { t } from '../locale/locale';
import { expr2xy, xy2expr } from './alphabet';
import AutoFilter, { type FilterOperator, type SortOrder } from './auto-filter';
import { CellRange } from './cell-range';
import Clipboard from './clipboard';
import { Cols } from './col';
import helper from './helper';
import History from './history';
import { Merges } from './merge';
import { Rows } from './row';
import Scroll from './scroll';
import Selector from './selector';
import type { Cell, CellStyle } from './types';
import { Validations, type ValidatorConfig } from './validation';
import type Validator from './validator';

// private methods
/*
 * {
 *  name: ''
 *  freeze: [0, 0],
 *  formats: [],
 *  styles: [
 *    {
 *      bgcolor: '',
 *      align: '',
 *      valign: '',
 *      textwrap: false,
 *      strike: false,
 *      underline: false,
 *      color: '',
 *      format: 1,
 *      border: {
 *        left: [style, color],
 *        right: [style, color],
 *        top: [style, color],
 *        bottom: [style, color],
 *      },
 *      font: {
 *        name: 'Helvetica',
 *        size: 10,
 *        bold: false,
 *        italic: false,
 *      }
 *    }
 *  ],
 *  merges: [
 *    'A1:F11',
 *    ...
 *  ],
 *  rows: {
 *    1: {
 *      height: 50,
 *      style: 1,
 *      cells: {
 *        1: {
 *          style: 2,
 *          type: 'string',
 *          text: '',
 *          value: '', // cal result
 *        }
 *      }
 *    },
 *    ...
 *  },
 *  cols: {
 *    2: { width: 100, style: 1 }
 *  }
 * }
 */

export interface DataProxySettings {
  mode?: 'edit' | 'read';
  view?: {
    height: number | (() => number);
    width: number | (() => number);
  };
  showGrid?: boolean;
  showToolbar?: boolean;
  showContextmenu?: boolean;
  showBottomBar?: boolean;
  row?: {
    len: number;
    height: number;
  };
  col?: {
    len: number;
    width: number;
    indexWidth: number;
    minWidth: number;
  };
  style?: CellStyle;
  extendToolbar?: {
    left?: unknown[];
    right?: unknown[];
  };
  [key: string]: unknown;
}

export interface BorderStyle {
  mode: string;
  style: string;
  color: string;
}

export interface RectResult {
  l: number;
  t: number;
  left: number;
  top: number;
  height?: number;
  width?: number;
  scroll: Scroll;
}

export interface CellRectResult {
  ri: number;
  ci: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CellRectWithCell extends CellRectResult {
  cell: Cell | null;
}

interface InternalSettings {
  mode: 'edit' | 'read';
  view: {
    height: () => number;
    width: () => number;
  };
  showGrid: boolean;
  showToolbar: boolean;
  showContextmenu: boolean;
  showBottomBar: boolean;
  row: {
    len: number;
    height: number;
  };
  col: {
    len: number;
    width: number;
    indexWidth: number;
    minWidth: number;
  };
  style: CellStyle;
  extendToolbar?: {
    left?: unknown[];
    right?: unknown[];
  };
}

const defaultSettings: InternalSettings = {
  mode: 'edit',
  view: {
    height: () => document.documentElement.clientHeight,
    width: () => document.documentElement.clientWidth,
  },
  showGrid: true,
  showToolbar: true,
  showContextmenu: true,
  showBottomBar: true,
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
      name: 'Arial',
      size: 10,
      bold: false,
      italic: false,
    },
    format: 'normal',
  },
};

const toolbarHeight = 41;
const bottombarHeight = 41;

// src: cellRange
// dst: cellRange
function canPaste(
  this: DataProxy,
  src: CellRange,
  dst: CellRange,
  error: (msg: string) => void = () => {}
): boolean {
  const { merges } = this;
  const cellRange = dst.clone();
  const [srn, scn] = src.size();
  const [drn, dcn] = dst.size();
  if (srn > drn) {
    cellRange.eri = dst.sri + srn - 1;
  }
  if (scn > dcn) {
    cellRange.eci = dst.sci + scn - 1;
  }
  if (merges.intersects(cellRange)) {
    error(t('error.pasteForMergedCell'));
    return false;
  }
  return true;
}

function copyPaste(
  this: DataProxy,
  srcCellRange: CellRange,
  dstCellRange: CellRange,
  what: 'all' | 'text' | 'format',
  autofill = false
): void {
  const { rows, merges } = this;
  // delete dest merge
  if (what === 'all' || what === 'format') {
    rows.deleteCells(dstCellRange, what);
    merges.deleteWithin(dstCellRange);
  }
  rows.copyPaste(srcCellRange, dstCellRange, what, autofill, (ri, ci, cell) => {
    if (cell?.merge) {
      const [rn, cn] = cell.merge;
      if (rn <= 0 && cn <= 0) return;
      merges.add(new CellRange(ri, ci, ri + rn, ci + cn));
    }
  });
}

function cutPaste(this: DataProxy, srcCellRange: CellRange, dstCellRange: CellRange): void {
  const { clipboard, rows, merges } = this;
  rows.cutPaste(srcCellRange, dstCellRange);
  merges.move(
    srcCellRange,
    dstCellRange.sri - srcCellRange.sri,
    dstCellRange.sci - srcCellRange.sci
  );
  clipboard.clear();
}

// bss: { top, bottom, left, right }
function setStyleBorder(
  this: DataProxy,
  ri: number,
  ci: number,
  bss: Record<string, [string, string]>
): void {
  const { styles, rows } = this;
  const cell = rows.getCellOrNew(ri, ci);
  let cstyle: CellStyle = {};
  if (cell.style !== undefined) {
    cstyle = helper.cloneDeep(styles[cell.style]);
  }
  cstyle = helper.merge(cstyle, { border: bss });
  cell.style = this.addStyle(cstyle);
}

function setStyleBorders(this: DataProxy, { mode, style, color }: BorderStyle): void {
  const { styles, selector, rows } = this;
  const { sri, sci, eri, eci } = selector.range;
  const multiple = !this.isSingleSelected();
  if (!multiple) {
    if (mode === 'inside' || mode === 'horizontal' || mode === 'vertical') {
      return;
    }
  }
  if (mode === 'outside' && !multiple) {
    setStyleBorder.call(this, sri, sci, {
      top: [style, color],
      bottom: [style, color],
      left: [style, color],
      right: [style, color],
    });
  } else if (mode === 'none') {
    selector.range.each((ri, ci) => {
      const cell = rows.getCell(ri, ci);
      if (cell && cell.style !== undefined) {
        const ns = helper.cloneDeep(styles[cell.style]);
        ns.border = undefined;
        cell.style = this.addStyle(ns);
      }
    });
  } else if (
    mode === 'all' ||
    mode === 'inside' ||
    mode === 'outside' ||
    mode === 'horizontal' ||
    mode === 'vertical'
  ) {
    const merges: [number, number, number, number][] = [];
    for (let ri = sri; ri <= eri; ri += 1) {
      for (let ci = sci; ci <= eci; ci += 1) {
        // jump merges -- start
        const mergeIndexes: number[] = [];
        for (let ii = 0; ii < merges.length; ii += 1) {
          const [mri, mci, rn, cn] = merges[ii];
          if (ri === mri + rn + 1) mergeIndexes.push(ii);
          if (mri <= ri && ri <= mri + rn) {
            if (ci === mci) {
              ci += cn + 1;
              break;
            }
          }
        }
        for (const it of mergeIndexes) {
          merges.splice(it, 1);
        }
        if (ci > eci) break;
        // jump merges -- end
        const cell = rows.getCell(ri, ci);
        let [rn, cn] = [0, 0];
        if (cell?.merge) {
          [rn, cn] = cell.merge;
          merges.push([ri, ci, rn, cn]);
        }
        const mrl = rn > 0 && ri + rn === eri;
        const mcl = cn > 0 && ci + cn === eci;
        let bss: Record<string, [string, string]> = {};
        if (mode === 'all') {
          bss = {
            bottom: [style, color],
            top: [style, color],
            left: [style, color],
            right: [style, color],
          };
        } else if (mode === 'inside') {
          if (!mcl && ci < eci) bss.right = [style, color];
          if (!mrl && ri < eri) bss.bottom = [style, color];
        } else if (mode === 'horizontal') {
          if (!mrl && ri < eri) bss.bottom = [style, color];
        } else if (mode === 'vertical') {
          if (!mcl && ci < eci) bss.right = [style, color];
        } else if (mode === 'outside' && multiple) {
          if (sri === ri) bss.top = [style, color];
          if (mrl || eri === ri) bss.bottom = [style, color];
          if (sci === ci) bss.left = [style, color];
          if (mcl || eci === ci) bss.right = [style, color];
        }
        if (Object.keys(bss).length > 0) {
          setStyleBorder.call(this, ri, ci, bss);
        }
        ci += cn;
      }
    }
  } else if (mode === 'top' || mode === 'bottom') {
    for (let ci = sci; ci <= eci; ci += 1) {
      if (mode === 'top') {
        setStyleBorder.call(this, sri, ci, { top: [style, color] });
        ci += rows.getCellMerge(sri, ci)[1];
      }
      if (mode === 'bottom') {
        setStyleBorder.call(this, eri, ci, { bottom: [style, color] });
        ci += rows.getCellMerge(eri, ci)[1];
      }
    }
  } else if (mode === 'left' || mode === 'right') {
    for (let ri = sri; ri <= eri; ri += 1) {
      if (mode === 'left') {
        setStyleBorder.call(this, ri, sci, { left: [style, color] });
        ri += rows.getCellMerge(ri, sci)[0];
      }
      if (mode === 'right') {
        setStyleBorder.call(this, ri, eci, { right: [style, color] });
        ri += rows.getCellMerge(ri, eci)[0];
      }
    }
  }
}

function getCellRowByY(
  this: DataProxy,
  y: number,
  scrollOffsety: number
): { ri: number; top: number; height: number } {
  const { rows } = this;
  const fsh = this.freezeTotalHeight();
  let inits = rows.height;
  if (fsh + rows.height < y) inits -= scrollOffsety;

  // handle ri in autofilter
  const frset = this.exceptRowSet;

  let ri = 0;
  let top = inits;
  let { height } = rows;
  for (; ri < rows.len; ri += 1) {
    if (top > y) break;
    if (!frset.has(ri)) {
      height = rows.getHeight(ri);
      top += height;
    }
  }
  top -= height;

  if (top <= 0) {
    return { ri: -1, top: 0, height };
  }

  return { ri: ri - 1, top, height };
}

function getCellColByX(
  this: DataProxy,
  x: number,
  scrollOffsetx: number
): { ci: number; left: number; width: number } {
  const { cols } = this;
  const fsw = this.freezeTotalWidth();
  let inits = cols.indexWidth;
  if (fsw + cols.indexWidth < x) inits -= scrollOffsetx;
  const [ci, left, width] = helper.rangeReduceIf(0, cols.len, inits, cols.indexWidth, x, (i) =>
    cols.getWidth(i)
  );
  if (left <= 0) {
    return { ci: -1, left: 0, width: cols.indexWidth };
  }
  return { ci: ci - 1, left, width };
}

export default class DataProxy {
  settings: InternalSettings;
  name: string;
  freeze: [number, number];
  styles: CellStyle[];
  merges: Merges;
  rows: Rows;
  cols: Cols;
  validations: Validations;
  hyperlinks: Record<string, unknown>;
  comments: Record<string, unknown>;
  selector: Selector;
  scroll: Scroll;
  history: History;
  clipboard: Clipboard;
  autoFilter: AutoFilter;
  change: (data: unknown) => void;
  exceptRowSet: Set<number>;
  sortedRowMap: Map<number, number>;
  unsortedRowMap: Map<number, number>;

  constructor(name: string, settings?: DataProxySettings) {
    // Normalize view functions
    const normalizedSettings: DataProxySettings = { ...settings };
    if (normalizedSettings.view) {
      const view = normalizedSettings.view;
      normalizedSettings.view = {
        height: typeof view.height === 'function' ? view.height : () => view.height as number,
        width: typeof view.width === 'function' ? view.width : () => view.width as number,
      };
    }
    this.settings = helper.merge(
      defaultSettings as unknown as Record<string, unknown>,
      (normalizedSettings || {}) as Record<string, unknown>
    ) as unknown as InternalSettings;
    // save data begin
    this.name = name || 'sheet';
    this.freeze = [0, 0];
    this.styles = [];
    this.merges = new Merges();
    this.rows = new Rows(this.settings.row);
    this.cols = new Cols(this.settings.col);
    this.validations = new Validations();
    this.hyperlinks = {};
    this.comments = {};
    // save data end

    // don't save object
    this.selector = new Selector();
    this.scroll = new Scroll();
    this.history = new History();
    this.clipboard = new Clipboard();
    this.autoFilter = new AutoFilter();
    this.change = () => {};
    this.exceptRowSet = new Set();
    this.sortedRowMap = new Map();
    this.unsortedRowMap = new Map();
  }

  addValidation(mode: string, ref: string, validator: ValidatorConfig): void {
    this.changeData(() => {
      this.validations.add(mode, ref, validator);
    });
  }

  removeValidation(): void {
    const { range } = this.selector;
    this.changeData(() => {
      this.validations.remove(range);
    });
  }

  getSelectedValidator(): Validator | null {
    const { ri, ci } = this.selector;
    const v = this.validations.get(ri, ci);
    return v ? v.validator : null;
  }

  getSelectedValidation(): { ref: string; mode?: string; validator?: Validator } {
    const { ri, ci, range } = this.selector;
    const v = this.validations.get(ri, ci);
    const ret: { ref: string; mode?: string; validator?: Validator } = { ref: range.toString() };
    if (v !== null) {
      ret.mode = v.mode;
      ret.validator = v.validator;
    }
    return ret;
  }

  canUndo(): boolean {
    return this.history.canUndo();
  }

  canRedo(): boolean {
    return this.history.canRedo();
  }

  undo(): void {
    this.history.undo(this.getData(), (d) => {
      this.setData(d as Record<string, unknown>);
    });
  }

  redo(): void {
    this.history.redo(this.getData(), (d) => {
      this.setData(d as Record<string, unknown>);
    });
  }

  copy(): void {
    this.clipboard.copy(this.selector.range);
  }

  copyToSystemClipboard(evt?: ClipboardEvent): void {
    let copyText: string[][] | string = [];
    const { sri, eri, sci, eci } = this.selector.range;

    for (let ri = sri; ri <= eri; ri += 1) {
      const row: string[] = [];
      for (let ci = sci; ci <= eci; ci += 1) {
        const cell = this.getCell(ri, ci);
        row.push(cell?.text || '');
      }
      (copyText as string[][]).push(row);
    }

    copyText = (copyText as string[][]).map((row) => row.join('\t')).join('\n');

    if (evt) {
      evt.clipboardData?.clearData();
      evt.clipboardData?.setData('text/plain', copyText as string);
      evt.preventDefault();
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(copyText as string).then(
        () => {},
        (err) => {
          console.log('text copy to the system clipboard error  ', copyText, err);
        }
      );
    }
  }

  cut(): void {
    this.clipboard.cut(this.selector.range);
  }

  // what: all | text | format
  paste(what: 'all' | 'text' | 'format' = 'all', error: (msg: string) => void = () => {}): boolean {
    const { clipboard, selector } = this;
    if (clipboard.isClear() || !clipboard.range) return false;
    if (!canPaste.call(this, clipboard.range, selector.range, error)) return false;

    this.changeData(() => {
      if (clipboard.range) {
        if (clipboard.isCopy()) {
          copyPaste.call(this, clipboard.range, selector.range, what);
        } else if (clipboard.isCut()) {
          cutPaste.call(this, clipboard.range, selector.range);
        }
      }
    });
    return true;
  }

  pasteFromSystemClipboard(resetSheet: () => void, eventTrigger: (data: unknown) => void): void {
    const { selector } = this;
    navigator.clipboard.readText().then((content) => {
      const contentToPaste = this.parseClipboardContent(content);
      let startRow = selector.ri;
      for (const row of contentToPaste) {
        let startColumn = selector.ci;
        for (const cellContent of row) {
          this.setCellText(startRow, startColumn, cellContent, 'input');
          startColumn += 1;
        }
        startRow += 1;
      }
      resetSheet();
      eventTrigger(this.rows.getData());
    });
  }

  parseClipboardContent(clipboardContent: string): string[][] {
    const parsedData: string[][] = [];
    const rows = clipboardContent.split('\n');

    let i = 0;
    for (const row of rows) {
      parsedData[i] = row.split('\t');
      i += 1;
    }
    return parsedData;
  }

  pasteFromText(txt: string): void {
    let lines: string[][] = [];

    if (/\r\n/.test(txt)) lines = txt.split('\r\n').map((it) => it.replace(/"/g, '').split('\t'));
    else lines = txt.split('\n').map((it) => it.replace(/"/g, '').split('\t'));

    if (lines.length) {
      const { rows, selector } = this;

      this.changeData(() => {
        rows.paste(lines, selector.range);
      });
    }
  }

  autofill(
    cellRange: CellRange,
    what: 'all' | 'text' | 'format',
    error: (msg: string) => void = () => {}
  ): boolean {
    const srcRange = this.selector.range;
    if (!canPaste.call(this, srcRange, cellRange, error)) return false;
    this.changeData(() => {
      copyPaste.call(this, srcRange, cellRange, what, true);
    });
    return true;
  }

  clearClipboard(): void {
    this.clipboard.clear();
  }

  calSelectedRangeByEnd(ri: number, ci: number): CellRange {
    const { selector, rows, cols, merges } = this;
    let { sri, sci, eri, eci } = selector.range;
    const cri = selector.ri;
    const cci = selector.ci;
    let [nri, nci] = [ri, ci];
    if (ri < 0) nri = rows.len - 1;
    if (ci < 0) nci = cols.len - 1;
    if (nri > cri) [sri, eri] = [cri, nri];
    else [sri, eri] = [nri, cri];
    if (nci > cci) [sci, eci] = [cci, nci];
    else [sci, eci] = [nci, cci];
    selector.range = merges.union(new CellRange(sri, sci, eri, eci));
    selector.range = merges.union(selector.range);
    return selector.range;
  }

  calSelectedRangeByStart(ri: number, ci: number): CellRange {
    const { selector, rows, cols, merges } = this;
    let cellRange = merges.getFirstIncludes(ri, ci);
    if (cellRange === null) {
      cellRange = new CellRange(ri, ci, ri, ci);
      if (ri === -1) {
        cellRange.sri = 0;
        cellRange.eri = rows.len - 1;
      }
      if (ci === -1) {
        cellRange.sci = 0;
        cellRange.eci = cols.len - 1;
      }
    }
    selector.range = cellRange;
    return cellRange;
  }

  setSelectedCellAttr(property: string, value: unknown): void {
    this.changeData(() => {
      const { selector, styles, rows } = this;
      if (property === 'merge') {
        if (value) this.merge();
        else this.unmerge();
      } else if (property === 'border') {
        setStyleBorders.call(this, value as BorderStyle);
      } else if (property === 'formula') {
        const { ri, ci, range } = selector;
        if (selector.multiple()) {
          const [rn, cn] = selector.size();
          const { sri, sci, eri, eci } = range;
          if (rn > 1) {
            for (let i = sci; i <= eci; i += 1) {
              const cell = rows.getCellOrNew(eri + 1, i);
              cell.text = `=${value}(${xy2expr(i, sri)}:${xy2expr(i, eri)})`;
            }
          } else if (cn > 1) {
            const cell = rows.getCellOrNew(ri, eci + 1);
            cell.text = `=${value}(${xy2expr(sci, ri)}:${xy2expr(eci, ri)})`;
          }
        } else {
          const cell = rows.getCellOrNew(ri, ci);
          cell.text = `=${value}()`;
        }
      } else {
        selector.range.each((ri, ci) => {
          const cell = rows.getCellOrNew(ri, ci);
          let cstyle: CellStyle = {};
          if (cell.style !== undefined) {
            cstyle = helper.cloneDeep(styles[cell.style]);
          }
          if (property === 'format') {
            cstyle.format = value as string;
            cell.style = this.addStyle(cstyle);
          } else if (
            property === 'font-bold' ||
            property === 'font-italic' ||
            property === 'font-name' ||
            property === 'font-size'
          ) {
            const nfont: Record<string, unknown> = {};
            nfont[property.split('-')[1]] = value;
            cstyle.font = Object.assign(cstyle.font || {}, nfont);
            cell.style = this.addStyle(cstyle);
          } else if (
            property === 'strike' ||
            property === 'textwrap' ||
            property === 'underline' ||
            property === 'align' ||
            property === 'valign' ||
            property === 'color' ||
            property === 'bgcolor'
          ) {
            (cstyle as Record<string, unknown>)[property] = value;
            cell.style = this.addStyle(cstyle);
          } else {
            (cell as Record<string, unknown>)[property] = value;
          }
        });
      }
    });
  }

  // state: input | finished
  setSelectedCellText(text: string, state: 'input' | 'finished' = 'input'): void {
    const { autoFilter, selector, rows } = this;
    const { ri, ci } = selector;
    let nri = ri;
    if (this.unsortedRowMap.has(ri)) {
      nri = this.unsortedRowMap.get(ri) ?? ri;
    }
    const oldCell = rows.getCell(nri, ci);
    const oldText = oldCell ? oldCell.text : '';
    this.setCellText(nri, ci, text, state);
    // replace filter.value
    if (autoFilter.active()) {
      const filter = autoFilter.getFilter(ci);
      if (filter) {
        const vIndex = (filter.value as string[]).findIndex((v) => v === oldText);
        if (vIndex >= 0) {
          (filter.value as string[]).splice(vIndex, 1, text);
        }
      }
    }
  }

  getSelectedCell(): Cell | null {
    const { ri, ci } = this.selector;
    let nri = ri;
    if (this.unsortedRowMap.has(ri)) {
      nri = this.unsortedRowMap.get(ri) ?? ri;
    }
    return this.rows.getCell(nri, ci);
  }

  xyInSelectedRect(x: number, y: number): boolean {
    const { left, top, width, height } = this.getSelectedRect();
    const x1 = x - this.cols.indexWidth;
    const y1 = y - this.rows.height;
    return x1 > left && x1 < left + (width || 0) && y1 > top && y1 < top + (height || 0);
  }

  getSelectedRect(): RectResult {
    return this.getRect(this.selector.range);
  }

  getClipboardRect(): RectResult {
    const { clipboard } = this;
    if (!clipboard.isClear() && clipboard.range) {
      return this.getRect(clipboard.range);
    }
    return { left: -100, top: -100, l: 0, t: 0, scroll: this.scroll };
  }

  getRect(cellRange: CellRange): RectResult {
    const { scroll, rows, cols, exceptRowSet } = this;
    const { sri, sci, eri, eci } = cellRange;
    // no selector
    if (sri < 0 && sci < 0) {
      return {
        left: 0,
        l: 0,
        top: 0,
        t: 0,
        scroll,
      };
    }
    const left = cols.sumWidth(0, sci);
    const top = rows.sumHeight(0, sri, exceptRowSet);
    const height = rows.sumHeight(sri, eri + 1, exceptRowSet);
    const width = cols.sumWidth(sci, eci + 1);
    let left0 = left - scroll.x;
    let top0 = top - scroll.y;
    const fsh = this.freezeTotalHeight();
    const fsw = this.freezeTotalWidth();
    if (fsw > 0 && fsw > left) {
      left0 = left;
    }
    if (fsh > 0 && fsh > top) {
      top0 = top;
    }
    return {
      l: left,
      t: top,
      left: left0,
      top: top0,
      height,
      width,
      scroll,
    };
  }

  getCellRectByXY(x: number, y: number): CellRectResult {
    const { scroll, merges, rows, cols } = this;
    let { ri, top, height } = getCellRowByY.call(this, y, scroll.y);
    let { ci, left, width } = getCellColByX.call(this, x, scroll.x);
    if (ci === -1) {
      width = cols.totalWidth();
    }
    if (ri === -1) {
      height = rows.totalHeight();
    }
    if (ri >= 0 || ci >= 0) {
      const merge = merges.getFirstIncludes(ri, ci);
      if (merge) {
        ri = merge.sri;
        ci = merge.sci;
        ({ left, top, width, height } = this.cellRect(ri, ci));
      }
    }
    return {
      ri,
      ci,
      left,
      top,
      width,
      height,
    };
  }

  isSingleSelected(): boolean {
    const { sri, sci, eri, eci } = this.selector.range;
    const cell = this.getCell(sri, sci);
    if (cell?.merge) {
      const [rn, cn] = cell.merge;
      if (sri + rn === eri && sci + cn === eci) return true;
    }
    return !this.selector.multiple();
  }

  canUnmerge(): boolean {
    const { sri, sci, eri, eci } = this.selector.range;
    const cell = this.getCell(sri, sci);
    if (cell?.merge) {
      const [rn, cn] = cell.merge;
      if (sri + rn === eri && sci + cn === eci) return true;
    }
    return false;
  }

  merge(): void {
    const { selector, rows } = this;
    if (this.isSingleSelected()) return;
    const [rn, cn] = selector.size();
    if (rn > 1 || cn > 1) {
      const { sri, sci } = selector.range;
      this.changeData(() => {
        const cell = rows.getCellOrNew(sri, sci);
        cell.merge = [rn - 1, cn - 1];
        this.merges.add(selector.range);
        // delete merge cells
        this.rows.deleteCells(selector.range);
        this.rows.setCell(sri, sci, cell);
      });
    }
  }

  unmerge(): void {
    const { selector } = this;
    if (!this.isSingleSelected()) return;
    const { sri, sci } = selector.range;
    this.changeData(() => {
      this.rows.deleteCell(sri, sci, 'merge');
      this.merges.deleteWithin(selector.range);
    });
  }

  canAutofilter(): boolean {
    return !this.autoFilter.active();
  }

  autofilter(): void {
    const { autoFilter, selector } = this;
    this.changeData(() => {
      if (autoFilter.active()) {
        autoFilter.clear();
        this.exceptRowSet = new Set();
        this.sortedRowMap = new Map();
        this.unsortedRowMap = new Map();
      } else {
        autoFilter.ref = selector.range.toString();
      }
    });
  }

  setAutoFilter(
    ci: number,
    order: SortOrder | null,
    operator: FilterOperator,
    value: string | string[] | [number, number]
  ): void {
    const { autoFilter } = this;
    autoFilter.addFilter(ci, operator, value);
    autoFilter.setSort(ci, order);
    this.resetAutoFilter();
  }

  resetAutoFilter(): void {
    const { autoFilter, rows } = this;
    if (!autoFilter.active()) return;
    const { sort } = autoFilter;
    const { rset, fset } = autoFilter.filteredRows((r, c) => rows.getCell(r, c));
    const fary = Array.from(fset);
    const oldAry = Array.from(fset);
    if (sort) {
      fary.sort((a, b) => {
        if (sort.order === 'asc') return a - b;
        if (sort.order === 'desc') return b - a;
        return 0;
      });
    }
    this.exceptRowSet = rset;
    this.sortedRowMap = new Map();
    this.unsortedRowMap = new Map();
    fary.forEach((it, index) => {
      this.sortedRowMap.set(oldAry[index], it);
      this.unsortedRowMap.set(it, oldAry[index]);
    });
  }

  deleteCell(what: 'all' | 'text' | 'format' | 'merge' = 'all'): void {
    const { selector } = this;
    this.changeData(() => {
      this.rows.deleteCells(selector.range, what);
      if (what === 'all' || what === 'format') {
        this.merges.deleteWithin(selector.range);
      }
    });
  }

  // type: row | column
  insert(type: 'row' | 'column', n = 1): void {
    this.changeData(() => {
      const { sri, sci } = this.selector.range;
      const { rows, merges, cols } = this;
      let si = sri;
      if (type === 'row') {
        rows.insert(sri, n);
      } else if (type === 'column') {
        rows.insertColumn(sci, n);
        si = sci;
        cols.len += n;
        for (const colIndex of Object.keys(cols._).reverse()) {
          const col = Number.parseInt(colIndex, 10);
          if (col >= sci) {
            cols._[col + n] = cols._[col];
            delete cols._[col];
          }
        }
      }
      merges.shift(type, si, n, (ri, ci, rn, cn) => {
        const cell = rows.getCell(ri, ci);
        if (cell?.merge) {
          cell.merge[0] += rn;
          cell.merge[1] += cn;
        }
      });
    });
  }

  // type: row | column
  delete(type: 'row' | 'column'): void {
    this.changeData(() => {
      const { rows, merges, selector, cols } = this;
      const { range } = selector;
      const { sri, sci, eri, eci } = selector.range;
      const [rsize, csize] = selector.range.size();
      let si = sri;
      let size = rsize;
      if (type === 'row') {
        rows.delete(sri, eri);
      } else if (type === 'column') {
        rows.deleteColumn(sci, eci);
        si = range.sci;
        size = csize;
        cols.len -= eci - sci + 1;
        for (const colIndex of Object.keys(cols._)) {
          const col = Number.parseInt(colIndex, 10);
          if (col >= sci) {
            if (col > eci) cols._[col - (eci - sci + 1)] = cols._[col];
            delete cols._[col];
          }
        }
      }
      merges.shift(type, si, -size, (ri, ci, rn, cn) => {
        const cell = rows.getCell(ri, ci);
        if (cell?.merge) {
          cell.merge[0] += rn;
          cell.merge[1] += cn;
          if (cell.merge[0] === 0 && cell.merge[1] === 0) {
            cell.merge = undefined;
          }
        }
      });
    });
  }

  scrollx(x: number, cb: () => void): void {
    const { scroll, freeze, cols } = this;
    const [, fci] = freeze;
    const [ci, left, width] = helper.rangeReduceIf(fci, cols.len, 0, 0, x, (i) => cols.getWidth(i));
    let x1 = left;
    if (x > 0) x1 += width;
    if (scroll.x !== x1) {
      scroll.ci = x > 0 ? ci : 0;
      scroll.x = x1;
      cb();
    }
  }

  scrolly(y: number, cb: () => void): void {
    const { scroll, freeze, rows } = this;
    const [fri] = freeze;
    const [ri, top, height] = helper.rangeReduceIf(fri, rows.len, 0, 0, y, (i) =>
      rows.getHeight(i)
    );
    let y1 = top;
    if (y > 0) y1 += height;
    if (scroll.y !== y1) {
      scroll.ri = y > 0 ? ri : 0;
      scroll.y = y1;
      cb();
    }
  }

  cellRect(ri: number, ci: number): CellRectWithCell {
    const { rows, cols } = this;
    const left = cols.sumWidth(0, ci);
    const top = rows.sumHeight(0, ri);
    const cell = rows.getCell(ri, ci);
    let width = cols.getWidth(ci);
    let height = rows.getHeight(ri);
    if (cell !== null) {
      if (cell.merge) {
        const [rn, cn] = cell.merge;
        if (rn > 0) {
          for (let i = 1; i <= rn; i += 1) {
            height += rows.getHeight(ri + i);
          }
        }
        if (cn > 0) {
          for (let i = 1; i <= cn; i += 1) {
            width += cols.getWidth(ci + i);
          }
        }
      }
    }
    return {
      left,
      top,
      width,
      height,
      cell,
      ri,
      ci,
    };
  }

  getCell(ri: number, ci: number): Cell | null {
    return this.rows.getCell(ri, ci);
  }

  getCellTextOrDefault(ri: number, ci: number): string {
    const cell = this.getCell(ri, ci);
    return cell?.text ? cell.text : '';
  }

  getCellStyle(ri: number, ci: number): CellStyle | null {
    const cell = this.getCell(ri, ci);
    if (cell && cell.style !== undefined) {
      return this.styles[cell.style];
    }
    return null;
  }

  getCellStyleOrDefault(ri: number, ci: number): CellStyle {
    const { styles, rows } = this;
    const cell = rows.getCell(ri, ci);
    const cellStyle = cell && cell.style !== undefined ? styles[cell.style] : {};
    return helper.merge(this.defaultStyle(), cellStyle);
  }

  getSelectedCellStyle(): CellStyle {
    const { ri, ci } = this.selector;
    return this.getCellStyleOrDefault(ri, ci);
  }

  // state: input | finished
  setCellText(ri: number, ci: number, text: string, state: 'input' | 'finished'): void {
    const { rows, history, validations } = this;
    if (state === 'finished') {
      rows.setCellText(ri, ci, '');
      history.add(this.getData());
      rows.setCellText(ri, ci, text);
    } else {
      rows.setCellText(ri, ci, text);
      this.change(this.getData());
    }
    // validator
    validations.validate(ri, ci, text);
  }

  freezeIsActive(): boolean {
    const [ri, ci] = this.freeze;
    return ri > 0 || ci > 0;
  }

  setFreeze(ri: number, ci: number): void {
    this.changeData(() => {
      this.freeze = [ri, ci];
    });
  }

  freezeTotalWidth(): number {
    return this.cols.sumWidth(0, this.freeze[1]);
  }

  freezeTotalHeight(): number {
    return this.rows.sumHeight(0, this.freeze[0]);
  }

  setRowHeight(ri: number, height: number): void {
    this.changeData(() => {
      this.rows.setHeight(ri, height);
    });
  }

  setColWidth(ci: number, width: number): void {
    this.changeData(() => {
      this.cols.setWidth(ci, width);
    });
  }

  viewHeight(): number {
    const { view, showToolbar, showBottomBar } = this.settings;
    let h = view.height();
    if (showBottomBar) {
      h -= bottombarHeight;
    }
    if (showToolbar) {
      h -= toolbarHeight;
    }
    return h;
  }

  viewWidth(): number {
    return this.settings.view.width();
  }

  freezeViewRange(): CellRange {
    const [ri, ci] = this.freeze;
    return new CellRange(0, 0, ri - 1, ci - 1, this.freezeTotalWidth(), this.freezeTotalHeight());
  }

  contentRange(): CellRange {
    const { rows, cols } = this;
    const [ri, ci] = rows.maxCell();
    const h = rows.sumHeight(0, ri + 1);
    const w = cols.sumWidth(0, ci + 1);
    return new CellRange(0, 0, ri, ci, w, h);
  }

  exceptRowTotalHeight(sri: number, eri: number): number {
    const { exceptRowSet, rows } = this;
    const exceptRows = Array.from(exceptRowSet);
    let exceptRowTH = 0;
    for (const ri of exceptRows) {
      if (ri < sri || ri > eri) {
        const height = rows.getHeight(ri);
        exceptRowTH += height;
      }
    }
    return exceptRowTH;
  }

  viewRange(): CellRange {
    const { scroll, rows, cols, freeze, exceptRowSet } = this;
    let { ri, ci } = scroll;
    if (ri <= 0) [ri] = freeze;
    if (ci <= 0) [, ci] = freeze;

    let [x, y] = [0, 0];
    let [eri, eci] = [rows.len, cols.len];
    for (let i = ri; i < rows.len; i += 1) {
      if (!exceptRowSet.has(i)) {
        y += rows.getHeight(i);
        eri = i;
      }
      if (y > this.viewHeight()) break;
    }
    for (let j = ci; j < cols.len; j += 1) {
      x += cols.getWidth(j);
      eci = j;
      if (x > this.viewWidth()) break;
    }
    return new CellRange(ri, ci, eri, eci, x, y);
  }

  eachMergesInView(viewRange: CellRange, cb: (cellRange: CellRange) => void): void {
    for (const it of this.merges.filterIntersects(viewRange)._) {
      cb(it);
    }
  }

  hideRowsOrCols(): void {
    const { rows, cols, selector } = this;
    const [rlen, clen] = selector.size();
    const { sri, sci, eri, eci } = selector.range;
    if (rlen === rows.len) {
      for (let ci = sci; ci <= eci; ci += 1) {
        cols.setHide(ci, true);
      }
    } else if (clen === cols.len) {
      for (let ri = sri; ri <= eri; ri += 1) {
        rows.setHide(ri, true);
      }
    }
  }

  // type: row | col
  // index row-index | col-index
  unhideRowsOrCols(type: 'row' | 'col', index: number): void {
    (this as unknown as Record<string, { unhide: (i: number) => void }>)[`${type}s`].unhide(index);
  }

  rowEach(min: number, max: number, cb: (ri: number, y: number, rowHeight: number) => void): void {
    let y = 0;
    const { rows } = this;
    const frset = this.exceptRowSet;
    const frary = [...frset];
    let offset = 0;
    for (let i = 0; i < frary.length; i += 1) {
      if (frary[i] < min) {
        offset += 1;
      }
    }
    for (let i = min + offset; i <= max + offset; i += 1) {
      if (frset.has(i)) {
        offset += 1;
      } else {
        const rowHeight = rows.getHeight(i);
        if (rowHeight > 0) {
          cb(i, y, rowHeight);
          y += rowHeight;
          if (y > this.viewHeight()) break;
        }
      }
    }
  }

  colEach(min: number, max: number, cb: (ci: number, x: number, colWidth: number) => void): void {
    let x = 0;
    const { cols } = this;
    for (let i = min; i <= max; i += 1) {
      const colWidth = cols.getWidth(i);
      if (colWidth > 0) {
        cb(i, x, colWidth);
        x += colWidth;
        if (x > this.viewWidth()) break;
      }
    }
  }

  defaultStyle(): CellStyle {
    return this.settings.style;
  }

  addStyle(nstyle: CellStyle): number {
    const { styles } = this;
    for (let i = 0; i < styles.length; i += 1) {
      const style = styles[i];
      if (helper.equals(style as Record<string, unknown>, nstyle as Record<string, unknown>))
        return i;
    }
    styles.push(nstyle);
    return styles.length - 1;
  }

  changeData(cb: () => void): void {
    this.history.add(this.getData());
    cb();
    this.change(this.getData());
  }

  setData(d: Record<string, unknown>): this {
    for (const property of Object.keys(d)) {
      if (
        property === 'merges' ||
        property === 'rows' ||
        property === 'cols' ||
        property === 'validations'
      ) {
        (this as unknown as Record<string, { setData: (data: unknown) => void }>)[property].setData(
          d[property]
        );
      } else if (property === 'freeze') {
        const [x, y] = expr2xy(d[property] as string);
        this.freeze = [y, x];
      } else if (property === 'autofilter') {
        this.autoFilter.setData(d[property] as Record<string, unknown>);
      } else if (d[property] !== undefined) {
        (this as unknown as Record<string, unknown>)[property] = d[property];
      }
    }
    return this;
  }

  getData(): Record<string, unknown> {
    const { name, freeze, styles, merges, rows, cols, validations, autoFilter } = this;
    return {
      name,
      freeze: xy2expr(freeze[1], freeze[0]),
      styles,
      merges: merges.getData(),
      rows: rows.getData(),
      cols: cols.getData(),
      validations: validations.getData(),
      autofilter: autoFilter.getData(),
    };
  }
}
