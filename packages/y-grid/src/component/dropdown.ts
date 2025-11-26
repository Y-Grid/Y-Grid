import { Element, h } from './element';
import { bindClickoutside, unbindClickoutside } from './event';
import { cssPrefix } from '../config';

type ChangeCallback = (...args: unknown[]) => void;

export default class Dropdown extends Element {
  title: Element | string;
  change: ChangeCallback;
  headerClick: () => void;
  contentEl: Element;
  headerEl: Element;

  constructor(
    title: Element | string,
    width: string,
    showArrow: boolean,
    placement: string,
    ...children: Element[]
  ) {
    super('div', `${cssPrefix}-dropdown ${placement}`);
    this.title = title;
    this.change = () => {};
    this.headerClick = () => {};
    if (typeof title === 'string') {
      this.title = h('div', `${cssPrefix}-dropdown-title`).child(title);
    } else if (showArrow) {
      (this.title as Element).addClass('arrow-left');
    }
    this.contentEl = h('div', `${cssPrefix}-dropdown-content`)
      .css('width', width)
      .hide();

    this.setContentChildren(...children);

    this.headerEl = h('div', `${cssPrefix}-dropdown-header`);
    this.headerEl.on('click', () => {
      if (this.contentEl.css('display') !== 'block') {
        this.show();
      } else {
        this.hide();
      }
    }).children(
      this.title as Element,
      showArrow ? h('div', `${cssPrefix}-icon arrow-right`).child(
        h('div', `${cssPrefix}-icon-img arrow-down`),
      ) : '',
    );
    this.children(this.headerEl, this.contentEl);
  }

  setContentChildren(...children: Element[]): void {
    this.contentEl.html('');
    if (children.length > 0) {
      this.contentEl.children(...children);
    }
  }

  setTitle(title: string): void {
    (this.title as Element).html(title);
    this.hide();
  }

  show(): this {
    const { contentEl } = this;
    contentEl.show();
    this.parent().active();
    bindClickoutside(this.parent(), () => {
      this.hide();
    });
    return this;
  }

  hide(): this {
    this.parent().active(false);
    this.contentEl.hide();
    unbindClickoutside(this.parent());
    return this;
  }
}
