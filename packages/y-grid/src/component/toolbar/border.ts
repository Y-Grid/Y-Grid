import type Dropdown from '../dropdown';
import DropdownBorder from '../dropdown-border';
import DropdownItem from './dropdown-item';

export default class Border extends DropdownItem {
  constructor() {
    super('border');
  }

  dropdown(): Dropdown {
    return new DropdownBorder();
  }
}
