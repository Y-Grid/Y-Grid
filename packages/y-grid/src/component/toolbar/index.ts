/* global window */

import Align from './align';
import Valign from './valign';
import Autofilter from './autofilter';
import Bold from './bold';
import Italic from './italic';
import Strike from './strike';
import Underline from './underline';
import Border from './border';
import Clearformat from './clearformat';
import Paintformat from './paintformat';
import TextColor from './text-color';
import FillColor from './fill-color';
import FontSize from './font-size';
import Font from './font';
import Format from './format';
import Formula from './formula';
import Freeze from './freeze';
import Merge from './merge';
import Redo from './redo';
import Undo from './undo';
import Print from './print';
import Textwrap from './textwrap';
import More, { DropdownMore } from './more';
import Item from './item';
import ToggleItem from './toggle-item';

import { h, Element } from '../element';
import { cssPrefix } from '../../config';
import { bind } from '../event';
import DataProxy from '../../core/data-proxy';

type ToolbarItem = Item | Element;
type ToolbarRow = ToolbarItem[] | Element;

interface ExtendToolbarOption {
  tip?: string;
  el?: HTMLElement;
  icon?: string;
  onClick?: (data: unknown, proxy: DataProxy) => void;
}

function buildDivider(): Element {
  return h('div', `${cssPrefix}-toolbar-divider`);
}

function initBtns2(this: Toolbar): void {
  this.btns2 = [];
  this.items.forEach((it) => {
    if (Array.isArray(it)) {
      it.forEach((item) => {
        if (item instanceof Item) {
          const rect = item.el.box();
          const { marginLeft, marginRight } = item.el.computedStyle();
          this.btns2.push([item.el, rect.width + parseInt(marginLeft, 10) + parseInt(marginRight, 10)]);
        }
      });
    } else if (it instanceof Element) {
      const rect = it.box();
      const { marginLeft, marginRight } = it.computedStyle();
      this.btns2.push([it, rect.width + parseInt(marginLeft, 10) + parseInt(marginRight, 10)]);
    }
  });
}

function moreResize(this: Toolbar): void {
  const {
    el, btns, moreEl, btns2,
  } = this;
  const dd = moreEl.dd as DropdownMore;
  const { moreBtns, contentEl } = dd;
  el.css('width', `${this.widthFn()}px`);
  const elBox = el.box();

  let sumWidth = 160;
  let sumWidth2 = 12;
  const list1: Element[] = [];
  const list2: Element[] = [];
  btns2.forEach(([it, w], index) => {
    sumWidth += w;
    if (index === btns2.length - 1 || sumWidth < elBox.width) {
      list1.push(it);
    } else {
      sumWidth2 += w;
      list2.push(it);
    }
  });
  btns.html('').children(...list1);
  moreBtns.html('').children(...list2);
  contentEl.css('width', `${sumWidth2}px`);
  if (list2.length > 0) {
    moreEl.show();
  } else {
    moreEl.hide();
  }
}

function genBtn(this: Toolbar, it: ExtendToolbarOption): Item {
  const btn = new Item();
  btn.el.on('click', () => {
    if (it.onClick) it.onClick(this.data.getData(), this.data);
  });
  btn.tip = it.tip || '';

  let el: HTMLElement | Element | undefined = it.el;

  if (it.icon) {
    el = h('img').attr('src', it.icon);
  }

  if (el) {
    const icon = h('div', `${cssPrefix}-icon`);
    icon.child(el);
    btn.el.child(icon);
  }

  return btn;
}

export default class Toolbar {
  data: DataProxy;
  change: (...args: unknown[]) => void;
  widthFn: () => number;
  isHide: boolean;
  items: ToolbarRow[];
  el: Element;
  btns: Element;
  btns2: [Element, number][];

  undoEl: Undo;
  redoEl: Redo;
  paintformatEl: Paintformat;
  clearformatEl: Clearformat;
  formatEl: Format;
  fontEl: Font;
  fontSizeEl: FontSize;
  boldEl: Bold;
  italicEl: Italic;
  underlineEl: Underline;
  strikeEl: Strike;
  textColorEl: TextColor;
  fillColorEl: FillColor;
  borderEl: Border;
  mergeEl: Merge;
  alignEl: Align;
  valignEl: Valign;
  textwrapEl: Textwrap;
  freezeEl: Freeze;
  autofilterEl: Autofilter;
  formulaEl: Formula;
  moreEl: More;

  constructor(data: DataProxy, widthFn: () => number, isHide = false) {
    this.data = data;
    this.change = () => {};
    this.widthFn = widthFn;
    this.isHide = isHide;
    this.btns2 = [];
    const style = data.defaultStyle();
    this.items = [
      [
        this.undoEl = new Undo(),
        this.redoEl = new Redo(),
        new Print(),
        this.paintformatEl = new Paintformat(),
        this.clearformatEl = new Clearformat(),
      ],
      buildDivider(),
      [
        this.formatEl = new Format(),
      ],
      buildDivider(),
      [
        this.fontEl = new Font(),
        this.fontSizeEl = new FontSize(),
      ],
      buildDivider(),
      [
        this.boldEl = new Bold(),
        this.italicEl = new Italic(),
        this.underlineEl = new Underline(),
        this.strikeEl = new Strike(),
        this.textColorEl = new TextColor(style.color),
      ],
      buildDivider(),
      [
        this.fillColorEl = new FillColor(style.bgcolor),
        this.borderEl = new Border(),
        this.mergeEl = new Merge(),
      ],
      buildDivider(),
      [
        this.alignEl = new Align(style.align),
        this.valignEl = new Valign(style.valign),
        this.textwrapEl = new Textwrap(),
      ],
      buildDivider(),
      [
        this.freezeEl = new Freeze(),
        this.autofilterEl = new Autofilter(),
        this.formulaEl = new Formula(),
      ],
    ];

    const { extendToolbar = {} } = data.settings;

    if (extendToolbar.left && extendToolbar.left.length > 0) {
      this.items.unshift(buildDivider());
      const btns = extendToolbar.left.map(genBtn.bind(this));

      this.items.unshift(btns);
    }
    if (extendToolbar.right && extendToolbar.right.length > 0) {
      this.items.push(buildDivider());
      const btns = extendToolbar.right.map(genBtn.bind(this));
      this.items.push(btns);
    }

    this.items.push([this.moreEl = new More()]);

    this.el = h('div', `${cssPrefix}-toolbar`);
    this.btns = h('div', `${cssPrefix}-toolbar-btns`);

    this.items.forEach((it) => {
      if (Array.isArray(it)) {
        it.forEach((i) => {
          if (i instanceof Item) {
            this.btns.child(i.el);
            i.change = (...args: unknown[]) => {
              this.change(...args);
            };
          }
        });
      } else {
        this.btns.child(it.el);
      }
    });

    this.el.child(this.btns);
    if (isHide) {
      this.el.hide();
    } else {
      this.reset();
      setTimeout(() => {
        initBtns2.call(this);
        moreResize.call(this);
      }, 0);
      bind(window, 'resize', () => {
        moreResize.call(this);
      });
    }
  }

  paintformatActive(): boolean {
    return this.paintformatEl.active();
  }

  paintformatToggle(): void {
    this.paintformatEl.toggle();
  }

  trigger(type: string): void {
    const el = this[`${type}El` as keyof Toolbar];
    if (el && el instanceof ToggleItem) {
      el.click();
    }
  }

  resetData(data: DataProxy): void {
    this.data = data;
    this.reset();
  }

  reset(): void {
    if (this.isHide) return;
    const { data } = this;
    const style = data.getSelectedCellStyle();
    this.undoEl.setState(!data.canUndo());
    this.redoEl.setState(!data.canRedo());
    this.mergeEl.setState(data.canUnmerge(), !data.selector.multiple());
    // @ts-expect-error - Autofilter.setState has empty signature
    this.autofilterEl.setState(!data.canAutofilter());
    const { font, format } = style;
    this.formatEl.setState(format);
    this.fontEl.setState(font.name);
    this.fontSizeEl.setState(font.size);
    this.boldEl.setState(font.bold);
    this.italicEl.setState(font.italic);
    this.underlineEl.setState(style.underline);
    this.strikeEl.setState(style.strike);
    this.textColorEl.setState(style.color);
    this.fillColorEl.setState(style.bgcolor);
    this.alignEl.setState(style.align);
    this.valignEl.setState(style.valign);
    this.textwrapEl.setState(style.textwrap);
    this.freezeEl.setState(data.freezeIsActive());
  }
}
