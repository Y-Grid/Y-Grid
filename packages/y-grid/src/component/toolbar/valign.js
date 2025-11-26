import DropdownItem from './dropdown-item';
import DropdownAlign from '../dropdown-align';

export default class Valign extends DropdownItem {
  constructor(value) {
    super('valign', '', value);
  }

  dropdown() {
    const { value } = this;
    return new DropdownAlign(['top', 'middle', 'bottom'], value);
  }
}
