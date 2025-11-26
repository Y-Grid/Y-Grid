import DropdownItem from './dropdown-item';
import DropdownColor from '../dropdown-color';
import Dropdown from '../dropdown';

export default class TextColor extends DropdownItem {
  constructor(color: string) {
    super('color', undefined, color);
  }

  dropdown(): Dropdown {
    const { tag, value } = this;
    return new DropdownColor(tag, value as string);
  }
}
