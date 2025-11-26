import { cssPrefix } from '../config';
import { t } from '../locale/locale';
import Button from './button';
import { h } from './element';
import FormField from './form-field';
import FormInput from './form-input';
import FormSelect from './form-select';
import Modal from './modal';

const fieldLabelWidth = 100;

interface Validator {
  type: string;
  operator?: string;
  value?: string | string[];
  required?: boolean;
}

interface ValidationData {
  mode?: string;
  ref?: string;
  validator?: Validator;
}

type ChangeCallback = (action: string, mode?: string, ref?: string, validator?: Validator) => void;

export default class ModalValidation extends Modal {
  mf: FormField;
  rf: FormField;
  cf: FormField;
  of: FormField;
  minvf: FormField;
  maxvf: FormField;
  vf: FormField;
  svf: FormField;
  change: ChangeCallback;

  constructor() {
    const mf = new FormField(
      new FormSelect<string>(
        'cell',
        ['cell'], // cell|row|column
        '100%',
        (it) => t(`dataValidation.modeType.${it}`)
      ),
      { required: true },
      `${t('dataValidation.range')}:`,
      fieldLabelWidth
    );
    const rf = new FormField(new FormInput('120px', 'E3 or E3:F12'), {
      required: true,
      pattern: /^([A-Z]{1,2}[1-9]\d*)(:[A-Z]{1,2}[1-9]\d*)?$/,
    });
    const cf = new FormField(
      new FormSelect<string>(
        'list',
        ['list', 'number', 'date', 'phone', 'email'],
        '100%',
        (it) => t(`dataValidation.type.${it}`),
        (it) => this.criteriaSelected(it)
      ),
      { required: true },
      `${t('dataValidation.criteria')}:`,
      fieldLabelWidth
    );

    // operator
    const of = new FormField(
      new FormSelect<string>(
        'be',
        ['be', 'nbe', 'eq', 'neq', 'lt', 'lte', 'gt', 'gte'],
        '160px',
        (it) => t(`dataValidation.operator.${it}`),
        (it) => this.criteriaOperatorSelected(it)
      ),
      { required: true }
    ).hide();
    // min, max
    const minvf = new FormField(new FormInput('70px', '10'), { required: true }).hide();
    const maxvf = new FormField(new FormInput('70px', '100'), {
      required: true,
      type: 'number',
    }).hide();
    // value
    const svf = new FormField(new FormInput('120px', 'a,b,c'), { required: true });
    const vf = new FormField(new FormInput('70px', '10'), {
      required: true,
      type: 'number',
    }).hide();

    super(t('contextmenu.validation'), [
      h('div', `${cssPrefix}-form-fields`).children(mf.el, rf.el),
      h('div', `${cssPrefix}-form-fields`).children(
        cf.el,
        of.el,
        minvf.el,
        maxvf.el,
        vf.el,
        svf.el
      ),
      h('div', `${cssPrefix}-buttons`).children(
        new Button('cancel').on('click', () => this.btnClick('cancel')),
        new Button('remove').on('click', () => this.btnClick('remove')),
        new Button('save', 'primary').on('click', () => this.btnClick('save'))
      ),
    ]);
    this.mf = mf;
    this.rf = rf;
    this.cf = cf;
    this.of = of;
    this.minvf = minvf;
    this.maxvf = maxvf;
    this.vf = vf;
    this.svf = svf;
    this.change = () => {};
  }

  showVf(it: string): void {
    const hint = it === 'date' ? '2018-11-12' : '10';
    const { vf } = this;
    vf.hint(hint);
    vf.show();
  }

  criteriaSelected(it: string): void {
    const { of, minvf, maxvf, vf, svf } = this;
    if (it === 'date' || it === 'number') {
      of.show();
      minvf.rule.type = it;
      maxvf.rule.type = it;
      if (it === 'date') {
        minvf.hint('2018-11-12');
        maxvf.hint('2019-11-12');
      } else {
        minvf.hint('10');
        maxvf.hint('100');
      }
      minvf.show();
      maxvf.show();
      vf.hide();
      svf.hide();
    } else {
      if (it === 'list') {
        svf.show();
      } else {
        svf.hide();
      }
      vf.hide();
      of.hide();
      minvf.hide();
      maxvf.hide();
    }
  }

  criteriaOperatorSelected(it: string): void {
    if (!it) return;
    const { minvf, maxvf, vf } = this;
    if (it === 'be' || it === 'nbe') {
      minvf.show();
      maxvf.show();
      vf.hide();
    } else {
      const type = this.cf.val() as string;
      vf.rule.type = type;
      if (type === 'date') {
        vf.hint('2018-11-12');
      } else {
        vf.hint('10');
      }
      vf.show();
      minvf.hide();
      maxvf.hide();
    }
  }

  btnClick(action: string): void {
    if (action === 'cancel') {
      this.hide();
    } else if (action === 'remove') {
      this.change('remove');
      this.hide();
    } else if (action === 'save') {
      // validate
      const attrs = ['mf', 'rf', 'cf', 'of', 'svf', 'vf', 'minvf', 'maxvf'] as const;
      for (let i = 0; i < attrs.length; i += 1) {
        const field = this[attrs[i]];
        if (field.isShow()) {
          if (!field.validate()) return;
        }
      }

      const mode = this.mf.val() as string;
      const ref = this.rf.val() as string;
      const type = this.cf.val() as string;
      const operator = this.of.val() as string;
      let value: string | string[] = this.svf.val() as string;
      if (type === 'number' || type === 'date') {
        if (operator === 'be' || operator === 'nbe') {
          value = [this.minvf.val() as string, this.maxvf.val() as string];
        } else {
          value = this.vf.val() as string;
        }
      }
      this.change('save', mode, ref, {
        type,
        operator,
        required: false,
        value,
      });
      this.hide();
    }
  }

  // validation: { mode, ref, validator }
  setValue(v: ValidationData | null): void {
    if (v) {
      const { mf, rf, cf, of, svf, vf, minvf, maxvf } = this;
      const { mode, ref, validator } = v;
      const { type, operator, value } = validator || { type: 'list' };
      mf.val(mode || 'cell');
      rf.val(ref);
      cf.val(type);
      of.val(operator);
      if (Array.isArray(value)) {
        minvf.val(value[0]);
        maxvf.val(value[1]);
      } else {
        svf.val(value || '');
        vf.val(value || '');
      }
      this.criteriaSelected(type);
      this.criteriaOperatorSelected(operator!);
    }
    this.show();
  }
}
