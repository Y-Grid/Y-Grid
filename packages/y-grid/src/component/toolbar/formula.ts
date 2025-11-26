import DropdownItem from './dropdown-item';
import DropdownFormula from '../dropdown-formula';
import Dropdown from '../dropdown';

interface FormulaItem {
  key: string;
}

export default class Formula extends DropdownItem {
  constructor() {
    super('formula');
  }

  getValue(it: unknown): string {
    return (it as FormulaItem).key;
  }

  dropdown(): Dropdown {
    return new DropdownFormula();
  }
}
