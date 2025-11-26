import type Dropdown from '../dropdown';
import DropdownFormula from '../dropdown-formula';
import DropdownItem from './dropdown-item';

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
