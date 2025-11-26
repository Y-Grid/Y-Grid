import type Dropdown from '../dropdown';
import DropdownColor from '../dropdown-color';
import DropdownItem from './dropdown-item';

export default class TextColor extends DropdownItem {
  constructor(color: string) {
    super('color', undefined, color);
  }

  dropdown(): Dropdown {
    const { tag, value } = this;
    return new DropdownColor(tag, value as string);
  }
}
