import DropdownItem from './dropdown-item';
import DropdownColor from '../dropdown-color';

export default class FillColor extends DropdownItem {
  constructor(color) {
    super('bgcolor', undefined, color);
  }

  dropdown() {
    const { tag, value } = this;
    return new DropdownColor(tag, value);
  }
}
