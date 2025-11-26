import { cssPrefix } from '../config';
import { type Element, h } from './element';
import { bindClickoutside, unbindClickoutside } from './event';

export interface SuggestItem {
  key: string;
  title?: string | (() => string);
  label?: string;
}

type ItemClickCallback = (item: SuggestItem) => void;

function inputMovePrev(this: Suggest, evt: KeyboardEvent): void {
  evt.preventDefault();
  evt.stopPropagation();
  const { filterItems } = this;
  if (filterItems.length <= 0) return;
  if (this.itemIndex >= 0) filterItems[this.itemIndex].toggle();
  this.itemIndex -= 1;
  if (this.itemIndex < 0) {
    this.itemIndex = filterItems.length - 1;
  }
  filterItems[this.itemIndex].toggle();
}

function inputMoveNext(this: Suggest, evt: KeyboardEvent): void {
  evt.stopPropagation();
  const { filterItems } = this;
  if (filterItems.length <= 0) return;
  if (this.itemIndex >= 0) filterItems[this.itemIndex].toggle();
  this.itemIndex += 1;
  if (this.itemIndex > filterItems.length - 1) {
    this.itemIndex = 0;
  }
  filterItems[this.itemIndex].toggle();
}

function inputEnter(this: Suggest, evt: KeyboardEvent): void {
  evt.preventDefault();
  const { filterItems } = this;
  if (filterItems.length <= 0) return;
  evt.stopPropagation();
  if (this.itemIndex < 0) this.itemIndex = 0;
  filterItems[this.itemIndex].el.click();
  this.hide();
}

function inputKeydownHandler(this: Suggest, evt: KeyboardEvent): void {
  const { key } = evt;
  if (evt.ctrlKey) {
    evt.stopPropagation();
  }
  switch (key) {
    case 'ArrowLeft':
      evt.stopPropagation();
      break;
    case 'ArrowUp':
      inputMovePrev.call(this, evt);
      break;
    case 'ArrowRight':
      evt.stopPropagation();
      break;
    case 'ArrowDown':
      inputMoveNext.call(this, evt);
      break;
    case 'Enter':
      inputEnter.call(this, evt);
      break;
    case 'Tab':
      inputEnter.call(this, evt);
      break;
    default:
      evt.stopPropagation();
      break;
  }
}

export default class Suggest {
  filterItems: Element[];
  items: SuggestItem[];
  el: Element;
  itemClick: ItemClickCallback;
  itemIndex: number;

  constructor(items: SuggestItem[], itemClick: ItemClickCallback, width = '200px') {
    this.filterItems = [];
    this.items = items;
    this.el = h('div', `${cssPrefix}-suggest`).css('width', width).hide();
    this.itemClick = itemClick;
    this.itemIndex = -1;
  }

  setOffset(v: { top?: number; left?: number; bottom?: number }): void {
    this.el.cssRemoveKeys('top', 'bottom').offset(v);
  }

  hide(): void {
    const { el } = this;
    this.filterItems = [];
    this.itemIndex = -1;
    el.hide();
    unbindClickoutside(this.el.parent());
  }

  setItems(items: SuggestItem[]): void {
    this.items = items;
  }

  search(word: string): void {
    let { items } = this;
    if (!/^\s*$/.test(word)) {
      items = items.filter((it) => (it.key || it).toString().startsWith(word.toUpperCase()));
    }
    const filteredElements = items.map((it) => {
      let title: string | (() => string) | undefined = it.title;
      if (title) {
        if (typeof title === 'function') {
          title = title();
        }
      } else {
        title = it.key;
      }
      const item = h('div', `${cssPrefix}-item`)
        .child(title as string)
        .on('click.stop', () => {
          this.itemClick(it);
          this.hide();
        });
      if (it.label) {
        item.child(h('div', 'label').safeHtml(it.label));
      }
      return item;
    });
    this.filterItems = filteredElements;
    if (filteredElements.length <= 0) {
      return;
    }
    const { el } = this;
    el.html('')
      .children(...filteredElements)
      .show();
    bindClickoutside(el.parent(), () => {
      this.hide();
    });
  }

  bindInputEvents(input: Element): void {
    input.on('keydown', (evt) => inputKeydownHandler.call(this, evt as KeyboardEvent));
  }
}
