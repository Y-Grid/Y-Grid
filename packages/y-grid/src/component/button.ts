import { cssPrefix } from '../config';
import { t } from '../locale/locale';
import { Element } from './element';

export default class Button extends Element {
  // type: primary
  constructor(title: string, type = '') {
    super('div', `${cssPrefix}-button ${type}`);
    this.child(t(`button.${title}`));
  }
}
