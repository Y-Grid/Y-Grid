import Bottombar from './component/bottombar';
/* global window, document */
import { h } from './component/element';
import Sheet from './component/sheet';
import { cssPrefix } from './config';
import { parseCSV, parseCSVFile } from './core/csv-parser';
import DataProxy from './core/data-proxy';
import { type LocaleMessages, locale } from './locale/locale';
import './index.less';

export interface ExtendToolbarOption {
  tip?: string;
  el?: HTMLElement;
  icon?: string;
  onClick?: (data: object, sheet: object) => void;
}

export interface Options {
  mode?: 'edit' | 'read';
  showToolbar?: boolean;
  showGrid?: boolean;
  showContextmenu?: boolean;
  showBottomBar?: boolean;
  extendToolbar?: {
    left?: ExtendToolbarOption[];
    right?: ExtendToolbarOption[];
  };
  autoFocus?: boolean;
  view?: {
    height: number | (() => number);
    width: number | (() => number);
  };
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
  style?: {
    bgcolor: string;
    align: 'left' | 'center' | 'right';
    valign: 'top' | 'middle' | 'bottom';
    textwrap: boolean;
    strike: boolean;
    underline: boolean;
    color: string;
    font: {
      name: string;
      size: number;
      bold: boolean;
      italic: boolean;
    };
  };
  [key: string]: unknown;
}

export type CellMerge = [number, number];

export interface ColProperties {
  width?: number;
}

export interface CellData {
  text: string;
  style?: number;
  merge?: CellMerge;
}

export interface RowData {
  cells: {
    [key: number]: CellData;
  };
}

export interface SheetData {
  name?: string;
  freeze?: string;
  styles?: CellStyle[];
  merges?: string[];
  cols?: {
    len?: number;
    [key: number]: ColProperties;
  };
  rows?: {
    len?: number;
    [key: number]: RowData;
  };
}

export interface CellStyle {
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  font?: {
    bold?: boolean;
    name?: string;
    size?: number;
    italic?: boolean;
  };
  bgcolor?: string;
  textwrap?: boolean;
  color?: string;
  strike?: boolean;
  underline?: boolean;
  border?: {
    top?: string[];
    right?: string[];
    bottom?: string[];
    left?: string[];
  };
}

interface CSVParseResult {
  headers: string[];
  data: string[][];
  rowCount: number;
  colCount: number;
}

interface CSVParseOptions {
  delimiter?: string;
  hasHeader?: boolean;
}

declare global {
  interface Window {
    YGrid: typeof YGrid;
    ygrid: typeof ygrid;
  }
}

class YGrid {
  options: Options & { showBottomBar: boolean };
  sheetIndex: number;
  datas: DataProxy[];
  bottombar: Bottombar | null;
  data: DataProxy;
  sheet: Sheet;

  constructor(selectors: string | HTMLElement, options: Options = {}) {
    let targetEl: HTMLElement | null = selectors as HTMLElement;
    this.options = { showBottomBar: true, ...options };
    this.sheetIndex = 1;
    this.datas = [];
    if (typeof selectors === 'string') {
      targetEl = document.querySelector(selectors);
    }
    if (!targetEl) {
      throw new Error('Target element not found');
    }
    this.bottombar = this.options.showBottomBar
      ? new Bottombar(
          () => {
            if (this.options.mode === 'read') return;
            const d = this.addSheet();
            this.sheet.resetData(d as unknown as ConstructorParameters<typeof Sheet>[1]);
          },
          (index: number) => {
            const d = this.datas[index];
            this.sheet.resetData(d as unknown as ConstructorParameters<typeof Sheet>[1]);
          },
          () => {
            this.deleteSheet();
          },
          (index: number, value: string) => {
            this.datas[index].name = value;
            this.sheet.trigger('change');
          }
        )
      : null;
    this.data = this.addSheet();
    const rootEl = h('div', `${cssPrefix}`).on('contextmenu', (evt) => evt.preventDefault());
    // create canvas element
    targetEl.appendChild(rootEl.el);
    this.sheet = new Sheet(rootEl, this.data as unknown as ConstructorParameters<typeof Sheet>[1]);
    if (this.bottombar !== null) {
      rootEl.child(this.bottombar.el);
    }
  }

  addSheet(name?: string, active = true): DataProxy {
    const n = name || `sheet${this.sheetIndex}`;
    const d = new DataProxy(n, this.options);
    d.change = (...args: unknown[]) => {
      this.sheet.trigger('change', ...args);
    };
    this.datas.push(d);
    if (this.bottombar !== null) {
      this.bottombar.addItem(n, active, this.options);
    }
    this.sheetIndex += 1;
    return d;
  }

  deleteSheet(): void {
    if (this.bottombar === null) return;

    const [oldIndex, nindex] = this.bottombar.deleteItem();
    if (oldIndex >= 0) {
      this.datas.splice(oldIndex, 1);
      if (nindex >= 0)
        this.sheet.resetData(
          this.datas[nindex] as unknown as ConstructorParameters<typeof Sheet>[1]
        );
      this.sheet.trigger('change');
    }
  }

  loadData(data: SheetData | SheetData[]): this {
    const ds = Array.isArray(data) ? data : [data];
    if (this.bottombar !== null) {
      this.bottombar.clear();
    }
    this.datas = [];
    if (ds.length > 0) {
      for (let i = 0; i < ds.length; i += 1) {
        const it = ds[i];
        const nd = this.addSheet(it.name, i === 0);
        nd.setData(it as unknown as Record<string, unknown>);
        if (i === 0) {
          this.sheet.resetData(nd as unknown as ConstructorParameters<typeof Sheet>[1]);
        }
      }
    }
    return this;
  }

  getData(): SheetData[] {
    return this.datas.map((it) => it.getData()) as SheetData[];
  }

  cellText(ri: number, ci: number, text: string, sheetIndex = 0): this {
    this.datas[sheetIndex].setCellText(ri, ci, text, 'finished');
    return this;
  }

  cell(ri: number, ci: number, sheetIndex = 0): CellData | null {
    const c = this.datas[sheetIndex].getCell(ri, ci);
    if (!c) return null;
    return { text: c.text || '', style: c.style, merge: c.merge };
  }

  cellStyle(ri: number, ci: number, sheetIndex = 0): CellStyle | null {
    return this.datas[sheetIndex].getCellStyle(ri, ci);
  }

  reRender(): this {
    this.sheet.table.render();
    return this;
  }

  on(eventName: string, func: (...args: unknown[]) => void): this {
    this.sheet.on(eventName, func);
    return this;
  }

  validate(): boolean {
    const { validations } = this.data;
    return validations.errors.size <= 0;
  }

  change(cb: (...args: unknown[]) => void): this {
    this.sheet.on('change', cb);
    return this;
  }

  /**
   * Import CSV file into the grid
   * @param file - CSV file to import
   * @param options - Parse options
   * @returns Promise with row and column counts
   */
  async importCSV(
    file: File,
    options: CSVParseOptions = {}
  ): Promise<{ rowCount: number; colCount: number }> {
    const result = await parseCSVFile(file, options);
    this.loadCSVData(result);
    return {
      rowCount: result.rowCount,
      colCount: result.colCount,
    };
  }

  /**
   * Import CSV text into the grid
   * @param text - CSV text to import
   * @param options - Parse options
   * @returns Row and column counts
   */
  importCSVText(
    text: string,
    options: CSVParseOptions = {}
  ): { rowCount: number; colCount: number } {
    const result = parseCSV(text, options);
    this.loadCSVData(result);
    return {
      rowCount: result.rowCount,
      colCount: result.colCount,
    };
  }

  /**
   * Load parsed CSV data into grid
   * @private
   */
  private loadCSVData(result: CSVParseResult): void {
    const { headers, data } = result;
    if (data.length === 0 && headers.length === 0) return;

    // Include headers as first row
    const allRows = headers.length > 0 ? [headers, ...data] : data;
    const rows: { len: number; [key: number]: { cells: { [key: number]: { text: string } } } } = {
      len: allRows.length,
    };

    allRows.forEach((row, ri) => {
      const cells: { [key: number]: { text: string } } = {};
      row.forEach((cell, ci) => {
        if (cell !== '') {
          cells[ci] = { text: cell };
        }
      });
      if (Object.keys(cells).length > 0) {
        rows[ri] = { cells };
      }
    });

    this.loadData([{ rows } as SheetData]);
  }

  static locale(lang: string, message?: LocaleMessages): void {
    locale(lang, message);
  }
}

const ygrid = (el: string | HTMLElement, options: Options = {}): YGrid => new YGrid(el, options);

if (typeof window !== 'undefined') {
  window.YGrid = YGrid;
  window.ygrid = ygrid;
}

export default YGrid;
export { YGrid, ygrid };

// CSV Parser exports
export * as csvParser from './core/csv-parser';

// Rendering Pipeline exports (Phase 2)
export { Viewport, type ViewportRange, type ViewportConfig } from './core/viewport';
export { DirtyTracker, type DirtyType, type DirtyRegion, type DirtyState } from './core/dirty-tracker';
export { RenderScheduler, type RenderPriority, type RenderTask, throttle, debounce } from './core/render-scheduler';
export { LayeredCanvas, Layer, type LayerType, type LayerConfig } from './canvas/layered-canvas';
export { OptimizedTable } from './component/optimized-table';
