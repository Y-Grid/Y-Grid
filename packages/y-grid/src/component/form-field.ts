import { cssPrefix } from '../config';
import { t } from '../locale/locale';
import { type Element, h } from './element';
import FormInput from './form-input';
import type FormSelect from './form-select';

const patterns: Record<string, RegExp> = {
  number: /(^\d+$)|(^\d+(\.\d{0,4})?$)/,
  date: /^\d{4}-\d{1,2}-\d{1,2}$/,
};

export interface FormFieldRule {
  required?: boolean;
  type?: string;
  pattern?: RegExp;
}

// rule: { required: false, type, pattern: // }
export default class FormField {
  label: Element | string;
  rule: FormFieldRule;
  tip: Element;
  input: FormInput | FormSelect;
  el: Element;

  constructor(
    input: FormInput | FormSelect,
    rule: FormFieldRule,
    label?: string,
    labelWidth?: number
  ) {
    this.label = '';
    this.rule = rule;
    if (label) {
      this.label = h('label', 'label').css('width', `${labelWidth}px`).html(label);
    }
    this.tip = h('div', 'tip').child('tip').hide();
    this.input = input;
    this.input.vchange = () => this.validate();
    this.el = h('div', `${cssPrefix}-form-field`).children(
      this.label as Element,
      input.el,
      this.tip
    );
  }

  isShow(): boolean {
    return this.el.css('display') !== 'none';
  }

  show(): void {
    this.el.show();
  }

  hide(): this {
    this.el.hide();
    return this;
  }

  val(v?: string): this | string | unknown {
    return this.input.val(v as string);
  }

  hint(hint: string): void {
    if (this.input instanceof FormInput) {
      this.input.hint(hint);
    }
  }

  validate(): boolean {
    const { input, rule, tip, el } = this;
    const v = input.val() as string;
    if (rule.required) {
      if (/^\s*$/.test(v)) {
        tip.html(t('validation.required'));
        el.addClass('error');
        return false;
      }
    }
    if (rule.type || rule.pattern) {
      const pattern = rule.pattern || (rule.type ? patterns[rule.type] : null);
      if (pattern && !pattern.test(v)) {
        tip.html(t('validation.notMatch'));
        el.addClass('error');
        return false;
      }
    }
    el.removeClass('error');
    return true;
  }
}
