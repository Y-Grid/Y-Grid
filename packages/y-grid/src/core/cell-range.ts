import { expr2xy, xy2expr } from './alphabet';

export class CellRange {
  sri: number;
  sci: number;
  eri: number;
  eci: number;
  w: number;
  h: number;

  constructor(sri: number, sci: number, eri: number, eci: number, w = 0, h = 0) {
    this.sri = sri;
    this.sci = sci;
    this.eri = eri;
    this.eci = eci;
    this.w = w;
    this.h = h;
  }

  set(sri: number, sci: number, eri: number, eci: number): void {
    this.sri = sri;
    this.sci = sci;
    this.eri = eri;
    this.eci = eci;
  }

  multiple(): boolean {
    return this.eri - this.sri > 0 || this.eci - this.sci > 0;
  }

  // cell-index: ri, ci
  // cell-ref: A10
  includes(...args: [string] | [number, number]): boolean {
    let ri: number;
    let ci: number;
    if (args.length === 1) {
      [ci, ri] = expr2xy(args[0] as string);
    } else {
      [ri, ci] = args as [number, number];
    }
    const { sri, sci, eri, eci } = this;
    return sri <= ri && ri <= eri && sci <= ci && ci <= eci;
  }

  each(
    cb: (ri: number, ci: number) => void,
    rowFilter: (ri: number) => boolean = () => true
  ): void {
    const { sri, sci, eri, eci } = this;
    for (let i = sri; i <= eri; i += 1) {
      if (rowFilter(i)) {
        for (let j = sci; j <= eci; j += 1) {
          cb(i, j);
        }
      }
    }
  }

  contains(other: CellRange): boolean {
    return (
      this.sri <= other.sri &&
      this.sci <= other.sci &&
      this.eri >= other.eri &&
      this.eci >= other.eci
    );
  }

  // within
  within(other: CellRange): boolean {
    return (
      this.sri >= other.sri &&
      this.sci >= other.sci &&
      this.eri <= other.eri &&
      this.eci <= other.eci
    );
  }

  // disjoint
  disjoint(other: CellRange): boolean {
    return (
      this.sri > other.eri || this.sci > other.eci || other.sri > this.eri || other.sci > this.eci
    );
  }

  // intersects
  intersects(other: CellRange): boolean {
    return (
      this.sri <= other.eri &&
      this.sci <= other.eci &&
      other.sri <= this.eri &&
      other.sci <= this.eci
    );
  }

  // union
  union(other: CellRange): CellRange {
    const { sri, sci, eri, eci } = this;
    return new CellRange(
      other.sri < sri ? other.sri : sri,
      other.sci < sci ? other.sci : sci,
      other.eri > eri ? other.eri : eri,
      other.eci > eci ? other.eci : eci
    );
  }

  // Returns Array<CellRange> that represents that part of this that does not intersect with other
  // difference
  difference(other: CellRange): CellRange[] {
    const ret: CellRange[] = [];
    const addRet = (sri: number, sci: number, eri: number, eci: number): void => {
      ret.push(new CellRange(sri, sci, eri, eci));
    };
    const { sri, sci, eri, eci } = this;
    const dsr = other.sri - sri;
    const dsc = other.sci - sci;
    const der = eri - other.eri;
    const dec = eci - other.eci;
    if (dsr > 0) {
      addRet(sri, sci, other.sri - 1, eci);
      if (der > 0) {
        addRet(other.eri + 1, sci, eri, eci);
        if (dsc > 0) {
          addRet(other.sri, sci, other.eri, other.sci - 1);
        }
        if (dec > 0) {
          addRet(other.sri, other.eci + 1, other.eri, eci);
        }
      } else {
        if (dsc > 0) {
          addRet(other.sri, sci, eri, other.sci - 1);
        }
        if (dec > 0) {
          addRet(other.sri, other.eci + 1, eri, eci);
        }
      }
    } else if (der > 0) {
      addRet(other.eri + 1, sci, eri, eci);
      if (dsc > 0) {
        addRet(sri, sci, other.eri, other.sci - 1);
      }
      if (dec > 0) {
        addRet(sri, other.eci + 1, other.eri, eci);
      }
    }
    if (dsc > 0) {
      addRet(sri, sci, eri, other.sci - 1);
      if (dec > 0) {
        addRet(sri, other.eri + 1, eri, eci);
        if (dsr > 0) {
          addRet(sri, other.sci, other.sri - 1, other.eci);
        }
        if (der > 0) {
          addRet(other.sri + 1, other.sci, eri, other.eci);
        }
      } else {
        if (dsr > 0) {
          addRet(sri, other.sci, other.sri - 1, eci);
        }
        if (der > 0) {
          addRet(other.sri + 1, other.sci, eri, eci);
        }
      }
    } else if (dec > 0) {
      addRet(eri, other.eci + 1, eri, eci);
      if (dsr > 0) {
        addRet(sri, sci, other.sri - 1, other.eci);
      }
      if (der > 0) {
        addRet(other.eri + 1, sci, eri, other.eci);
      }
    }
    return ret;
  }

  size(): [number, number] {
    return [this.eri - this.sri + 1, this.eci - this.sci + 1];
  }

  toString(): string {
    const { sri, sci, eri, eci } = this;
    let ref = xy2expr(sci, sri);
    if (this.multiple()) {
      ref = `${ref}:${xy2expr(eci, eri)}`;
    }
    return ref;
  }

  clone(): CellRange {
    const { sri, sci, eri, eci, w, h } = this;
    return new CellRange(sri, sci, eri, eci, w, h);
  }

  equals(other: CellRange): boolean {
    return (
      this.eri === other.eri &&
      this.eci === other.eci &&
      this.sri === other.sri &&
      this.sci === other.sci
    );
  }

  static valueOf(ref: string): CellRange {
    // B1:B8, B1 => 1 x 1 cell range
    const refs = ref.split(':');
    const [sci, sri] = expr2xy(refs[0]);
    let [eri, eci] = [sri, sci];
    if (refs.length > 1) {
      [eci, eri] = expr2xy(refs[1]);
    }
    return new CellRange(sri, sci, eri, eci);
  }
}

export default CellRange;
