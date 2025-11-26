import { cssPrefix } from '../config';
import { type Element, type ScrollPosition, h } from './element';

type MoveCallback = (scrollValue: number, evt: Event) => void;

export default class Scrollbar {
  vertical: boolean;
  moveFn: MoveCallback | null;
  el: Element;
  contentEl: Element;

  constructor(vertical: boolean) {
    this.vertical = vertical;
    this.moveFn = null;
    this.contentEl = h('div', '');
    this.el = h('div', `${cssPrefix}-scrollbar ${vertical ? 'vertical' : 'horizontal'}`)
      .child(this.contentEl)
      .on('mousemove.stop', () => {})
      .on('scroll.stop', (evt: Event) => {
        const target = evt.target as HTMLElement;
        const { scrollTop, scrollLeft } = target;
        if (this.moveFn) {
          this.moveFn(this.vertical ? scrollTop : scrollLeft, evt);
        }
      });
  }

  move(v: ScrollPosition): this {
    this.el.scroll(v);
    return this;
  }

  scroll(): ScrollPosition {
    return this.el.scroll();
  }

  set(distance: number, contentDistance: number): this {
    const d = distance - 1;
    if (contentDistance > d) {
      const cssKey = this.vertical ? 'height' : 'width';
      this.el.css(cssKey, `${d - 15}px`).show();
      this.contentEl
        .css(this.vertical ? 'width' : 'height', '1px')
        .css(cssKey, `${contentDistance}px`);
    } else {
      this.el.hide();
    }
    return this;
  }
}
