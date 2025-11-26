import Item from './item';
import Icon from '../icon';
import { Element } from '../element';

export default class IconItem extends Item {
  element(): Element {
    return super.element()
      .child(new Icon(this.tag))
      .on('click', () => this.change(this.tag));
  }

  setState(disabled: boolean): void {
    this.el.disabled(disabled);
  }
}
