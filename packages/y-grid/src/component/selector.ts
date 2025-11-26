import { cssPrefix } from '../config';
import { CellRange } from '../core/cell-range';
import type { Element } from './element';
import { h } from './element';

interface SelectorOffset {
  left: number;
  top: number;
  width: number;
  height: number;
  scroll?: { x: number; y: number };
  l?: number;
  t?: number;
}

interface DataProxy {
  settings: { autoFocus: boolean };
  selector: {
    range: CellRange;
    setIndexes: (ri: number, ci: number) => void;
  };
  freezeTotalWidth: () => number;
  freezeTotalHeight: () => number;
  getSelectedRect: () => SelectorOffset;
  getClipboardRect: () => SelectorOffset;
  getRect: (range: CellRange) => SelectorOffset;
  calSelectedRangeByStart: (ri: number, ci: number) => CellRange;
  calSelectedRangeByEnd: (ri: number, ci: number) => CellRange;
}

const selectorHeightBorderWidth = 2 * 2 - 1;
let startZIndex = 10;

class SelectorElement {
  useHideInput: boolean;
  autoFocus: boolean;
  inputChange: (value: string) => void;
  cornerEl: Element;
  areaEl: Element;
  clipboardEl: Element;
  autofillEl: Element;
  el: Element;
  hideInput?: Element;
  hideInputDiv?: Element;

  constructor(useHideInput = false, autoFocus = true) {
    this.useHideInput = useHideInput;
    this.autoFocus = autoFocus;
    this.inputChange = () => {};
    this.cornerEl = h('div', `${cssPrefix}-selector-corner`);
    this.areaEl = h('div', `${cssPrefix}-selector-area`).child(this.cornerEl).hide();
    this.clipboardEl = h('div', `${cssPrefix}-selector-clipboard`).hide();
    this.autofillEl = h('div', `${cssPrefix}-selector-autofill`).hide();
    this.el = h('div', `${cssPrefix}-selector`).css('z-index', `${startZIndex}`);
    this.el.children(this.areaEl, this.clipboardEl, this.autofillEl);
    this.el.hide();
    if (useHideInput) {
      this.hideInput = h('input', '').on('compositionend', (evt) => {
        this.inputChange((evt.target as HTMLInputElement).value);
      });
      this.hideInputDiv = h('div', 'hide-input').child(this.hideInput);
      this.el.child(this.hideInputDiv);
    }
    startZIndex += 1;
  }

  setOffset(v: Partial<SelectorOffset>): this {
    this.el.offset(v);
    this.el.show();
    return this;
  }

  hide(): this {
    this.el.hide();
    return this;
  }

  setAreaOffset(v: SelectorOffset): void {
    const { left, top, width, height } = v;
    const of = {
      width: width - selectorHeightBorderWidth + 0.8,
      height: height - selectorHeightBorderWidth + 0.8,
      left: left - 0.8,
      top: top - 0.8,
    };
    this.areaEl.offset(of);
    this.areaEl.show();
    if (this.useHideInput && this.hideInputDiv && this.hideInput) {
      this.hideInputDiv.offset(of);
      if (this.autoFocus) {
        this.hideInput.val('');
        this.hideInput.focus();
      } else {
        this.hideInput.val('');
      }
    }
  }

  setClipboardOffset(v: SelectorOffset): void {
    const { left, top, width, height } = v;
    this.clipboardEl.offset({
      left,
      top,
      width: width - 5,
      height: height - 5,
    });
  }

  showAutofill(v: SelectorOffset): void {
    const { left, top, width, height } = v;
    this.autofillEl.offset({
      width: width - selectorHeightBorderWidth,
      height: height - selectorHeightBorderWidth,
      left,
      top,
    });
    this.autofillEl.show();
  }

  hideAutofill(): void {
    this.autofillEl.hide();
  }

  showClipboard(): void {
    this.clipboardEl.show();
  }

  hideClipboard(): void {
    this.clipboardEl.hide();
  }
}

function calBRAreaOffset(this: Selector, offset: SelectorOffset): SelectorOffset {
  const { data } = this;
  const { left, top, width, height, scroll, l, t } = offset;
  const ftwidth = data.freezeTotalWidth();
  const ftheight = data.freezeTotalHeight();
  let left0 = left - ftwidth;
  if (ftwidth > (l || 0)) left0 -= scroll?.x || 0;
  let top0 = top - ftheight;
  if (ftheight > (t || 0)) top0 -= scroll?.y || 0;
  return {
    left: left0,
    top: top0,
    width,
    height,
  };
}

function calTAreaOffset(this: Selector, offset: SelectorOffset): SelectorOffset {
  const { data } = this;
  const { left, width, height, l, t, scroll } = offset;
  const ftwidth = data.freezeTotalWidth();
  let left0 = left - ftwidth;
  if (ftwidth > (l || 0)) left0 -= scroll?.x || 0;
  return {
    left: left0,
    top: t || 0,
    width,
    height,
  };
}

function calLAreaOffset(this: Selector, offset: SelectorOffset): SelectorOffset {
  const { data } = this;
  const { top, width, height, l, t, scroll } = offset;
  const ftheight = data.freezeTotalHeight();
  let top0 = top - ftheight;
  if (ftheight > (t || 0)) top0 -= scroll?.y || 0;
  return {
    left: l || 0,
    top: top0,
    width,
    height,
  };
}

function setBRAreaOffset(this: Selector, offset: SelectorOffset): void {
  const { br } = this;
  br.setAreaOffset(calBRAreaOffset.call(this, offset));
}

function setTLAreaOffset(this: Selector, offset: SelectorOffset): void {
  const { tl } = this;
  tl.setAreaOffset(offset);
}

function setTAreaOffset(this: Selector, offset: SelectorOffset): void {
  const { t } = this;
  t.setAreaOffset(calTAreaOffset.call(this, offset));
}

function setLAreaOffset(this: Selector, offset: SelectorOffset): void {
  const { l } = this;
  l.setAreaOffset(calLAreaOffset.call(this, offset));
}

function setLClipboardOffset(this: Selector, offset: SelectorOffset): void {
  const { l } = this;
  l.setClipboardOffset(calLAreaOffset.call(this, offset));
}

function setBRClipboardOffset(this: Selector, offset: SelectorOffset): void {
  const { br } = this;
  br.setClipboardOffset(calBRAreaOffset.call(this, offset));
}

function setTLClipboardOffset(this: Selector, offset: SelectorOffset): void {
  const { tl } = this;
  tl.setClipboardOffset(offset);
}

function setTClipboardOffset(this: Selector, offset: SelectorOffset): void {
  const { t } = this;
  t.setClipboardOffset(calTAreaOffset.call(this, offset));
}

function setAllAreaOffset(this: Selector, offset: SelectorOffset): void {
  setBRAreaOffset.call(this, offset);
  setTLAreaOffset.call(this, offset);
  setTAreaOffset.call(this, offset);
  setLAreaOffset.call(this, offset);
}

function setAllClipboardOffset(this: Selector, offset: SelectorOffset): void {
  setBRClipboardOffset.call(this, offset);
  setTLClipboardOffset.call(this, offset);
  setTClipboardOffset.call(this, offset);
  setLClipboardOffset.call(this, offset);
}

export default class Selector {
  inputChange: (value: string) => void;
  data: DataProxy;
  br: SelectorElement;
  t: SelectorElement;
  l: SelectorElement;
  tl: SelectorElement;
  offset: SelectorOffset | null;
  areaOffset: SelectorOffset | null;
  indexes: [number, number] | null;
  moveIndexes?: [number, number];
  range: CellRange | null;
  arange: CellRange | null;
  el: Element;
  lastri: number;
  lastci: number;

  constructor(data: DataProxy) {
    const { autoFocus } = data.settings;
    this.inputChange = () => {};
    this.data = data;
    this.br = new SelectorElement(true, autoFocus);
    this.t = new SelectorElement();
    this.l = new SelectorElement();
    this.tl = new SelectorElement();
    this.br.inputChange = (v: string) => {
      this.inputChange(v);
    };
    this.br.el.show();
    this.offset = null;
    this.areaOffset = null;
    this.indexes = null;
    this.range = null;
    this.arange = null;
    this.el = h('div', `${cssPrefix}-selectors`);
    this.el.children(this.tl.el, this.t.el, this.l.el, this.br.el);
    this.el.hide();

    // for performance
    this.lastri = -1;
    this.lastci = -1;

    startZIndex += 1;
  }

  resetData(data: DataProxy): void {
    this.data = data;
    this.range = data.selector.range;
    this.resetAreaOffset();
  }

  hide(): void {
    this.el.hide();
  }

  resetOffset(): void {
    const { data, tl, t, l, br } = this;
    const freezeHeight = data.freezeTotalHeight();
    const freezeWidth = data.freezeTotalWidth();
    if (freezeHeight > 0 || freezeWidth > 0) {
      tl.setOffset({ width: freezeWidth, height: freezeHeight });
      t.setOffset({ left: freezeWidth, height: freezeHeight });
      l.setOffset({ top: freezeHeight, width: freezeWidth });
      br.setOffset({ left: freezeWidth, top: freezeHeight });
    } else {
      tl.hide();
      t.hide();
      l.hide();
      br.setOffset({ left: 0, top: 0 });
    }
  }

  resetAreaOffset(): void {
    const offset = this.data.getSelectedRect();
    const coffset = this.data.getClipboardRect();
    setAllAreaOffset.call(this, offset);
    setAllClipboardOffset.call(this, coffset);
    this.resetOffset();
  }

  resetBRTAreaOffset(): void {
    const offset = this.data.getSelectedRect();
    const coffset = this.data.getClipboardRect();
    setBRAreaOffset.call(this, offset);
    setTAreaOffset.call(this, offset);
    setBRClipboardOffset.call(this, coffset);
    setTClipboardOffset.call(this, coffset);
    this.resetOffset();
  }

  resetBRLAreaOffset(): void {
    const offset = this.data.getSelectedRect();
    const coffset = this.data.getClipboardRect();
    setBRAreaOffset.call(this, offset);
    setLAreaOffset.call(this, offset);
    setBRClipboardOffset.call(this, coffset);
    setLClipboardOffset.call(this, coffset);
    this.resetOffset();
  }

  set(ri: number, ci: number, indexesUpdated = true): void {
    const { data } = this;
    const cellRange = data.calSelectedRangeByStart(ri, ci);
    const { sri, sci } = cellRange;
    if (indexesUpdated) {
      let [cri, cci] = [ri, ci];
      if (ri < 0) cri = 0;
      if (ci < 0) cci = 0;
      data.selector.setIndexes(cri, cci);
      this.indexes = [cri, cci];
    }

    this.moveIndexes = [sri, sci];
    this.range = cellRange;
    this.resetAreaOffset();
    this.el.show();
  }

  setEnd(ri: number, ci: number, moving = true): void {
    const { data, lastri, lastci } = this;
    if (moving) {
      if (ri === lastri && ci === lastci) return;
      this.lastri = ri;
      this.lastci = ci;
    }
    this.range = data.calSelectedRangeByEnd(ri, ci);
    setAllAreaOffset.call(this, this.data.getSelectedRect());
  }

  reset(): void {
    const { eri, eci } = this.data.selector.range;
    this.setEnd(eri, eci);
  }

  showAutofill(ri: number, ci: number): void {
    if (ri === -1 && ci === -1) return;
    if (!this.range) return;
    const { sri, sci, eri, eci } = this.range;
    const [nri, nci] = [ri, ci];
    const srn = sri - ri;
    const scn = sci - ci;
    const ern = eri - ri;
    const ecn = eci - ci;
    if (scn > 0) {
      // left
      this.arange = new CellRange(sri, nci, eri, sci - 1);
    } else if (srn > 0) {
      // top
      this.arange = new CellRange(nri, sci, sri - 1, eci);
    } else if (ecn < 0) {
      // right
      this.arange = new CellRange(sri, eci + 1, eri, nci);
    } else if (ern < 0) {
      // bottom
      this.arange = new CellRange(eri + 1, sci, nri, eci);
    } else {
      this.arange = null;
      return;
    }
    if (this.arange !== null) {
      const offset = this.data.getRect(this.arange);
      offset.width += 2;
      offset.height += 2;
      const { br, l, t, tl } = this;
      br.showAutofill(calBRAreaOffset.call(this, offset));
      l.showAutofill(calLAreaOffset.call(this, offset));
      t.showAutofill(calTAreaOffset.call(this, offset));
      tl.showAutofill(offset);
    }
  }

  hideAutofill(): void {
    for (const property of ['br', 'l', 't', 'tl'] as const) {
      this[property].hideAutofill();
    }
  }

  showClipboard(): void {
    const coffset = this.data.getClipboardRect();
    setAllClipboardOffset.call(this, coffset);
    for (const property of ['br', 'l', 't', 'tl'] as const) {
      this[property].showClipboard();
    }
  }

  hideClipboard(): void {
    for (const property of ['br', 'l', 't', 'tl'] as const) {
      this[property].hideClipboard();
    }
  }
}
