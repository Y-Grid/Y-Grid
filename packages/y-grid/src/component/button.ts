import { Element } from './element';
import { cssPrefix } from '../config';
import { t } from '../locale/locale';

export default class Button extends Element {
  // type: primary
  constructor(title: string, type: string = '') {
    super('div', `${cssPrefix}-button ${type}`);
    this.child(t(`button.${title}`));
  }
}
