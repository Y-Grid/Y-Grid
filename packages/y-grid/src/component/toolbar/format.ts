import DropdownItem from './dropdown-item';
import DropdownFormat from '../dropdown-format';
import Dropdown from '../dropdown';

interface FormatItem {
  key: string;
}

export default class Format extends DropdownItem {
  constructor() {
    super('format');
  }

  getValue(it: unknown): string {
    return (it as FormatItem).key;
  }

  dropdown(): Dropdown {
    return new DropdownFormat();
  }
}
