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

// global var
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

interface ViewRange {
  sri: number;
  sci: number;
  eri: number;
  eci: number;
  w: number;
  h: number;
  clone: () => ViewRange;
  each: (cb: (ri: number, ci: number) => void, filterCb?: (ri: number) => boolean) => void;
  intersects: (range: unknown) => boolean;
}

interface DataProxy {
  viewWidth: () => number;
  viewHeight: () => number;
  viewRange: () => ViewRange;
  freezeViewRange: () => ViewRange;
  freeze: [number, number];
  scroll: { x: number; y: number };
  sortedRowMap: Map<number, number>;
  rows: {
    height: number;
    getHeight: (ri: number) => number;
    sumHeight: (start: number, end: number) => number;
    isHide: (ri: number) => boolean;
  };
  cols: {
    indexWidth: number;
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
    hrange: () => ViewRange;
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
    range: ViewRange,
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

export function renderCell(
  draw: Draw,
  data: DataProxy,
  rindex: number,
  cindex: number,
  yoffset = 0
): void {
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
  dbox.bgcolor = style.bgcolor;
  if (style.border !== undefined) {
    dbox.setBorders(style.border);
    draw.strokeBorders(dbox);
  }
  draw.rect(dbox, () => {
    // render text
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
    // error
    const error = data.validations.getError(rindex, cindex);
    if (error) {
      draw.error(dbox);
    }
    if (frozen) {
      draw.frozen(dbox);
    }
  });
}

function renderAutofilter(this: Table, viewRange: ViewRange | null): void {
  const { data, draw } = this;
  if (viewRange) {
    const { autoFilter } = data;
    if (!autoFilter.active()) return;
    const afRange = autoFilter.hrange();
    if (viewRange.intersects(afRange)) {
      afRange.each((ri: number, ci: number) => {
        const dbox = getDrawBox(data, ri, ci);
        draw.dropdown(dbox);
      });
    }
  }
}

function renderContent(
  this: Table,
  viewRange: ViewRange,
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
  // 1 render cell
  draw.save();
  draw.translate(0, -exceptRowTotalHeight);
  viewRange.each(
    (ri: number, ci: number) => {
      renderCell(draw, data, ri, ci);
    },
    (ri: number) => filteredTranslateFunc(ri)
  );
  draw.restore();

  // 2 render mergeCell
  const rset = new Set<number>();
  draw.save();
  draw.translate(0, -exceptRowTotalHeight);
  data.eachMergesInView(viewRange, ({ sri, sci, eri }) => {
    if (!exceptRowSet.has(sri)) {
      renderCell(draw, data, sri, sci);
    } else if (!rset.has(sri)) {
      rset.add(sri);
      const height = data.rows.sumHeight(sri, eri + 1);
      draw.translate(0, -height);
    }
  });
  draw.restore();

  // 3 render autofilter
  renderAutofilter.call(this, viewRange);

  draw.restore();
}

function renderSelectedHeaderCell(this: Table, x: number, y: number, w: number, h: number): void {
  const { draw } = this;
  draw.save();
  draw.attr({ fillStyle: 'rgba(75, 137, 255, 0.08)' }).fillRect(x, y, w, h);
  draw.restore();
}

// viewRange
// type: all | left | top
// w: the fixed width of header
// h: the fixed height of header
// tx: moving distance on x-axis
// ty: moving distance on y-axis
function renderFixedHeaders(
  this: Table,
  type: string,
  viewRange: ViewRange,
  w: number,
  h: number,
  tx: number,
  ty: number
): void {
  const { draw, data } = this;
  const sumHeight = viewRange.h;
  const sumWidth = viewRange.w;
  const nty = ty + h;
  const ntx = tx + w;

  draw.save();
  // draw rect background
  draw.attr(tableFixedHeaderCleanStyle);
  if (type === 'all' || type === 'left') draw.fillRect(0, nty, w, sumHeight);
  if (type === 'all' || type === 'top') draw.fillRect(ntx, 0, sumWidth, h);

  const { sri, sci, eri, eci } = data.selector.range;
  // draw text
  // text font, align...
  draw.attr(tableFixedHeaderStyle());
  // y-header-text
  if (type === 'all' || type === 'left') {
    data.rowEach(viewRange.sri, viewRange.eri, (i: number, y1: number, rowHeight: number) => {
      const y = nty + y1;
      const ii = i;
      draw.line([0, y], [w, y]);
      if (sri <= ii && ii < eri + 1) {
        renderSelectedHeaderCell.call(this, 0, y, w, rowHeight);
      }
      draw.fillText(String(ii + 1), w / 2, y + rowHeight / 2);
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
  // x-header-text
  if (type === 'all' || type === 'top') {
    data.colEach(viewRange.sci, viewRange.eci, (i: number, x1: number, colWidth: number) => {
      const x = ntx + x1;
      const ii = i;
      draw.line([x, 0], [x, h]);
      if (sci <= ii && ii < eci + 1) {
        renderSelectedHeaderCell.call(this, x, 0, colWidth, h);
      }
      draw.fillText(stringAt(ii), x + colWidth / 2, h / 2);
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

function renderFixedLeftTopCell(this: Table, fw: number, fh: number): void {
  const { draw } = this;
  draw.save();
  // left-top-cell
  draw.attr({ fillStyle: '#f4f5f8' }).fillRect(0, 0, fw, fh);
  draw.restore();
}

function renderContentGrid(
  this: Table,
  viewRange: ViewRange,
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
  const { sri, sci, eri, eci, w, h } = viewRange;
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

function renderFreezeHighlightLine(
  this: Table,
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

/** end */
class Table {
  el: HTMLCanvasElement;
  draw: Draw;
  data: DataProxy;

  constructor(el: HTMLCanvasElement, data: DataProxy) {
    this.el = el;
    this.draw = new Draw(el, data.viewWidth(), data.viewHeight());
    this.data = data;
  }

  resetData(data: DataProxy): void {
    this.data = data;
    this.render();
  }

  render(): void {
    // resize canvas
    const { data } = this;
    const { rows, cols } = data;
    // fixed width of header
    const fw = cols.indexWidth;
    // fixed height of header
    const fh = rows.height;

    this.draw.resize(data.viewWidth(), data.viewHeight());
    this.clear();

    const viewRange = data.viewRange();
    const tx = data.freezeTotalWidth();
    const ty = data.freezeTotalHeight();
    const { x, y } = data.scroll;
    // 1
    renderContentGrid.call(this, viewRange, fw, fh, tx, ty);
    renderContent.call(this, viewRange, fw, fh, -x, -y);
    renderFixedHeaders.call(this, 'all', viewRange, fw, fh, tx, ty);
    renderFixedLeftTopCell.call(this, fw, fh);
    const [fri, fci] = data.freeze;
    if (fri > 0 || fci > 0) {
      // 2
      if (fri > 0) {
        const vr = viewRange.clone();
        vr.sri = 0;
        vr.eri = fri - 1;
        vr.h = ty;
        renderContentGrid.call(this, vr, fw, fh, tx, 0);
        renderContent.call(this, vr, fw, fh, -x, 0);
        renderFixedHeaders.call(this, 'top', vr, fw, fh, tx, 0);
      }
      // 3
      if (fci > 0) {
        const vr = viewRange.clone();
        vr.sci = 0;
        vr.eci = fci - 1;
        vr.w = tx;
        renderContentGrid.call(this, vr, fw, fh, 0, ty);
        renderFixedHeaders.call(this, 'left', vr, fw, fh, 0, ty);
        renderContent.call(this, vr, fw, fh, 0, -y);
      }
      // 4
      const freezeViewRange = data.freezeViewRange();
      renderContentGrid.call(this, freezeViewRange, fw, fh, 0, 0);
      renderFixedHeaders.call(this, 'all', freezeViewRange, fw, fh, 0, 0);
      renderContent.call(this, freezeViewRange, fw, fh, 0, 0);
      // 5
      renderFreezeHighlightLine.call(this, fw, fh, tx, ty);
    }
  }

  clear(): void {
    this.draw.clear();
  }
}

export default Table;
