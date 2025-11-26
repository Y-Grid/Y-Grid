import { CellRange } from './cell-range';
import Validator, { type ValidatorType, type ValidatorOperator } from './validator';

export interface ValidationData {
  refs: string[];
  mode: string;
  type: ValidatorType;
  required: boolean;
  operator?: ValidatorOperator;
  value: string | string[] | [string, string];
}

export interface ValidatorConfig {
  type: ValidatorType;
  required: boolean;
  value: string | string[] | [string, string];
  operator?: ValidatorOperator;
}

class Validation {
  refs: string[];
  mode: string; // cell
  validator: Validator;

  constructor(mode: string, refs: string[], validator: Validator) {
    this.refs = refs;
    this.mode = mode;
    this.validator = validator;
  }

  includes(ri: number, ci: number): boolean {
    const { refs } = this;
    for (let i = 0; i < refs.length; i += 1) {
      const cr = CellRange.valueOf(refs[i]);
      if (cr.includes(ri, ci)) return true;
    }
    return false;
  }

  addRef(ref: string): void {
    this.remove(CellRange.valueOf(ref));
    this.refs.push(ref);
  }

  remove(cellRange: CellRange): void {
    const nrefs: string[] = [];
    for (const it of this.refs) {
      const cr = CellRange.valueOf(it);
      if (cr.intersects(cellRange)) {
        const crs = cr.difference(cellRange);
        for (const it1 of crs) {
          nrefs.push(it1.toString());
        }
      } else {
        nrefs.push(it);
      }
    }
    this.refs = nrefs;
  }

  getData(): ValidationData {
    const { refs, mode, validator } = this;
    const { type, required, operator, value } = validator;
    return {
      refs,
      mode,
      type,
      required,
      operator,
      value,
    };
  }

  static valueOf({ refs, mode, type, required, operator, value }: ValidationData): Validation {
    return new Validation(mode, refs, new Validator(type, required, value, operator));
  }
}

class Validations {
  _: Validation[] = [];
  // ri_ci: errMessage
  errors: Map<string, string> = new Map();

  getError(ri: number, ci: number): string | undefined {
    return this.errors.get(`${ri}_${ci}`);
  }

  validate(ri: number, ci: number, text: string): boolean {
    const v = this.get(ri, ci);
    const key = `${ri}_${ci}`;
    const { errors } = this;
    if (v !== null) {
      const [flag, message] = v.validator.validate(text);
      if (!flag) {
        errors.set(key, message);
      } else {
        errors.delete(key);
      }
    } else {
      errors.delete(key);
    }
    return true;
  }

  // type: date|number|phone|email|list
  // validator: { required, value, operator }
  add(mode: string, ref: string, { type, required, value, operator }: ValidatorConfig): void {
    const validator = new Validator(type, required, value, operator);
    const v = this.getByValidator(validator);
    if (v !== null) {
      v.addRef(ref);
    } else {
      this._.push(new Validation(mode, [ref], validator));
    }
  }

  getByValidator(validator: Validator): Validation | null {
    for (let i = 0; i < this._.length; i += 1) {
      const v = this._[i];
      if (v.validator.equals(validator)) {
        return v;
      }
    }
    return null;
  }

  get(ri: number, ci: number): Validation | null {
    for (let i = 0; i < this._.length; i += 1) {
      const v = this._[i];
      if (v.includes(ri, ci)) return v;
    }
    return null;
  }

  remove(cellRange: CellRange): void {
    this.each((it) => {
      it.remove(cellRange);
    });
  }

  each(cb: (validation: Validation) => void): void {
    for (const it of this._) {
      cb(it);
    }
  }

  getData(): ValidationData[] {
    return this._.filter((it) => it.refs.length > 0).map((it) => it.getData());
  }

  setData(d: ValidationData[]): void {
    this._ = d.map((it) => Validation.valueOf(it));
  }
}

export default {};
export { Validations, Validation };
