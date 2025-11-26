import DropdownItem from './dropdown-item';
import DropdownColor from '../dropdown-color';
import Dropdown from '../dropdown';

export default class FillColor extends DropdownItem {
  constructor(color: string) {
    super('bgcolor', undefined, color);
  }

  dropdown(): Dropdown {
    const { tag, value } = this;
    return new DropdownColor(tag, value as string);
  }
}
