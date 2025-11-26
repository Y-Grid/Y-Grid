import { cssPrefix } from '../config';
import { type Element, h } from './element';
import { bind, unbind } from './event';
import Icon from './icon';

declare global {
  interface Window {
    xkeydownEsc?: (evt: KeyboardEvent) => void;
  }
}

export default class Modal {
  title: string;
  el: Element;
  dimmer!: Element;

  constructor(title: string, content: Element[], width = '600px') {
    this.title = title;
    this.el = h('div', `${cssPrefix}-modal`)
      .css('width', width)
      .children(
        h('div', `${cssPrefix}-modal-header`).children(
          new Icon('close').on('click.stop', () => this.hide()),
          this.title
        ),
        h('div', `${cssPrefix}-modal-content`).children(...content)
      )
      .hide();
  }

  show(): void {
    // dimmer
    this.dimmer = h('div', `${cssPrefix}-dimmer active`);
    document.body.appendChild(this.dimmer.el);
    const { width, height } = this.el.show().box();
    const { clientHeight, clientWidth } = document.documentElement;
    this.el.offset({
      left: (clientWidth - width) / 2,
      top: (clientHeight - height) / 3,
    });
    window.xkeydownEsc = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') {
        this.hide();
      }
    };
    bind(window, 'keydown', window.xkeydownEsc as EventListener);
  }

  hide(): void {
    this.el.hide();
    document.body.removeChild(this.dimmer.el);
    if (window.xkeydownEsc) {
      unbind(window, 'keydown', window.xkeydownEsc as EventListener);
      window.xkeydownEsc = undefined;
    }
  }
}
