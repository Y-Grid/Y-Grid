import Item from './item';
import { Element } from '../element';
import Dropdown from '../dropdown';

export default class DropdownItem extends Item {
  dd!: Dropdown;

  dropdown(): Dropdown {
    throw new Error('Subclass must implement dropdown()');
  }

  getValue(v: unknown): unknown {
    return v;
  }

  element(): Element {
    const { tag } = this;
    this.dd = this.dropdown();
    // @ts-expect-error - Dropdown.change signature varies
    this.dd.change = (it: unknown) => this.change(tag, this.getValue(it));
    return super.element().child(this.dd);
  }

  setState(v: unknown): void {
    if (v) {
      this.value = v;
      this.dd.setTitle(v);
    }
  }
}
