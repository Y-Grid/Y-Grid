import DropdownItem from './dropdown-item';
import DropdownFontsize from '../dropdown-fontsize';

export default class Format extends DropdownItem {
  constructor() {
    super('font-size');
  }

  getValue(it) {
    return it.pt;
  }

  dropdown() {
    return new DropdownFontsize();
  }
}
