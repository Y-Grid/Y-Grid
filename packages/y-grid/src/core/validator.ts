import { t } from '../locale/locale';
import helper from './helper';

export type ValidatorType = 'date' | 'number' | 'list' | 'phone' | 'email';
export type ValidatorOperator =
  | 'b'
  | 'nb'
  | 'eq'
  | 'neq'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'be'
  | 'nbe';

const rules: Record<string, RegExp> = {
  phone: /^[1-9]\d{10}$/,
  email: /w+([-+.]w+)*@w+([-.]w+)*.w+([-.]w+)*/,
};

function returnMessage(
  flag: boolean,
  key: string,
  _arg1?: unknown,
  _arg2?: unknown
): [boolean, string] {
  let message = '';
  if (!flag) {
    // t() function doesn't accept additional args, so just use the key
    message = t(`validation.${key}`);
  }
  return [flag, message];
}

export default class Validator {
  required: boolean;
  value: string | string[] | [string, string];
  type: ValidatorType;
  operator: ValidatorOperator | undefined;
  message = '';

  // operator: b|nb|eq|neq|lt|lte|gt|gte
  // type: date|number|list|phone|email
  constructor(
    type: ValidatorType,
    required: boolean,
    value: string | string[] | [string, string],
    operator?: ValidatorOperator
  ) {
    this.required = required;
    this.value = value;
    this.type = type;
    this.operator = operator;
  }

  parseValue(v: string): Date | number | string {
    const { type } = this;
    if (type === 'date') {
      return new Date(v);
    }
    if (type === 'number') {
      return Number(v);
    }
    return v;
  }

  equals(other: Validator): boolean {
    let flag =
      this.type === other.type &&
      this.required === other.required &&
      this.operator === other.operator;
    if (flag) {
      if (Array.isArray(this.value)) {
        flag = helper.arrayEquals(this.value, other.value as string[]);
      } else {
        flag = this.value === other.value;
      }
    }
    return flag;
  }

  values(): string[] {
    return (this.value as string).split(',');
  }

  validate(v: string): [boolean, string] {
    const { required, operator, value, type } = this;
    if (required && /^\s*$/.test(v)) {
      return returnMessage(false, 'required');
    }
    if (/^\s*$/.test(v)) return [true, ''];
    if (rules[type] && !rules[type].test(v)) {
      return returnMessage(false, 'notMatch');
    }
    if (type === 'list') {
      return returnMessage(this.values().includes(v), 'notIn');
    }
    if (operator) {
      const v1 = this.parseValue(v);
      if (operator === 'be') {
        const [min, max] = value as [string, string];
        return returnMessage(
          v1 >= this.parseValue(min) && v1 <= this.parseValue(max),
          'between',
          min,
          max
        );
      }
      if (operator === 'nbe') {
        const [min, max] = value as [string, string];
        return returnMessage(
          v1 < this.parseValue(min) || v1 > this.parseValue(max),
          'notBetween',
          min,
          max
        );
      }
      if (operator === 'eq') {
        return returnMessage(v1 === this.parseValue(value as string), 'equal', value);
      }
      if (operator === 'neq') {
        return returnMessage(v1 !== this.parseValue(value as string), 'notEqual', value);
      }
      if (operator === 'lt') {
        return returnMessage(v1 < this.parseValue(value as string), 'lessThan', value);
      }
      if (operator === 'lte') {
        return returnMessage(v1 <= this.parseValue(value as string), 'lessThanEqual', value);
      }
      if (operator === 'gt') {
        return returnMessage(v1 > this.parseValue(value as string), 'greaterThan', value);
      }
      if (operator === 'gte') {
        return returnMessage(v1 >= this.parseValue(value as string), 'greaterThanEqual', value);
      }
    }
    return [true, ''];
  }
}
