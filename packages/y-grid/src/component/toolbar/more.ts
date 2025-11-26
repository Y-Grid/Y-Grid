import Dropdown from '../dropdown';
import DropdownItem from './dropdown-item';

import { cssPrefix } from '../../config';
import { h, Element } from '../element';
import Icon from '../icon';

export class DropdownMore extends Dropdown {
  moreBtns: Element;

  constructor() {
    const icon = new Icon('ellipsis');
    const moreBtns = h('div', `${cssPrefix}-toolbar-more`);
    super(icon, 'auto', false, 'bottom-right', moreBtns);
    this.moreBtns = moreBtns;
    this.contentEl.css('max-width', '420px');
  }
}

export default class More extends DropdownItem {
  declare dd: DropdownMore;

  constructor() {
    super('more');
    this.el.hide();
  }

  dropdown(): DropdownMore {
    return new DropdownMore();
  }

  show(): void {
    this.el.show();
  }

  hide(): void {
    this.el.hide();
  }
}
