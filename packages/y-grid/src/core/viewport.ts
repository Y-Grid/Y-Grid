/**
 * Viewport - Manages the visible range of cells in the grid
 *
 * Calculates which rows and columns are visible based on scroll position
 * and viewport dimensions. Adds buffer cells for smooth scrolling.
 */

export interface ViewportRange {
  /** Start row index (inclusive) */
  sri: number;
  /** Start column index (inclusive) */
  sci: number;
  /** End row index (inclusive) */
  eri: number;
  /** End column index (inclusive) */
  eci: number;
  /** Total width of visible range in pixels */
  width: number;
  /** Total height of visible range in pixels */
  height: number;
}

export interface ViewportConfig {
  /** Number of buffer rows above/below visible area */
  rowBuffer: number;
  /** Number of buffer columns left/right of visible area */
  colBuffer: number;
}

const DEFAULT_CONFIG: ViewportConfig = {
  rowBuffer: 5,
  colBuffer: 3,
};

export class Viewport {
  private config: ViewportConfig;

  // Cached viewport state
  private _scrollX = 0;
  private _scrollY = 0;
  private _viewWidth = 0;
  private _viewHeight = 0;
  private _freezeRows = 0;
  private _freezeCols = 0;

  // Cached computed range
  private _range: ViewportRange | null = null;
  private _dirty = true;

  // Callbacks to get row/col dimensions
  private getRowHeight: (ri: number) => number;
  private getColWidth: (ci: number) => number;
  private getTotalRows: () => number;
  private getTotalCols: () => number;
  private isRowHidden: (ri: number) => boolean;
  private isColHidden: (ci: number) => boolean;

  constructor(
    config: Partial<ViewportConfig> = {},
    callbacks: {
      getRowHeight: (ri: number) => number;
      getColWidth: (ci: number) => number;
      getTotalRows: () => number;
      getTotalCols: () => number;
      isRowHidden?: (ri: number) => boolean;
      isColHidden?: (ci: number) => boolean;
    }
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.getRowHeight = callbacks.getRowHeight;
    this.getColWidth = callbacks.getColWidth;
    this.getTotalRows = callbacks.getTotalRows;
    this.getTotalCols = callbacks.getTotalCols;
    this.isRowHidden = callbacks.isRowHidden ?? (() => false);
    this.isColHidden = callbacks.isColHidden ?? (() => false);
  }

  /**
   * Update scroll position
   */
  setScroll(x: number, y: number): void {
    if (this._scrollX !== x || this._scrollY !== y) {
      this._scrollX = x;
      this._scrollY = y;
      this._dirty = true;
    }
  }

  /**
   * Update viewport dimensions
   */
  setViewSize(width: number, height: number): void {
    if (this._viewWidth !== width || this._viewHeight !== height) {
      this._viewWidth = width;
      this._viewHeight = height;
      this._dirty = true;
    }
  }

  /**
   * Update freeze panes
   */
  setFreeze(rows: number, cols: number): void {
    if (this._freezeRows !== rows || this._freezeCols !== cols) {
      this._freezeRows = rows;
      this._freezeCols = cols;
      this._dirty = true;
    }
  }

  /**
   * Mark viewport as dirty (needs recalculation)
   */
  invalidate(): void {
    this._dirty = true;
  }

  /**
   * Get the visible range (with buffer)
   */
  getRange(): ViewportRange {
    if (this._dirty || !this._range) {
      this._range = this.calculateRange();
      this._dirty = false;
    }
    return this._range;
  }

  /**
   * Check if a cell is in the visible range
   */
  isVisible(ri: number, ci: number): boolean {
    const range = this.getRange();
    return ri >= range.sri && ri <= range.eri && ci >= range.sci && ci <= range.eci;
  }

  /**
   * Check if a row is in the visible range
   */
  isRowVisible(ri: number): boolean {
    const range = this.getRange();
    return ri >= range.sri && ri <= range.eri;
  }

  /**
   * Check if a column is in the visible range
   */
  isColVisible(ci: number): boolean {
    const range = this.getRange();
    return ci >= range.sci && ci <= range.eci;
  }

  /**
   * Find the first visible row at a given Y position
   */
  findRowAtY(y: number): { ri: number; top: number } {
    const totalRows = this.getTotalRows();
    let top = 0;

    for (let ri = this._freezeRows; ri < totalRows; ri++) {
      if (this.isRowHidden(ri)) continue;
      const height = this.getRowHeight(ri);
      if (top + height > y) {
        return { ri, top };
      }
      top += height;
    }

    return { ri: totalRows - 1, top };
  }

  /**
   * Find the first visible column at a given X position
   */
  findColAtX(x: number): { ci: number; left: number } {
    const totalCols = this.getTotalCols();
    let left = 0;

    for (let ci = this._freezeCols; ci < totalCols; ci++) {
      if (this.isColHidden(ci)) continue;
      const width = this.getColWidth(ci);
      if (left + width > x) {
        return { ci, left };
      }
      left += width;
    }

    return { ci: totalCols - 1, left };
  }

  /**
   * Calculate the visible range based on current state
   */
  private calculateRange(): ViewportRange {
    const { rowBuffer, colBuffer } = this.config;
    const totalRows = this.getTotalRows();
    const totalCols = this.getTotalCols();

    // Find first visible row
    const { ri: firstVisibleRow } = this.findRowAtY(this._scrollY);

    // Find first visible column
    const { ci: firstVisibleCol } = this.findColAtX(this._scrollX);

    // Calculate start indices (with buffer, but not before freeze)
    const sri = Math.max(this._freezeRows, firstVisibleRow - rowBuffer);
    const sci = Math.max(this._freezeCols, firstVisibleCol - colBuffer);

    // Find last visible row (accumulate height until we exceed viewport)
    let eri = firstVisibleRow;
    let accHeight = 0;
    for (let ri = firstVisibleRow; ri < totalRows; ri++) {
      if (this.isRowHidden(ri)) continue;
      accHeight += this.getRowHeight(ri);
      eri = ri;
      if (accHeight > this._viewHeight) break;
    }
    // Add buffer rows
    eri = Math.min(totalRows - 1, eri + rowBuffer);

    // Find last visible column (accumulate width until we exceed viewport)
    let eci = firstVisibleCol;
    let accWidth = 0;
    for (let ci = firstVisibleCol; ci < totalCols; ci++) {
      if (this.isColHidden(ci)) continue;
      accWidth += this.getColWidth(ci);
      eci = ci;
      if (accWidth > this._viewWidth) break;
    }
    // Add buffer columns
    eci = Math.min(totalCols - 1, eci + colBuffer);

    // Calculate total dimensions of the range
    let height = 0;
    for (let ri = sri; ri <= eri; ri++) {
      if (!this.isRowHidden(ri)) {
        height += this.getRowHeight(ri);
      }
    }

    let width = 0;
    for (let ci = sci; ci <= eci; ci++) {
      if (!this.isColHidden(ci)) {
        width += this.getColWidth(ci);
      }
    }

    return { sri, sci, eri, eci, width, height };
  }

  /**
   * Iterate over visible cells (optimized)
   */
  eachVisibleCell(
    callback: (ri: number, ci: number, x: number, y: number, w: number, h: number) => void
  ): void {
    const range = this.getRange();
    let y = 0;

    for (let ri = range.sri; ri <= range.eri; ri++) {
      if (this.isRowHidden(ri)) continue;
      const rowHeight = this.getRowHeight(ri);
      let x = 0;

      for (let ci = range.sci; ci <= range.eci; ci++) {
        if (this.isColHidden(ci)) continue;
        const colWidth = this.getColWidth(ci);
        callback(ri, ci, x, y, colWidth, rowHeight);
        x += colWidth;
      }

      y += rowHeight;
    }
  }

  /**
   * Iterate over visible rows
   */
  eachVisibleRow(callback: (ri: number, y: number, height: number) => void): void {
    const range = this.getRange();
    let y = 0;

    for (let ri = range.sri; ri <= range.eri; ri++) {
      if (this.isRowHidden(ri)) continue;
      const height = this.getRowHeight(ri);
      callback(ri, y, height);
      y += height;
    }
  }

  /**
   * Iterate over visible columns
   */
  eachVisibleCol(callback: (ci: number, x: number, width: number) => void): void {
    const range = this.getRange();
    let x = 0;

    for (let ci = range.sci; ci <= range.eci; ci++) {
      if (this.isColHidden(ci)) continue;
      const width = this.getColWidth(ci);
      callback(ci, x, width);
      x += width;
    }
  }
}

export default Viewport;
