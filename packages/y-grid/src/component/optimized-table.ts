/**
 * OptimizedTable - High-performance table renderer using the new rendering pipeline
 *
 * Integrates:
 * - Viewport for virtual rendering (only visible cells)
 * - DirtyTracker for partial redraws
 * - LayeredCanvas for efficient layer updates
 * - RenderScheduler for RAF batching
 */

import { LayeredCanvas, type LayerType } from '../canvas/layered-canvas';
import { DirtyTracker } from '../core/dirty-tracker';
import { RenderScheduler } from '../core/render-scheduler';
import { Viewport, type ViewportRange } from '../core/viewport';
import { stringAt } from '../core/alphabet';
import _cell from '../core/cell';
import { getFontSizePxByPt } from '../core/font';
import { formatm } from '../core/format';
import { formulam } from '../core/formula';
import {
  type Borders,
  Draw,
  DrawBox,
  type Font,
  type TextAlign,
  type TextValign,
  npx,
  thinLineWidth,
} from '../canvas/draw';

// Constants
const cellPaddingWidth = 5;
const tableFixedHeaderCleanStyle = { fillStyle: '#f4f5f8' };
const tableGridStyle = {
  fillStyle: '#fff',
  lineWidth: thinLineWidth(),
  strokeStyle: '#e6e6e6',
};

interface CellStyle {
  bgcolor?: string;
  border?: Borders;
  format?: string;
  font?: {
    size: number;
    name?: string;
    bold?: boolean;
    italic?: boolean;
  };
  align?: TextAlign;
  valign?: TextValign;
  color?: string;
  strike?: boolean;
  underline?: boolean;
  textwrap?: boolean;
}

interface CellData {
  text?: string;
  editable?: boolean;
}

interface DataProxy {
  viewWidth: () => number;
  viewHeight: () => number;
  viewRange: () => ViewportRange & {
    w: number;
    h: number;
    clone: () => ViewportRange & { w: number; h: number };
    each: (cb: (ri: number, ci: number) => void, filterCb?: (ri: number) => boolean) => void;
    intersects: (range: unknown) => boolean;
  };
  freezeViewRange: () => ViewportRange & { w: number; h: number };
  freeze: [number, number];
  scroll: { x: number; y: number };
  sortedRowMap: Map<number, number>;
  rows: {
    height: number;
    len: number;
    getHeight: (ri: number) => number;
    sumHeight: (start: number, end: number) => number;
    isHide: (ri: number) => boolean;
  };
  cols: {
    indexWidth: number;
    len: number;
    getWidth: (ci: number) => number;
    isHide: (ci: number) => boolean;
  };
  settings: {
    evalPaused?: boolean;
    showGrid?: boolean;
  };
  selector: {
    range: { sri: number; sci: number; eri: number; eci: number };
  };
  exceptRowSet: Set<number>;
  autoFilter: {
    active: () => boolean;
    hrange: () => ViewportRange & { each: (cb: (ri: number, ci: number) => void) => void };
  };
  validations: {
    getError: (ri: number, ci: number) => unknown;
  };
  getCell: (ri: number, ci: number) => CellData | null;
  getCellStyleOrDefault: (ri: number, ci: number) => CellStyle;
  getCellTextOrDefault: (ri: number, ci: number) => string;
  cellRect: (
    ri: number,
    ci: number
  ) => { left: number; top: number; width: number; height: number };
  rowEach: (start: number, end: number, cb: (i: number, y: number, height: number) => void) => void;
  colEach: (start: number, end: number, cb: (i: number, x: number, width: number) => void) => void;
  freezeTotalWidth: () => number;
  freezeTotalHeight: () => number;
  exceptRowTotalHeight: (start: number, end: number) => number;
  eachMergesInView: (
    range: ViewportRange,
    cb: (merge: { sri: number; sci: number; eri: number }) => void
  ) => void;
}

function tableFixedHeaderStyle(): Record<string, unknown> {
  return {
    textAlign: 'center',
    textBaseline: 'middle',
    font: `500 ${npx(12)}px Source Sans Pro`,
    fillStyle: '#585757',
    lineWidth: thinLineWidth(),
    strokeStyle: '#e6e6e6',
  };
}

function getDrawBox(data: DataProxy, rindex: number, cindex: number, yoffset = 0): DrawBox {
  const { left, top, width, height } = data.cellRect(rindex, cindex);
  return new DrawBox(left, top + yoffset, width, height, cellPaddingWidth);
}

export class OptimizedTable {
  private container: HTMLElement;
  private data: DataProxy;

  // Rendering pipeline components
  private viewport: Viewport;
  private dirtyTracker: DirtyTracker;
  private scheduler: RenderScheduler;

  // For backward compatibility, we keep single canvas for now
  // LayeredCanvas can be enabled later for further optimization
  private el: HTMLCanvasElement;
  private draw: Draw;

  // Layered canvas (optional, for future optimization)
  private layeredCanvas: LayeredCanvas | null = null;
  private useLayeredCanvas = false;

  constructor(el: HTMLCanvasElement, data: DataProxy) {
    this.el = el;
    this.container = el.parentElement || document.body;
    this.data = data;
    this.draw = new Draw(el, data.viewWidth(), data.viewHeight());

    // Initialize viewport
    this.viewport = new Viewport(
      { rowBuffer: 5, colBuffer: 3 },
      {
        getRowHeight: (ri) => data.rows.getHeight(ri),
        getColWidth: (ci) => data.cols.getWidth(ci),
        getTotalRows: () => data.rows.len,
        getTotalCols: () => data.cols.len,
        isRowHidden: (ri) => data.rows.isHide(ri),
        isColHidden: (ci) => data.cols.isHide(ci),
      }
    );

    // Initialize dirty tracker
    this.dirtyTracker = new DirtyTracker();

    // Initialize render scheduler
    this.scheduler = new RenderScheduler();
    this.scheduler.setRenderCallback(() => this.executeRender());

    // Mark everything dirty initially
    this.dirtyTracker.markAll();
  }

  /**
   * Enable layered canvas mode for further optimization
   */
  enableLayeredCanvas(): void {
    if (this.layeredCanvas) return;

    this.useLayeredCanvas = true;
    this.layeredCanvas = new LayeredCanvas(
      this.container,
      this.data.viewWidth(),
      this.data.viewHeight()
    );

    // Hide the original canvas
    this.el.style.display = 'none';
  }

  /**
   * Reset data (when switching sheets)
   */
  resetData(data: DataProxy): void {
    this.data = data;
    this.dirtyTracker.markAll();
    this.render();
  }

  /**
   * Schedule a render (batched via RAF)
   */
  render(): void {
    this.updateViewport();
    this.scheduler.schedule();
  }

  /**
   * Force immediate render (bypass RAF)
   */
  renderNow(): void {
    this.updateViewport();
    this.scheduler.renderNow();
  }

  /**
   * Mark cells as dirty
   */
  markCellsDirty(sri: number, sci: number, eri: number, eci: number): void {
    const { CellRange } = require('../core/cell-range');
    this.dirtyTracker.markRange(new CellRange(sri, sci, eri, eci));
    this.scheduler.schedule();
  }

  /**
   * Mark selection as dirty
   */
  markSelectionDirty(): void {
    this.dirtyTracker.markSelection();
    this.scheduler.scheduleHighPriority('selection', () => {});
  }

  /**
   * Mark scroll as dirty
   */
  markScrollDirty(): void {
    this.dirtyTracker.markScroll();
    this.scheduler.schedule();
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    if (this.useLayeredCanvas && this.layeredCanvas) {
      this.layeredCanvas.clearAll();
    } else {
      this.draw.clear();
    }
  }

  /**
   * Get FPS for debugging
   */
  getFps(): number {
    return this.scheduler.getFps();
  }

  /**
   * Update viewport state from data
   */
  private updateViewport(): void {
    const { data } = this;
    const [fri, fci] = data.freeze;

    this.viewport.setScroll(data.scroll.x, data.scroll.y);
    this.viewport.setViewSize(data.viewWidth(), data.viewHeight());
    this.viewport.setFreeze(fri, fci);
  }

  /**
   * Execute the actual render
   */
  private executeRender(): void {
    const { data, dirtyTracker } = this;

    // Resize canvas if needed
    if (this.useLayeredCanvas && this.layeredCanvas) {
      this.layeredCanvas.resize(data.viewWidth(), data.viewHeight());
    } else {
      this.draw.resize(data.viewWidth(), data.viewHeight());
    }

    const state = dirtyTracker.getState();

    if (!state.isDirty) return;

    // For now, always do full render (partial render optimization can come later)
    this.renderFull();

    // Clear dirty flags
    dirtyTracker.clear();
  }

  /**
   * Full render (same as original Table.render())
   */
  private renderFull(): void {
    const { data, draw } = this;
    const { rows, cols } = data;

    // Fixed widths
    const fw = cols.indexWidth;
    const fh = rows.height;

    this.clear();

    const viewRange = data.viewRange();
    const tx = data.freezeTotalWidth();
    const ty = data.freezeTotalHeight();
    const { x, y } = data.scroll;

    // Render main content
    this.renderContentGrid(viewRange, fw, fh, tx, ty);
    this.renderContent(viewRange, fw, fh, -x, -y);
    this.renderFixedHeaders('all', viewRange, fw, fh, tx, ty);
    this.renderFixedLeftTopCell(fw, fh);

    // Render frozen panes
    const [fri, fci] = data.freeze;
    if (fri > 0 || fci > 0) {
      if (fri > 0) {
        const vr = viewRange.clone();
        vr.sri = 0;
        vr.eri = fri - 1;
        vr.h = ty;
        this.renderContentGrid(vr, fw, fh, tx, 0);
        this.renderContent(vr, fw, fh, -x, 0);
        this.renderFixedHeaders('top', vr, fw, fh, tx, 0);
      }
      if (fci > 0) {
        const vr = viewRange.clone();
        vr.sci = 0;
        vr.eci = fci - 1;
        vr.w = tx;
        this.renderContentGrid(vr, fw, fh, 0, ty);
        this.renderFixedHeaders('left', vr, fw, fh, 0, ty);
        this.renderContent(vr, fw, fh, 0, -y);
      }
      const freezeViewRange = data.freezeViewRange();
      this.renderContentGrid(
        { ...freezeViewRange, w: freezeViewRange.width, h: freezeViewRange.height },
        fw,
        fh,
        0,
        0
      );
      this.renderFixedHeaders(
        'all',
        { ...freezeViewRange, w: freezeViewRange.width, h: freezeViewRange.height },
        fw,
        fh,
        0,
        0
      );
      this.renderContent(
        { ...freezeViewRange, w: freezeViewRange.width, h: freezeViewRange.height },
        fw,
        fh,
        0,
        0
      );
      this.renderFreezeHighlightLine(fw, fh, tx, ty);
    }
  }

  /**
   * Render cell content
   */
  private renderCell(rindex: number, cindex: number, yoffset = 0): void {
    const { data, draw } = this;
    const { sortedRowMap, rows, cols } = data;

    if (rows.isHide(rindex) || cols.isHide(cindex)) return;

    let nrindex = rindex;
    if (sortedRowMap.has(rindex)) {
      nrindex = sortedRowMap.get(rindex) ?? rindex;
    }

    const cell = data.getCell(nrindex, cindex);
    if (cell === null) return;

    let frozen = false;
    if ('editable' in cell && cell.editable === false) {
      frozen = true;
    }

    const style = data.getCellStyleOrDefault(nrindex, cindex);
    const dbox = getDrawBox(data, rindex, cindex, yoffset);
    dbox.bgcolor = style.bgcolor || '#ffffff';

    if (style.border !== undefined) {
      dbox.setBorders(style.border);
      draw.strokeBorders(dbox);
    }

    draw.rect(dbox, () => {
      let cellText: string | string[] = '';
      if (!data.settings.evalPaused) {
        cellText = _cell.render(cell.text || '', formulam, (y: number, x: number) =>
          data.getCellTextOrDefault(x, y)
        ) as string;
      } else {
        cellText = cell.text || '';
      }

      if (style.format) {
        const rendered = formatm[style.format].render(cellText as string);
        cellText = Array.isArray(rendered) ? rendered.join('.') : rendered;
      }

      const font: Font = {
        size: getFontSizePxByPt(style.font?.size ?? 10),
        name: style.font?.name ?? 'Arial',
        bold: style.font?.bold,
        italic: style.font?.italic,
      };

      draw.text(
        cellText as string,
        dbox,
        {
          align: style.align,
          valign: style.valign,
          font,
          color: style.color,
          strike: style.strike,
          underline: style.underline,
        },
        style.textwrap
      );

      const error = data.validations.getError(rindex, cindex);
      if (error) {
        draw.error(dbox);
      }
      if (frozen) {
        draw.frozen(dbox);
      }
    });
  }

  /**
   * Render autofilter dropdowns
   */
  private renderAutofilter(viewRange: ViewportRange | null): void {
    const { data, draw } = this;
    if (!viewRange) return;

    const { autoFilter } = data;
    if (!autoFilter.active()) return;

    const afRange = autoFilter.hrange();
    if ((viewRange as { intersects?: (r: unknown) => boolean }).intersects?.(afRange)) {
      afRange.each((ri: number, ci: number) => {
        const dbox = getDrawBox(data, ri, ci);
        draw.dropdown(dbox);
      });
    }
  }

  /**
   * Render cell content area
   */
  private renderContent(
    viewRange: ViewportRange & { w?: number; h?: number },
    fw: number,
    fh: number,
    tx: number,
    ty: number
  ): void {
    const { draw, data } = this;
    draw.save();
    draw.translate(fw, fh).translate(tx, ty);

    const { exceptRowSet } = data;
    const filteredTranslateFunc = (ri: number): boolean => {
      const ret = exceptRowSet.has(ri);
      if (ret) {
        const height = data.rows.getHeight(ri);
        draw.translate(0, -height);
      }
      return !ret;
    };

    const exceptRowTotalHeight = data.exceptRowTotalHeight(viewRange.sri, viewRange.eri);

    // Render cells
    draw.save();
    draw.translate(0, -exceptRowTotalHeight);
    const legacyRange = data.viewRange();
    legacyRange.each(
      (ri: number, ci: number) => {
        this.renderCell(ri, ci);
      },
      (ri: number) => filteredTranslateFunc(ri)
    );
    draw.restore();

    // Render merged cells
    const rset = new Set<number>();
    draw.save();
    draw.translate(0, -exceptRowTotalHeight);
    data.eachMergesInView(viewRange, ({ sri, sci, eri }) => {
      if (!exceptRowSet.has(sri)) {
        this.renderCell(sri, sci);
      } else if (!rset.has(sri)) {
        rset.add(sri);
        const height = data.rows.sumHeight(sri, eri + 1);
        draw.translate(0, -height);
      }
    });
    draw.restore();

    // Render autofilter
    this.renderAutofilter(viewRange);

    draw.restore();
  }

  /**
   * Render selected header cell highlight
   */
  private renderSelectedHeaderCell(x: number, y: number, w: number, h: number): void {
    const { draw } = this;
    draw.save();
    draw.attr({ fillStyle: 'rgba(75, 137, 255, 0.08)' }).fillRect(x, y, w, h);
    draw.restore();
  }

  /**
   * Render fixed headers (row/column labels)
   */
  private renderFixedHeaders(
    type: string,
    viewRange: ViewportRange & { w?: number; h?: number },
    w: number,
    h: number,
    tx: number,
    ty: number
  ): void {
    const { draw, data } = this;
    const sumHeight = viewRange.h ?? viewRange.height;
    const sumWidth = viewRange.w ?? viewRange.width;
    const nty = ty + h;
    const ntx = tx + w;

    draw.save();
    draw.attr(tableFixedHeaderCleanStyle);
    if (type === 'all' || type === 'left') draw.fillRect(0, nty, w, sumHeight);
    if (type === 'all' || type === 'top') draw.fillRect(ntx, 0, sumWidth, h);

    const { sri, sci, eri, eci } = data.selector.range;
    draw.attr(tableFixedHeaderStyle());

    // Y-header (row numbers)
    if (type === 'all' || type === 'left') {
      data.rowEach(viewRange.sri, viewRange.eri, (i: number, y1: number, rowHeight: number) => {
        const y = nty + y1;
        draw.line([0, y], [w, y]);
        if (sri <= i && i < eri + 1) {
          this.renderSelectedHeaderCell(0, y, w, rowHeight);
        }
        draw.fillText(String(i + 1), w / 2, y + rowHeight / 2);
        if (i > 0 && data.rows.isHide(i - 1)) {
          draw.save();
          draw.attr({ strokeStyle: '#c6c6c6' });
          draw.line([5, y + 5], [w - 5, y + 5]);
          draw.restore();
        }
      });
      draw.line([0, sumHeight + nty], [w, sumHeight + nty]);
      draw.line([w, nty], [w, sumHeight + nty]);
    }

    // X-header (column letters)
    if (type === 'all' || type === 'top') {
      data.colEach(viewRange.sci, viewRange.eci, (i: number, x1: number, colWidth: number) => {
        const x = ntx + x1;
        draw.line([x, 0], [x, h]);
        if (sci <= i && i < eci + 1) {
          this.renderSelectedHeaderCell(x, 0, colWidth, h);
        }
        draw.fillText(stringAt(i), x + colWidth / 2, h / 2);
        if (i > 0 && data.cols.isHide(i - 1)) {
          draw.save();
          draw.attr({ strokeStyle: '#c6c6c6' });
          draw.line([x + 5, 5], [x + 5, h - 5]);
          draw.restore();
        }
      });
      draw.line([sumWidth + ntx, 0], [sumWidth + ntx, h]);
      draw.line([0, h], [sumWidth + ntx, h]);
    }

    draw.restore();
  }

  /**
   * Render top-left fixed cell
   */
  private renderFixedLeftTopCell(fw: number, fh: number): void {
    const { draw } = this;
    draw.save();
    draw.attr({ fillStyle: '#f4f5f8' }).fillRect(0, 0, fw, fh);
    draw.restore();
  }

  /**
   * Render grid lines
   */
  private renderContentGrid(
    viewRange: ViewportRange & { w?: number; h?: number },
    fw: number,
    fh: number,
    tx: number,
    ty: number
  ): void {
    const { draw, data } = this;
    const { settings } = data;

    draw.save();
    draw.attr(tableGridStyle).translate(fw + tx, fh + ty);

    if (!settings.showGrid) {
      draw.restore();
      return;
    }

    const { sri, sci, eri, eci } = viewRange;
    const w = viewRange.w ?? viewRange.width;
    const h = viewRange.h ?? viewRange.height;

    data.rowEach(sri, eri, (i: number, y: number, ch: number) => {
      if (i !== sri) draw.line([0, y], [w, y]);
      if (i === eri) draw.line([0, y + ch], [w, y + ch]);
    });

    data.colEach(sci, eci, (i: number, x: number, cw: number) => {
      if (i !== sci) draw.line([x, 0], [x, h]);
      if (i === eci) draw.line([x + cw, 0], [x + cw, h]);
    });

    draw.restore();
  }

  /**
   * Render freeze pane highlight line
   */
  private renderFreezeHighlightLine(
    fw: number,
    fh: number,
    ftw: number,
    fth: number
  ): void {
    const { draw, data } = this;
    const twidth = data.viewWidth() - fw;
    const theight = data.viewHeight() - fh;

    draw.save().translate(fw, fh).attr({ strokeStyle: 'rgba(75, 137, 255, .6)' });
    draw.line([0, fth], [twidth, fth]);
    draw.line([ftw, 0], [ftw, theight]);
    draw.restore();
  }

  /**
   * Destroy and clean up
   */
  destroy(): void {
    this.scheduler.destroy();
    if (this.layeredCanvas) {
      this.layeredCanvas.destroy();
    }
  }
}

export default OptimizedTable;
