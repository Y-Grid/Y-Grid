import { Element, h } from './element';
import Suggest, { SuggestItem } from './suggest';
import { cssPrefix } from '../config';

type GetTitleFn<T> = (item: T) => string;
type ChangeFn<T> = (item: T) => void;

export default class FormSelect<T = string> {
  key: T;
  getTitle: GetTitleFn<T>;
  vchange: (key: T) => void;
  el: Element;
  suggest: Suggest;
  itemEl: Element;

  constructor(
    key: T,
    items: T[],
    width: string,
    getTitle: GetTitleFn<T> = (it) => String(it),
    change: ChangeFn<T> = () => {}
  ) {
    this.key = key;
    this.getTitle = getTitle;
    this.vchange = () => {};
    this.el = h('div', `${cssPrefix}-form-select`);
    this.suggest = new Suggest(
      items.map(it => ({ key: String(it), title: this.getTitle(it) })),
      (it: SuggestItem) => {
        const typedKey = items.find(item => String(item) === it.key) as T;
        this.itemClick(typedKey);
        change(typedKey);
        this.vchange(typedKey);
      },
      width
    );
    this.itemEl = h('div', 'input-text').html(this.getTitle(key));
    this.el.children(
      this.itemEl,
      this.suggest.el,
    ).on('click', () => this.show());
  }

  show(): void {
    this.suggest.search('');
  }

  itemClick(it: T): void {
    this.key = it;
    this.itemEl.html(this.getTitle(it));
  }

  val(v?: T): this | T {
    if (v !== undefined) {
      this.key = v;
      this.itemEl.html(this.getTitle(v));
      return this;
    }
    return this.key;
  }
}
