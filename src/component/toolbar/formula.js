import DropdownItem from './dropdown-item';
import DropdownFormula from '../dropdown-formula';

export default class Format extends DropdownItem {
  constructor() {
    super('formula');
  }

  getValue(it) {
    return it.key;
  }

  dropdown() {
    return new DropdownFormula();
  }
}
