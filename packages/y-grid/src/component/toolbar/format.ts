import type Dropdown from '../dropdown';
import DropdownFormat from '../dropdown-format';
import DropdownItem from './dropdown-item';

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
