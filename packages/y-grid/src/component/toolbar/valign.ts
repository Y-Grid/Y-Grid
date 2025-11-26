import DropdownItem from './dropdown-item';
import DropdownAlign from '../dropdown-align';
import Dropdown from '../dropdown';

export default class Valign extends DropdownItem {
  constructor(value: string) {
    super('valign', '', value);
  }

  dropdown(): Dropdown {
    const { value } = this;
    return new DropdownAlign(['top', 'middle', 'bottom'], value as string);
  }
}
