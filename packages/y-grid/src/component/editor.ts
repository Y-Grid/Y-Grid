import { cssPrefix } from '../config';
import Datepicker from './datepicker';
import { type Element, type Offset, h } from './element';
import Suggest, { type SuggestItem } from './suggest';

interface CellData {
  text?: string;
  editable?: boolean;
}

interface Validator {
  type: string;
  values?: () => SuggestItem[];
}

interface ViewDimensions {
  width: number;
  height: number;
}

interface EditorOffset extends Offset {
  l?: number;
  t?: number;
}

interface Freeze {
  w: number;
  h: number;
}

type ChangeCallback = (action: string, value?: string) => void;

function resetTextareaSize(this: Editor): void {
  const { inputText } = this;
  if (!/^\s*$/.test(inputText)) {
    const { textlineEl, textEl, areaOffset } = this;
    const txts = inputText.split('\n');
    const maxTxtSize = Math.max(...txts.map((it) => it.length));
    const tlOffset = textlineEl.offset() as Offset;
    const fontWidth = (tlOffset.width || 0) / inputText.length;
    const tlineWidth = (maxTxtSize + 1) * fontWidth + 5;
    const maxWidth = this.viewFn().width - (areaOffset?.left || 0) - fontWidth;
    let h1 = txts.length;
    if (tlineWidth > (areaOffset?.width || 0)) {
      let twidth = tlineWidth;
      if (tlineWidth > maxWidth) {
        twidth = maxWidth;
        h1 += Number.parseInt(String(tlineWidth / maxWidth), 10);
        h1 += tlineWidth % maxWidth > 0 ? 1 : 0;
      }
      textEl.css('width', `${twidth}px`);
    }
    h1 *= this.rowHeight;
    if (h1 > (areaOffset?.height || 0)) {
      textEl.css('height', `${h1}px`);
    }
  }
}

function insertText(this: Editor, evt: Event, itxt: string): void {
  const target = evt.target as HTMLTextAreaElement;
  const { value, selectionEnd } = target;
  const ntxt = `${value.slice(0, selectionEnd)}${itxt}${value.slice(selectionEnd)}`;
  target.value = ntxt;
  target.setSelectionRange(selectionEnd + 1, selectionEnd + 1);

  this.inputText = ntxt;
  this.textlineEl.html(ntxt);
  resetTextareaSize.call(this);
}

function keydownEventHandler(this: Editor, evt: KeyboardEvent): void {
  const { keyCode, altKey } = evt;
  if (keyCode !== 13 && keyCode !== 9) evt.stopPropagation();
  if (keyCode === 13 && altKey) {
    insertText.call(this, evt, '\n');
    evt.stopPropagation();
  }
  if (keyCode === 13 && !altKey) evt.preventDefault();
}

function inputEventHandler(this: Editor, evt: Event): void {
  const target = evt.target as HTMLTextAreaElement;
  const v = target.value;
  const { suggest, textlineEl, validator } = this;
  const { cell } = this;
  if (cell !== null) {
    if (('editable' in cell && cell.editable === true) || cell.editable === undefined) {
      this.inputText = v;
      if (validator) {
        if (validator.type === 'list') {
          suggest.search(v);
        } else {
          suggest.hide();
        }
      } else {
        const start = v.lastIndexOf('=');
        if (start !== -1) {
          suggest.search(v.substring(start + 1));
        } else {
          suggest.hide();
        }
      }
      textlineEl.html(v);
      resetTextareaSize.call(this);
      this.change('input', v);
    } else {
      target.value = cell.text || '';
    }
  } else {
    this.inputText = v;
    if (validator) {
      if (validator.type === 'list') {
        suggest.search(v);
      } else {
        suggest.hide();
      }
    } else {
      const start = v.lastIndexOf('=');
      if (start !== -1) {
        suggest.search(v.substring(start + 1));
      } else {
        suggest.hide();
      }
    }
    textlineEl.html(v);
    resetTextareaSize.call(this);
    this.change('input', v);
  }
}

function setTextareaRange(this: Editor, position: number): void {
  const el = this.textEl.el as HTMLTextAreaElement;
  setTimeout(() => {
    el.focus();
    el.setSelectionRange(position, position);
  }, 0);
}

function setText(this: Editor, text: string, position: number): void {
  const { textEl, textlineEl } = this;
  // firefox bug
  textEl.el.blur();

  textEl.val(text);
  textlineEl.html(text);
  setTextareaRange.call(this, position);
}

function suggestItemClick(this: Editor, it: SuggestItem | string): void {
  const { inputText, validator } = this;
  let position = 0;
  if (validator && validator.type === 'list') {
    this.inputText = typeof it === 'string' ? it : it.key;
    position = this.inputText.length;
  } else {
    const start = inputText.lastIndexOf('=');
    const sit = inputText.substring(0, start + 1);
    let eit = inputText.substring(start + 1);
    if (eit.indexOf(')') !== -1) {
      eit = eit.substring(eit.indexOf(')'));
    } else {
      eit = '';
    }
    const key = typeof it === 'string' ? it : it.key;
    this.inputText = `${sit + key}(`;
    position = this.inputText.length;
    this.inputText += `)${eit}`;
  }
  setText.call(this, this.inputText, position);
}

function resetSuggestItems(this: Editor): void {
  this.suggest.setItems(this.formulas);
}

function dateFormat(d: Date): string {
  let month: string | number = d.getMonth() + 1;
  let date: string | number = d.getDate();
  if (month < 10) month = `0${month}`;
  if (date < 10) date = `0${date}`;
  return `${d.getFullYear()}-${month}-${date}`;
}

export default class Editor {
  viewFn: () => ViewDimensions;
  rowHeight: number;
  formulas: SuggestItem[];
  suggest: Suggest;
  datepicker: Datepicker;
  areaEl: Element;
  textEl: Element;
  textlineEl: Element;
  el: Element;
  areaOffset: EditorOffset | null;
  freeze: Freeze;
  cell: CellData | null;
  inputText: string;
  change: ChangeCallback;
  validator?: Validator;

  constructor(formulas: SuggestItem[], viewFn: () => ViewDimensions, rowHeight: number) {
    this.viewFn = viewFn;
    this.rowHeight = rowHeight;
    this.formulas = formulas;
    this.suggest = new Suggest(formulas, (it) => {
      suggestItemClick.call(this, it);
    });
    this.datepicker = new Datepicker();
    this.datepicker.change((d: Date) => {
      this.setText(dateFormat(d));
      this.clear();
    });
    this.textEl = h('textarea', '')
      .on('input', (evt) => inputEventHandler.call(this, evt))
      .on('paste.stop', () => {})
      .on('keydown', (evt) => keydownEventHandler.call(this, evt as KeyboardEvent));
    this.textlineEl = h('div', 'textline');
    this.areaEl = h('div', `${cssPrefix}-editor-area`)
      .children(this.textEl, this.textlineEl, this.suggest.el, this.datepicker.el)
      .on('mousemove.stop', () => {})
      .on('mousedown.stop', () => {});
    this.el = h('div', `${cssPrefix}-editor`).child(this.areaEl).hide();
    this.suggest.bindInputEvents(this.textEl);

    this.areaOffset = null;
    this.freeze = { w: 0, h: 0 };
    this.cell = null;
    this.inputText = '';
    this.change = () => {};
  }

  setFreezeLengths(width: number, height: number): void {
    this.freeze.w = width;
    this.freeze.h = height;
  }

  clear(): void {
    if (this.inputText !== '') {
      this.change('finished', this.inputText);
    }
    this.cell = null;
    this.areaOffset = null;
    this.inputText = '';
    this.el.hide();
    this.textEl.val('');
    this.textlineEl.html('');
    resetSuggestItems.call(this);
    this.datepicker.hide();
  }

  setOffset(offset: EditorOffset | null, suggestPosition = 'top'): void {
    const { textEl, areaEl, suggest, freeze, el } = this;
    if (offset) {
      this.areaOffset = offset;
      const { left, top, width, height, l, t } = offset;
      const elOffset: { left: number; top: number } = { left: 0, top: 0 };
      // top left
      if (freeze.w > (l || 0) && freeze.h > (t || 0)) {
        //
      } else if (freeze.w < (l || 0) && freeze.h < (t || 0)) {
        elOffset.left = freeze.w;
        elOffset.top = freeze.h;
      } else if (freeze.w > (l || 0)) {
        elOffset.top = freeze.h;
      } else if (freeze.h > (t || 0)) {
        elOffset.left = freeze.w;
      }
      el.offset(elOffset);
      areaEl.offset({
        left: (left || 0) - elOffset.left - 0.8,
        top: (top || 0) - elOffset.top - 0.8,
      });
      textEl.offset({ width: (width || 0) - 9 + 0.8, height: (height || 0) - 3 + 0.8 });
      const sOffset: Record<string, number> = { left: 0 };
      sOffset[suggestPosition] = height || 0;
      suggest.setOffset(sOffset);
      suggest.hide();
    }
  }

  setCell(cell: CellData | null, validator?: Validator): void {
    if (cell && cell.editable === false) return;

    const { el, datepicker, suggest } = this;
    el.show();
    this.cell = cell;
    const text = cell?.text || '';
    this.setText(text);

    this.validator = validator;
    if (validator) {
      const { type } = validator;
      if (type === 'date') {
        datepicker.show();
        if (!/^\s*$/.test(text)) {
          datepicker.setValue(text);
        }
      }
      if (type === 'list') {
        suggest.setItems(validator.values!());
        suggest.search('');
      }
    }
  }

  setText(text: string): void {
    this.inputText = text;
    setText.call(this, text, text.length);
    resetTextareaSize.call(this);
  }
}
