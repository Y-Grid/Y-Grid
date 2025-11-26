import DropdownItem from './dropdown-item';
import DropdownFont from '../dropdown-font';
import Dropdown from '../dropdown';

interface FontItem {
  key: string;
}

export default class Font extends DropdownItem {
  constructor() {
    super('font-name');
  }

  getValue(it: unknown): string {
    return (it as FontItem).key;
  }

  dropdown(): Dropdown {
    return new DropdownFont();
  }
}
