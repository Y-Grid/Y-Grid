import type { Element } from '../element';
import Icon from '../icon';
import Item from './item';

export default class ToggleItem extends Item {
  element(): Element {
    const { tag } = this;
    return super
      .element()
      .child(new Icon(tag))
      .on('click', () => this.click());
  }

  click(): void {
    this.change(this.tag, this.toggle());
  }

  setState(active: boolean): void {
    this.el.active(active);
  }

  toggle(): boolean {
    return this.el.toggle();
  }

  active(): boolean {
    return this.el.hasClass('active');
  }
}
