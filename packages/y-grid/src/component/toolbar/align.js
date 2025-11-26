import DropdownItem from './dropdown-item';
import DropdownAlign from '../dropdown-align';

export default class Align extends DropdownItem {
  constructor(value) {
    super('align', '', value);
  }

  dropdown() {
    const { value } = this;
    return new DropdownAlign(['left', 'center', 'right'], value);
  }
}
