import { cssPrefix } from '../config';
import { formulas } from '../core/formula';
import ContextMenu from './contextmenu';
import Editor from './editor';
import { type Element, h } from './element';
import { bind, bindTouch, createEventEmitter, mouseMoveUp } from './event';
import { xtoast } from './message';
import ModalValidation from './modal-validation';
import Print from './print';
import Resizer from './resizer';
import Scrollbar from './scrollbar';
import Selector from './selector';
import SortFilter from './sort-filter';
import Table from './table';
import Toolbar from './toolbar/index';

interface DataProxy {
  settings: {
    view: { width: number; height: number };
    showToolbar: boolean;
    showContextmenu: boolean;
    mode?: string;
  };
  rows: {
    height: number;
    len: number;
    getHeight: (ri: number) => number;
    setHeight: (ri: number, height: number) => void;
    isHide: (ri: number) => boolean;
    totalHeight: () => number;
    getCell: (ri: number, ci: number) => unknown;
  };
  cols: {
    indexWidth: number;
    minWidth: number;
    len: number;
    getWidth: (ci: number) => number;
    setWidth: (ci: number, width: number) => void;
    isHide: (ci: number) => boolean;
    totalWidth: () => number;
  };
  scroll: { ri: number; ci: number; x: number; y: number };
  selector: {
    ri: number;
    ci: number;
    range: { sri: number; sci: number; eri: number; eci: number };
    multiple: () => boolean;
  };
  freeze: [number, number];
  clipboard: { isClear: () => boolean };
  autoFilter: {
    includes: (ri: number, ci: number) => boolean;
    items: (ci: number, fn: (r: number, c: number) => unknown) => Record<string, number>;
    getFilter: (ci: number) => unknown;
    getSort: (ci: number) => unknown;
  };
  viewWidth: () => number;
  viewHeight: () => number;
  freezeTotalWidth: () => number;
  freezeTotalHeight: () => number;
  getSelectedRect: () => {
    l: number;
    t: number;
    left: number;
    top: number;
    width: number;
    height: number;
  };
  getCellRectByXY: (
    x: number,
    y: number
  ) => { ri: number; ci: number; left: number; top: number; width: number; height: number };
  xyInSelectedRect: (x: number, y: number) => boolean;
  getCell: (ri: number, ci: number) => unknown;
  getSelectedCell: () => unknown;
  getSelectedValidator: () => unknown;
  getSelectedValidation: () => unknown;
  exceptRowTotalHeight: (start: number, end: number) => number;
  calSelectedRangeByStart: (ri: number, ci: number) => unknown;
  calSelectedRangeByEnd: (ri: number, ci: number) => unknown;
  scrolly: (distance: number, cb: () => void) => void;
  scrollx: (distance: number, cb: () => void) => void;
  setFreeze: (ri: number, ci: number) => void;
  setData: (data: unknown) => void;
  setSelectedCellText: (text: string, state: string) => void;
  setSelectedCellAttr: (type: string, value: unknown) => void;
  setAutoFilter: (ci: number, order: string | null, operator: string, value: string[]) => void;
  copy: () => void;
  copyToSystemClipboard: (evt: Event) => void;
  cut: () => void;
  paste: (what: string, msgFn: (msg: string) => void) => boolean;
  pasteFromText: (text: string) => void;
  pasteFromSystemClipboard: (resetFn: () => void, eventFn: (rows: unknown) => void) => void;
  clearClipboard: () => void;
  autofill: (range: unknown, what: string, msgFn: (msg: string) => void) => boolean;
  insert: (type: string) => void;
  delete: (type: string) => void;
  deleteCell: (type?: string) => void;
  hideRowsOrCols: () => void;
  unhideRowsOrCols: (type: string, index: number) => void;
  autofilter: () => void;
  undo: () => void;
  redo: () => void;
  addValidation: (...args: unknown[]) => void;
  removeValidation: () => void;
}

interface EventEmitter {
  on: (eventName: string, callback: (...args: unknown[]) => void) => void;
  fire: (eventName: string, args: unknown[]) => void;
}

/**
 * @desc throttle fn
 * @param func function
 * @param wait Delay in milliseconds
 */
function throttle(func: (...args: unknown[]) => void, wait: number): (...args: unknown[]) => void {
  let timeout: ReturnType<typeof setTimeout> | null;
  return (...arg: unknown[]) => {
    const args = arg;
    if (!timeout) {
      timeout = setTimeout(() => {
        timeout = null;
        func.apply(null, args);
      }, wait);
    }
  };
}

function scrollbarMove(this: Sheet): void {
  const { data, verticalScrollbar, horizontalScrollbar } = this;
  const { l, t, left, top, width, height } = data.getSelectedRect();
  const tableOffset = this.getTableOffset();
  if (Math.abs(left) + width > tableOffset.width) {
    horizontalScrollbar.move({ left: l + width - tableOffset.width });
  } else {
    const fsw = data.freezeTotalWidth();
    if (left < fsw) {
      horizontalScrollbar.move({ left: l - 1 - fsw });
    }
  }
  if (Math.abs(top) + height > tableOffset.height) {
    verticalScrollbar.move({ top: t + height - tableOffset.height - 1 });
  } else {
    const fsh = data.freezeTotalHeight();
    if (top < fsh) {
      verticalScrollbar.move({ top: t - 1 - fsh });
    }
  }
}

function selectorSet(
  this: Sheet,
  multiple: boolean,
  ri: number,
  ci: number,
  indexesUpdated = true,
  moving = false
): void {
  if (ri === -1 && ci === -1) return;
  const { table, selector, toolbar, data, contextMenu } = this;
  const cell = data.getCell(ri, ci);
  if (multiple) {
    selector.setEnd(ri, ci, moving);
    this.trigger('cells-selected', cell, selector.range);
  } else {
    selector.set(ri, ci, indexesUpdated);
    this.trigger('cell-selected', cell, ri, ci);
  }
  contextMenu.setMode(ri === -1 || ci === -1 ? 'row-col' : 'range');
  toolbar.reset();
  table.render();
}

function selectorMove(this: Sheet, multiple: boolean, direction: string): void {
  const { selector, data } = this;
  const { rows, cols } = data;
  if (!selector.indexes || !selector.range) return;
  let [ri, ci] = selector.indexes;
  const { eri, eci } = selector.range;
  if (multiple && selector.moveIndexes) {
    [ri, ci] = selector.moveIndexes;
  }
  if (direction === 'left') {
    if (ci > 0) ci -= 1;
  } else if (direction === 'right') {
    if (eci !== ci) ci = eci;
    if (ci < cols.len - 1) ci += 1;
  } else if (direction === 'up') {
    if (ri > 0) ri -= 1;
  } else if (direction === 'down') {
    if (eri !== ri) ri = eri;
    if (ri < rows.len - 1) ri += 1;
  } else if (direction === 'row-first') {
    ci = 0;
  } else if (direction === 'row-last') {
    ci = cols.len - 1;
  } else if (direction === 'col-first') {
    ri = 0;
  } else if (direction === 'col-last') {
    ri = rows.len - 1;
  }
  if (multiple) {
    selector.moveIndexes = [ri, ci];
  }
  selectorSet.call(this, multiple, ri, ci);
  scrollbarMove.call(this);
}

function overlayerMousemove(this: Sheet, evt: MouseEvent): void {
  if (evt.buttons !== 0) return;
  if ((evt.target as HTMLElement).className === `${cssPrefix}-resizer-hover`) return;
  const { offsetX, offsetY } = evt;
  const { rowResizer, colResizer, tableEl, data } = this;
  const { rows, cols } = data;
  if (offsetX > cols.indexWidth && offsetY > rows.height) {
    rowResizer.hide();
    colResizer.hide();
    return;
  }
  const tRect = tableEl.box();
  const cRect = data.getCellRectByXY(evt.offsetX, evt.offsetY);
  if (cRect.ri >= 0 && cRect.ci === -1) {
    (cRect as { width: number }).width = cols.indexWidth;
    rowResizer.show(cRect as { left: number; top: number; width: number; height: number }, {
      width: tRect.width,
      height: 0,
    });
    if (rows.isHide(cRect.ri - 1)) {
      rowResizer.showUnhide(cRect.ri);
    } else {
      rowResizer.hideUnhide();
    }
  } else {
    rowResizer.hide();
  }
  if (cRect.ri === -1 && cRect.ci >= 0) {
    (cRect as { height: number }).height = rows.height;
    colResizer.show(cRect as { left: number; top: number; width: number; height: number }, {
      height: tRect.height,
      width: 0,
    });
    if (cols.isHide(cRect.ci - 1)) {
      colResizer.showUnhide(cRect.ci);
    } else {
      colResizer.hideUnhide();
    }
  } else {
    colResizer.hide();
  }
}

function overlayerMousescroll(this: Sheet, evt: WheelEvent): void {
  const { verticalScrollbar, horizontalScrollbar, data } = this;
  const { top } = verticalScrollbar.scroll();
  const { left } = horizontalScrollbar.scroll();

  const { rows, cols } = data;
  const { deltaY, deltaX } = evt;
  const loopValue = (ii: number, vFunc: (i: number) => number): number => {
    let i = ii;
    let v = 0;
    do {
      v = vFunc(i);
      i += 1;
    } while (v <= 0);
    return v;
  };

  const moveY = (vertical: number): void => {
    if (vertical > 0) {
      const ri = data.scroll.ri + 1;
      if (ri < rows.len) {
        const rh = loopValue(ri, (i) => rows.getHeight(i));
        verticalScrollbar.move({ top: (top || 0) + rh - 1 });
      }
    } else {
      const ri = data.scroll.ri - 1;
      if (ri >= 0) {
        const rh = loopValue(ri, (i) => rows.getHeight(i));
        verticalScrollbar.move({ top: ri === 0 ? 0 : (top || 0) - rh });
      }
    }
  };

  const moveX = (horizontal: number): void => {
    if (horizontal > 0) {
      const ci = data.scroll.ci + 1;
      if (ci < cols.len) {
        const cw = loopValue(ci, (i) => cols.getWidth(i));
        horizontalScrollbar.move({ left: (left || 0) + cw - 1 });
      }
    } else {
      const ci = data.scroll.ci - 1;
      if (ci >= 0) {
        const cw = loopValue(ci, (i) => cols.getWidth(i));
        horizontalScrollbar.move({ left: ci === 0 ? 0 : (left || 0) - cw });
      }
    }
  };

  const tempY = Math.abs(deltaY);
  const tempX = Math.abs(deltaX);
  const temp = Math.max(tempY, tempX);
  if (/Firefox/i.test(window.navigator.userAgent))
    throttle(() => moveY((evt as unknown as { detail: number }).detail), 50);
  if (temp === tempX) throttle(() => moveX(deltaX), 50);
  if (temp === tempY) throttle(() => moveY(deltaY), 50);
}

function overlayerTouch(this: Sheet, direction: string, distance: number): void {
  const { verticalScrollbar, horizontalScrollbar } = this;
  const { top } = verticalScrollbar.scroll();
  const { left } = horizontalScrollbar.scroll();

  if (direction === 'left' || direction === 'right') {
    horizontalScrollbar.move({ left: (left || 0) - distance });
  } else if (direction === 'up' || direction === 'down') {
    verticalScrollbar.move({ top: (top || 0) - distance });
  }
}

function verticalScrollbarSet(this: Sheet): void {
  const { data, verticalScrollbar } = this;
  const { height } = this.getTableOffset();
  const erth = data.exceptRowTotalHeight(0, -1);
  verticalScrollbar.set(height, data.rows.totalHeight() - erth);
}

function horizontalScrollbarSet(this: Sheet): void {
  const { data, horizontalScrollbar } = this;
  const { width } = this.getTableOffset();
  if (data) {
    horizontalScrollbar.set(width, data.cols.totalWidth());
  }
}

function sheetFreeze(this: Sheet): void {
  const { selector, data, editor } = this;
  const [ri, ci] = data.freeze;
  if (ri > 0 || ci > 0) {
    const fwidth = data.freezeTotalWidth();
    const fheight = data.freezeTotalHeight();
    editor.setFreezeLengths(fwidth, fheight);
  }
  selector.resetAreaOffset();
}

function sheetReset(this: Sheet): void {
  const { tableEl, overlayerEl, overlayerCEl, table, toolbar, selector, el } = this;
  const tOffset = this.getTableOffset();
  const vRect = this.getRect();
  tableEl.attr({ width: String(vRect.width), height: String(vRect.height) });
  overlayerEl.offset(vRect);
  overlayerCEl.offset(tOffset);
  el.css('width', `${vRect.width}px`);
  verticalScrollbarSet.call(this);
  horizontalScrollbarSet.call(this);
  sheetFreeze.call(this);
  table.render();
  toolbar.reset();
  selector.reset();
}

function clearClipboard(this: Sheet): void {
  const { data, selector } = this;
  data.clearClipboard();
  selector.hideClipboard();
}

function copy(this: Sheet, evt?: Event): void {
  const { data, selector } = this;
  if (data.settings.mode === 'read') return;
  data.copy();
  if (evt) data.copyToSystemClipboard(evt);
  selector.showClipboard();
}

function cut(this: Sheet): void {
  const { data, selector } = this;
  if (data.settings.mode === 'read') return;
  data.cut();
  selector.showClipboard();
}

function paste(this: Sheet, what: string, evt?: ClipboardEvent): void {
  const { data } = this;
  if (data.settings.mode === 'read') return;
  if (data.clipboard.isClear()) {
    const resetSheet = () => sheetReset.call(this);
    const eventTrigger = (rows: unknown) => {
      this.trigger('pasted-clipboard', rows);
    };
    data.pasteFromSystemClipboard(resetSheet, eventTrigger);
  } else if (data.paste(what, (msg) => xtoast('Tip', msg))) {
    sheetReset.call(this);
  } else if (evt?.clipboardData) {
    const cdata = evt.clipboardData.getData('text/plain');
    this.data.pasteFromText(cdata);
    sheetReset.call(this);
  }
}

function hideRowsOrCols(this: Sheet): void {
  this.data.hideRowsOrCols();
  sheetReset.call(this);
}

function unhideRowsOrCols(this: Sheet, type: string, index: number): void {
  this.data.unhideRowsOrCols(type, index);
  sheetReset.call(this);
}

function autofilter(this: Sheet): void {
  const { data } = this;
  data.autofilter();
  sheetReset.call(this);
}

function toolbarChangePaintformatPaste(this: Sheet): void {
  const { toolbar } = this;
  if (toolbar.paintformatActive()) {
    paste.call(this, 'format');
    clearClipboard.call(this);
    toolbar.paintformatToggle();
  }
}

function overlayerMousedown(this: Sheet, evt: MouseEvent): void {
  const { selector, data, table, sortFilter } = this;
  const { offsetX, offsetY } = evt;
  const isAutofillEl = (evt.target as HTMLElement).className === `${cssPrefix}-selector-corner`;
  const cellRect = data.getCellRectByXY(offsetX, offsetY);
  const { left, top, width, height } = cellRect;
  let { ri, ci } = cellRect;
  const { autoFilter } = data;
  if (autoFilter.includes(ri, ci)) {
    if (left + width - 20 < offsetX && top + height - 20 < offsetY) {
      const items = autoFilter.items(ci, (r, c) => data.rows.getCell(r, c));
      sortFilter.hide();
      sortFilter.set(
        ci,
        items,
        autoFilter.getFilter(ci) as { value: string[] } | null,
        autoFilter.getSort(ci) as { order: string; asc: () => boolean; desc: () => boolean } | null
      );
      sortFilter.setOffset({ left, top: top + height + 2 });
      return;
    }
  }

  if (!evt.shiftKey) {
    if (isAutofillEl) {
      selector.showAutofill(ri, ci);
    } else {
      selectorSet.call(this, false, ri, ci);
    }

    mouseMoveUp(
      window,
      (e: MouseEvent) => {
        ({ ri, ci } = data.getCellRectByXY(e.offsetX, e.offsetY));
        if (isAutofillEl) {
          selector.showAutofill(ri, ci);
        } else if (e.buttons === 1 && !e.shiftKey) {
          selectorSet.call(this, true, ri, ci, true, true);
        }
      },
      () => {
        if (isAutofillEl && selector.arange && data.settings.mode !== 'read') {
          if (data.autofill(selector.arange, 'all', (msg) => xtoast('Tip', msg))) {
            table.render();
          }
        }
        selector.hideAutofill();
        toolbarChangePaintformatPaste.call(this);
      }
    );
  }

  if (!isAutofillEl && evt.buttons === 1) {
    if (evt.shiftKey) {
      selectorSet.call(this, true, ri, ci);
    }
  }
}

function editorSetOffset(this: Sheet): void {
  const { editor, data } = this;
  const sOffset = data.getSelectedRect();
  const tOffset = this.getTableOffset();
  let sPosition = 'top';
  if (sOffset.top > tOffset.height / 2) {
    sPosition = 'bottom';
  }
  editor.setOffset(sOffset, sPosition);
}

function editorSet(this: Sheet): void {
  const { editor, data } = this;
  if (data.settings.mode === 'read') return;
  editorSetOffset.call(this);
  editor.setCell(
    data.getSelectedCell() as { text?: string; editable?: boolean } | null,
    data.getSelectedValidator() as { type: string; values?: () => { key: string }[] } | undefined
  );
  clearClipboard.call(this);
}

function verticalScrollbarMove(this: Sheet, distance: number): void {
  const { data, table, selector } = this;
  data.scrolly(distance, () => {
    selector.resetBRLAreaOffset();
    editorSetOffset.call(this);
    table.render();
  });
}

function horizontalScrollbarMove(this: Sheet, distance: number): void {
  const { data, table, selector } = this;
  data.scrollx(distance, () => {
    selector.resetBRTAreaOffset();
    editorSetOffset.call(this);
    table.render();
  });
}

function rowResizerFinished(this: Sheet, cRect: { ri: number }, distance: number): void {
  const { ri } = cRect;
  const { table, selector, data } = this;
  if (!selector.range) return;
  const { sri, eri } = selector.range;
  if (ri >= sri && ri <= eri) {
    for (let row = sri; row <= eri; row += 1) {
      data.rows.setHeight(row, distance);
    }
  } else {
    data.rows.setHeight(ri, distance);
  }

  table.render();
  selector.resetAreaOffset();
  verticalScrollbarSet.call(this);
  editorSetOffset.call(this);
}

function colResizerFinished(this: Sheet, cRect: { ci: number }, distance: number): void {
  const { ci } = cRect;
  const { table, selector, data } = this;
  if (!selector.range) return;
  const { sci, eci } = selector.range;
  if (ci >= sci && ci <= eci) {
    for (let col = sci; col <= eci; col += 1) {
      data.cols.setWidth(col, distance);
    }
  } else {
    data.cols.setWidth(ci, distance);
  }

  table.render();
  selector.resetAreaOffset();
  horizontalScrollbarSet.call(this);
  editorSetOffset.call(this);
}

function dataSetCellText(this: Sheet, text: string, state = 'finished'): void {
  const { data, table } = this;
  if (data.settings.mode === 'read') return;
  data.setSelectedCellText(text, state);
  const { ri, ci } = data.selector;
  if (state === 'finished') {
    table.render();
  } else {
    this.trigger('cell-edited', text, ri, ci);
  }
}

function insertDeleteRowColumn(this: Sheet, type: string): void {
  const { data } = this;
  if (data.settings.mode === 'read') return;
  if (type === 'insert-row') {
    data.insert('row');
  } else if (type === 'delete-row') {
    data.delete('row');
  } else if (type === 'insert-column') {
    data.insert('column');
  } else if (type === 'delete-column') {
    data.delete('column');
  } else if (type === 'delete-cell') {
    data.deleteCell();
  } else if (type === 'delete-cell-format') {
    data.deleteCell('format');
  } else if (type === 'delete-cell-text') {
    data.deleteCell('text');
  } else if (type === 'cell-printable') {
    data.setSelectedCellAttr('printable', true);
  } else if (type === 'cell-non-printable') {
    data.setSelectedCellAttr('printable', false);
  } else if (type === 'cell-editable') {
    data.setSelectedCellAttr('editable', true);
  } else if (type === 'cell-non-editable') {
    data.setSelectedCellAttr('editable', false);
  }
  clearClipboard.call(this);
  sheetReset.call(this);
}

function toolbarChange(this: Sheet, type: string, value: unknown): void {
  const { data } = this;
  if (type === 'undo') {
    this.undo();
  } else if (type === 'redo') {
    this.redo();
  } else if (type === 'print') {
    this.print.preview();
  } else if (type === 'paintformat') {
    if (value === true) copy.call(this);
    else clearClipboard.call(this);
  } else if (type === 'clearformat') {
    insertDeleteRowColumn.call(this, 'delete-cell-format');
  } else if (type === 'link') {
    // link
  } else if (type === 'chart') {
    // chart
  } else if (type === 'autofilter') {
    autofilter.call(this);
  } else if (type === 'freeze') {
    if (value) {
      const { ri, ci } = data.selector;
      this.freeze(ri, ci);
    } else {
      this.freeze(0, 0);
    }
  } else {
    data.setSelectedCellAttr(type, value);
    if (type === 'formula' && !data.selector.multiple()) {
      editorSet.call(this);
    }
    sheetReset.call(this);
  }
}

function sortFilterChange(
  this: Sheet,
  ci: number,
  order: string | null,
  operator: string,
  value: string[]
): void {
  this.data.setAutoFilter(ci, order, operator, value);
  sheetReset.call(this);
}

function sheetInitEvents(this: Sheet): void {
  const {
    selector,
    overlayerEl,
    rowResizer,
    colResizer,
    verticalScrollbar,
    horizontalScrollbar,
    editor,
    contextMenu,
    toolbar,
    modalValidation,
    sortFilter,
  } = this;
  overlayerEl
    .on('mousemove', (evt) => {
      overlayerMousemove.call(this, evt as MouseEvent);
    })
    .on('mousedown', (evt) => {
      editor.clear();
      contextMenu.hide();
      if ((evt as MouseEvent).buttons === 2) {
        if (this.data.xyInSelectedRect((evt as MouseEvent).offsetX, (evt as MouseEvent).offsetY)) {
          contextMenu.setPosition((evt as MouseEvent).offsetX, (evt as MouseEvent).offsetY);
        } else {
          overlayerMousedown.call(this, evt as MouseEvent);
          contextMenu.setPosition((evt as MouseEvent).offsetX, (evt as MouseEvent).offsetY);
        }
        evt.stopPropagation();
      } else if ((evt as MouseEvent).detail === 2) {
        editorSet.call(this);
      } else {
        overlayerMousedown.call(this, evt as MouseEvent);
      }
    })
    .on('mousewheel.stop', (evt) => {
      overlayerMousescroll.call(this, evt as WheelEvent);
    })
    .on('mouseout', (evt) => {
      const { offsetX, offsetY } = evt as MouseEvent;
      if (offsetY <= 0) colResizer.hide();
      if (offsetX <= 0) rowResizer.hide();
    });

  selector.inputChange = (v: string) => {
    dataSetCellText.call(this, v, 'input');
    editorSet.call(this);
  };

  bindTouch(overlayerEl.el, {
    move: (direction, d) => {
      overlayerTouch.call(this, direction, d);
    },
  });

  toolbar.change = (type: string, value: unknown) => toolbarChange.call(this, type, value);
  sortFilter.ok = (ci: number, order: string | null, o: string, v: string[]) =>
    sortFilterChange.call(this, ci, order, o, v);

  rowResizer.finishedFn = (cRect, distance) => {
    rowResizerFinished.call(this, cRect as { ri: number }, distance);
  };
  colResizer.finishedFn = (cRect, distance) => {
    colResizerFinished.call(this, cRect as { ci: number }, distance);
  };
  rowResizer.unhideFn = (index: number) => {
    unhideRowsOrCols.call(this, 'row', index);
  };
  colResizer.unhideFn = (index: number) => {
    unhideRowsOrCols.call(this, 'col', index);
  };
  verticalScrollbar.moveFn = (distance) => {
    verticalScrollbarMove.call(this, distance);
  };
  horizontalScrollbar.moveFn = (distance) => {
    horizontalScrollbarMove.call(this, distance);
  };
  editor.change = (state: string, itext?: string) => {
    dataSetCellText.call(this, itext || '', state);
  };
  modalValidation.change = (action: string, ...args: unknown[]) => {
    if (action === 'save') {
      this.data.addValidation(...args);
    } else {
      this.data.removeValidation();
    }
  };
  contextMenu.itemClick = (type: string) => {
    if (type === 'validation') {
      modalValidation.setValue(
        this.data.getSelectedValidation() as Parameters<typeof modalValidation.setValue>[0]
      );
    } else if (type === 'copy') {
      copy.call(this);
    } else if (type === 'cut') {
      cut.call(this);
    } else if (type === 'paste') {
      paste.call(this, 'all');
    } else if (type === 'paste-value') {
      paste.call(this, 'text');
    } else if (type === 'paste-format') {
      paste.call(this, 'format');
    } else if (type === 'hide') {
      hideRowsOrCols.call(this);
    } else {
      insertDeleteRowColumn.call(this, type);
    }
  };

  bind(window, 'resize', () => {
    this.reload();
  });

  bind(window, 'click', (evt) => {
    this.focusing = overlayerEl.contains((evt as MouseEvent).target as Node);
  });

  bind(window, 'paste', (evt) => {
    if (!this.focusing) return;
    paste.call(this, 'all', evt as ClipboardEvent);
    evt.preventDefault();
  });

  bind(window, 'copy', (evt) => {
    if (!this.focusing) return;
    copy.call(this, evt);
    evt.preventDefault();
  });

  bind(window, 'keydown', (evt) => {
    if (!this.focusing) return;
    const { key, ctrlKey, shiftKey, metaKey } = evt as KeyboardEvent;
    if (ctrlKey || metaKey) {
      switch (key) {
        case 'z':
          this.undo();
          evt.preventDefault();
          break;
        case 'y':
          this.redo();
          evt.preventDefault();
          break;
        case 'c':
          break;
        case 'x':
          cut.call(this);
          evt.preventDefault();
          break;
        case 'u':
          toolbar.trigger('underline');
          evt.preventDefault();
          break;
        case 'v':
          break;
        case 'ArrowLeft':
          selectorMove.call(this, shiftKey, 'row-first');
          evt.preventDefault();
          break;
        case 'ArrowUp':
          selectorMove.call(this, shiftKey, 'col-first');
          evt.preventDefault();
          break;
        case 'ArrowRight':
          selectorMove.call(this, shiftKey, 'row-last');
          evt.preventDefault();
          break;
        case 'ArrowDown':
          selectorMove.call(this, shiftKey, 'col-last');
          evt.preventDefault();
          break;
        case ' ':
          selectorSet.call(this, false, -1, this.data.selector.ci, false);
          evt.preventDefault();
          break;
        case 'b':
          toolbar.trigger('bold');
          break;
        case 'i':
          toolbar.trigger('italic');
          break;
        default:
          break;
      }
    } else {
      switch (key) {
        case ' ':
          if (shiftKey) {
            selectorSet.call(this, false, this.data.selector.ri, -1, false);
          }
          break;
        case 'Escape':
          contextMenu.hide();
          clearClipboard.call(this);
          break;
        case 'ArrowLeft':
          selectorMove.call(this, shiftKey, 'left');
          evt.preventDefault();
          break;
        case 'ArrowUp':
          selectorMove.call(this, shiftKey, 'up');
          evt.preventDefault();
          break;
        case 'ArrowRight':
          selectorMove.call(this, shiftKey, 'right');
          evt.preventDefault();
          break;
        case 'ArrowDown':
          selectorMove.call(this, shiftKey, 'down');
          evt.preventDefault();
          break;
        case 'Tab':
          editor.clear();
          selectorMove.call(this, false, shiftKey ? 'left' : 'right');
          evt.preventDefault();
          break;
        case 'Enter':
          editor.clear();
          selectorMove.call(this, false, shiftKey ? 'up' : 'down');
          evt.preventDefault();
          break;
        case 'Backspace':
          insertDeleteRowColumn.call(this, 'delete-cell-text');
          evt.preventDefault();
          break;
        default:
          break;
      }

      if (key === 'Delete') {
        insertDeleteRowColumn.call(this, 'delete-cell-text');
        evt.preventDefault();
      } else if (
        (key.length === 1 && key >= 'a' && key <= 'z') ||
        (key.length === 1 && key >= 'A' && key <= 'Z') ||
        (key.length === 1 && key >= '0' && key <= '9') ||
        key === '='
      ) {
        dataSetCellText.call(this, key, 'input');
        editorSet.call(this);
      } else if (key === 'F2') {
        editorSet.call(this);
      }
    }
  });
}

export default class Sheet {
  eventMap: EventEmitter;
  el: Element;
  toolbar: Toolbar;
  print: Print;
  data: DataProxy;
  tableEl: Element;
  rowResizer: Resizer;
  colResizer: Resizer;
  verticalScrollbar: Scrollbar;
  horizontalScrollbar: Scrollbar;
  editor: Editor;
  modalValidation: ModalValidation;
  contextMenu: ContextMenu;
  selector: Selector;
  overlayerCEl: Element;
  overlayerEl: Element;
  sortFilter: SortFilter;
  table: Table;
  focusing: boolean;

  constructor(targetEl: Element, data: DataProxy) {
    this.eventMap = createEventEmitter();
    const { view, showToolbar, showContextmenu } = data.settings;
    this.el = h('div', `${cssPrefix}-sheet`);
    this.toolbar = new Toolbar(
      data as unknown as ConstructorParameters<typeof Toolbar>[0],
      () => view.width,
      !showToolbar
    );
    this.print = new Print(data as unknown as ConstructorParameters<typeof Print>[0]);
    targetEl.children(this.toolbar.el, this.el, this.print.el);
    this.data = data;
    this.tableEl = h('canvas', `${cssPrefix}-table`);
    this.rowResizer = new Resizer(false, data.rows.height);
    this.colResizer = new Resizer(true, data.cols.minWidth);
    this.verticalScrollbar = new Scrollbar(true);
    this.horizontalScrollbar = new Scrollbar(false);
    this.editor = new Editor(
      formulas as unknown as ConstructorParameters<typeof Editor>[0],
      () => this.getTableOffset(),
      data.rows.height
    );
    this.modalValidation = new ModalValidation();
    this.contextMenu = new ContextMenu(() => this.getRect(), !showContextmenu);
    this.selector = new Selector(data as unknown as ConstructorParameters<typeof Selector>[0]);
    this.overlayerCEl = h('div', `${cssPrefix}-overlayer-content`).children(
      this.editor.el,
      this.selector.el
    );
    this.overlayerEl = h('div', `${cssPrefix}-overlayer`).child(this.overlayerCEl);
    this.sortFilter = new SortFilter();
    this.el.children(
      this.tableEl,
      this.overlayerEl.el,
      this.rowResizer.el,
      this.colResizer.el,
      this.verticalScrollbar.el,
      this.horizontalScrollbar.el,
      this.contextMenu.el,
      this.modalValidation.el,
      this.sortFilter.el
    );
    this.table = new Table(
      this.tableEl.el as HTMLCanvasElement,
      data as unknown as ConstructorParameters<typeof Table>[1]
    );
    this.focusing = false;
    sheetInitEvents.call(this);
    sheetReset.call(this);
    selectorSet.call(this, false, 0, 0);
  }

  on(eventName: string, func: (...args: unknown[]) => void): this {
    this.eventMap.on(eventName, func);
    return this;
  }

  trigger(eventName: string, ...args: unknown[]): void {
    const { eventMap } = this;
    eventMap.fire(eventName, args);
  }

  resetData(data: DataProxy): void {
    this.editor.clear();
    this.data = data;
    verticalScrollbarSet.call(this);
    horizontalScrollbarSet.call(this);
    this.toolbar.resetData(data as unknown as Parameters<typeof this.toolbar.resetData>[0]);
    this.print.resetData(data as unknown as Parameters<typeof this.print.resetData>[0]);
    this.selector.resetData(data as unknown as Parameters<typeof this.selector.resetData>[0]);
    this.table.resetData(data as unknown as Parameters<typeof this.table.resetData>[0]);
  }

  loadData(data: unknown): this {
    this.data.setData(data);
    sheetReset.call(this);
    return this;
  }

  freeze(ri: number, ci: number): this {
    const { data } = this;
    data.setFreeze(ri, ci);
    sheetReset.call(this);
    return this;
  }

  undo(): void {
    this.data.undo();
    sheetReset.call(this);
  }

  redo(): void {
    this.data.redo();
    sheetReset.call(this);
  }

  reload(): this {
    sheetReset.call(this);
    return this;
  }

  getRect(): { width: number; height: number } {
    const { data } = this;
    return { width: data.viewWidth(), height: data.viewHeight() };
  }

  getTableOffset(): { width: number; height: number; left: number; top: number } {
    const { rows, cols } = this.data;
    const { width, height } = this.getRect();
    return {
      width: width - cols.indexWidth,
      height: height - rows.height,
      left: cols.indexWidth,
      top: rows.height,
    };
  }
}
