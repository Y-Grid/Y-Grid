import type Dropdown from '../dropdown';
import DropdownAlign from '../dropdown-align';
import DropdownItem from './dropdown-item';

export default class Valign extends DropdownItem {
  constructor(value: string) {
    super('valign', '', value);
  }

  dropdown(): Dropdown {
    const { value } = this;
    return new DropdownAlign(['top', 'middle', 'bottom'], value as string);
  }
}
