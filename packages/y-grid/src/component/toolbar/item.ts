import { cssPrefix } from '../../config';
import { t } from '../../locale/locale';
import { type Element, h } from '../element';
import tooltip from '../tooltip';

export type ChangeCallback = (...args: unknown[]) => void;

export default class Item {
  tip: string;
  tag: string;
  shortcut: string | undefined;
  value: unknown;
  el: Element;
  change: ChangeCallback;

  constructor(tag?: string, shortcut?: string, value?: unknown) {
    this.tip = '';
    if (tag) {
      this.tip = t(`toolbar.${tag.replace(/-[a-z]/g, (c) => c[1].toUpperCase())}`);
    }
    if (shortcut) {
      this.tip += ` (${shortcut})`;
    }
    this.tag = tag || '';
    this.shortcut = shortcut;
    this.value = value;
    this.el = this.element();
    this.change = () => {};
  }

  element(): Element {
    const { tip } = this;
    return h('div', `${cssPrefix}-toolbar-btn`)
      .on('mouseenter', (evt: MouseEvent) => {
        if (this.tip) tooltip(this.tip, evt.target as HTMLElement);
      })
      .attr('data-tooltip', tip);
  }

  setState(..._args: unknown[]): void {}
}
