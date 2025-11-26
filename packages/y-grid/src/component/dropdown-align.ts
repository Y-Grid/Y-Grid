import { cssPrefix } from '../config';
import Dropdown from './dropdown';
import { h } from './element';
import Icon from './icon';

function buildItemWithIcon(iconName: string): Icon {
  return h('div', `${cssPrefix}-item`).child(new Icon(iconName)) as unknown as Icon;
}

export default class DropdownAlign extends Dropdown {
  constructor(aligns: string[], align: string) {
    const icon = new Icon(`align-${align}`);
    const naligns = aligns.map((it) =>
      buildItemWithIcon(`align-${it}`).on('click', () => {
        this.setTitle(it);
        this.change(it);
      })
    );
    super(icon, 'auto', true, 'bottom-left', ...naligns);
  }

  setTitle(align: string): void {
    (this.title as Icon).setName(`align-${align}`);
    this.hide();
  }
}
