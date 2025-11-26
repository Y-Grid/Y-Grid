import type Dropdown from '../dropdown';
import DropdownFontsize from '../dropdown-fontsize';
import DropdownItem from './dropdown-item';

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
