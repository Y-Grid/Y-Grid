import ColorPalette from './color-palette';
import Dropdown from './dropdown';
import type { Element } from './element';
import Icon from './icon';

export default class DropdownColor extends Dropdown {
  constructor(iconName: string, color: string) {
    const icon = new Icon(iconName)
      .css('height', '16px')
      .css('border-bottom', `3px solid ${color}`);
    const colorPalette = new ColorPalette();
    colorPalette.change = (v: string) => {
      this.setTitle(v);
      this.change(v);
    };
    super(icon, 'auto', false, 'bottom-left', colorPalette.el);
  }

  setTitle(color: string): void {
    (this.title as Element).css('border-color', color);
    this.hide();
  }
}
