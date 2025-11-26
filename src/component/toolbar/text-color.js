import DropdownItem from './dropdown-item';
import DropdownColor from '../dropdown-color';

export default class TextColor extends DropdownItem {
  constructor(color) {
    super('color', undefined, color);
  }

  dropdown() {
    const { tag, value } = this;
    return new DropdownColor(tag, value);
  }
}
