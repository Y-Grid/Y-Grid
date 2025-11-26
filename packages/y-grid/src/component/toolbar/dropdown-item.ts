import type Dropdown from '../dropdown';
import type { Element } from '../element';
import Item from './item';

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
    this.dd.change = (it: unknown) => this.change(tag, this.getValue(it));
    return super.element().child(this.dd.el);
  }

  setState(v: unknown): void {
    if (v) {
      this.value = v;
      this.dd.setTitle(String(v));
    }
  }
}
