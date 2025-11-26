import DropdownItem from './dropdown-item';
import DropdownFormat from '../dropdown-format';

export default class Format extends DropdownItem {
  constructor() {
    super('format');
  }

  getValue(it) {
    return it.key;
  }

  dropdown() {
    return new DropdownFormat();
  }
}
