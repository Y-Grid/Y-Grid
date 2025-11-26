import DropdownItem from './dropdown-item';
import DropdownAlign from '../dropdown-align';
import Dropdown from '../dropdown';

export default class Align extends DropdownItem {
  constructor(value: string) {
    super('align', '', value);
  }

  dropdown(): Dropdown {
    const { value } = this;
    return new DropdownAlign(['left', 'center', 'right'], value as string);
  }
}
