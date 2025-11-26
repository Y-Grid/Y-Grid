import DropdownItem from './dropdown-item';
import DropdownBorder from '../dropdown-border';
import Dropdown from '../dropdown';

export default class Border extends DropdownItem {
  constructor() {
    super('border');
  }

  dropdown(): Dropdown {
    return new DropdownBorder();
  }
}
