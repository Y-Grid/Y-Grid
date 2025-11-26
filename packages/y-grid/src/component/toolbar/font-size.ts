import DropdownItem from './dropdown-item';
import DropdownFontsize from '../dropdown-fontsize';
import Dropdown from '../dropdown';

interface FontSizeItem {
  pt: number;
}

export default class FontSize extends DropdownItem {
  constructor() {
    super('font-size');
  }

  getValue(it: unknown): number {
    return (it as FontSizeItem).pt;
  }

  dropdown(): Dropdown {
    return new DropdownFontsize();
  }
}
