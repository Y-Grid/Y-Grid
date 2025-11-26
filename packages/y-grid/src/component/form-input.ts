import { Element, h } from './element';
import { cssPrefix } from '../config';

export default class FormInput {
  vchange: (evt?: Event) => void;
  el: Element;
  input: Element;

  constructor(width: string, hint: string) {
    this.vchange = () => {};
    this.el = h('div', `${cssPrefix}-form-input`);
    this.input = h('input', '').css('width', width)
      .on('input', evt => this.vchange(evt))
      .attr('placeholder', hint);
    this.el.child(this.input);
  }

  focus(): void {
    setTimeout(() => {
      this.input.el.focus();
    }, 10);
  }

  hint(v: string): void {
    this.input.attr('placeholder', v);
  }

  val(): string;
  val(v: string): this;
  val(v?: string): this | string {
    if (v !== undefined) {
      this.input.val(v);
      return this;
    }
    return this.input.val();
  }
}
