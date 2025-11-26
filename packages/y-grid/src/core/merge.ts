import { CellRange } from './cell-range';

class Merges {
  _: CellRange[];

  constructor(d: CellRange[] = []) {
    this._ = d;
  }

  forEach(cb: (cellRange: CellRange) => void): void {
    this._.forEach(cb);
  }

  deleteWithin(cr: CellRange): void {
    this._ = this._.filter((it) => !it.within(cr));
  }

  getFirstIncludes(ri: number, ci: number): CellRange | null {
    for (let i = 0; i < this._.length; i += 1) {
      const it = this._[i];
      if (it.includes(ri, ci)) {
        return it;
      }
    }
    return null;
  }

  filterIntersects(cellRange: CellRange): Merges {
    return new Merges(this._.filter((it) => it.intersects(cellRange)));
  }

  intersects(cellRange: CellRange): boolean {
    for (let i = 0; i < this._.length; i += 1) {
      const it = this._[i];
      if (it.intersects(cellRange)) {
        return true;
      }
    }
    return false;
  }

  union(cellRange: CellRange): CellRange {
    let cr = cellRange;
    for (const it of this._) {
      if (it.intersects(cr)) {
        cr = it.union(cr);
      }
    }
    return cr;
  }

  add(cr: CellRange): void {
    this.deleteWithin(cr);
    this._.push(cr);
  }

  // type: row | column
  shift(
    type: 'row' | 'column',
    index: number,
    n: number,
    cbWithin: (sri: number, sci: number, rn: number, cn: number) => void
  ): void {
    for (const cellRange of this._) {
      const { sri, sci, eri, eci } = cellRange;
      const range = cellRange;
      if (type === 'row') {
        if (sri >= index) {
          range.sri += n;
          range.eri += n;
        } else if (sri < index && index <= eri) {
          range.eri += n;
          cbWithin(sri, sci, n, 0);
        }
      } else if (type === 'column') {
        if (sci >= index) {
          range.sci += n;
          range.eci += n;
        } else if (sci < index && index <= eci) {
          range.eci += n;
          cbWithin(sri, sci, 0, n);
        }
      }
    }
  }

  move(cellRange: CellRange, rn: number, cn: number): void {
    for (const it of this._) {
      if (it.within(cellRange)) {
        it.eri += rn;
        it.sri += rn;
        it.sci += cn;
        it.eci += cn;
      }
    }
  }

  setData(merges: string[]): this {
    this._ = merges.map((merge) => CellRange.valueOf(merge));
    return this;
  }

  getData(): string[] {
    return this._.map((merge) => merge.toString());
  }
}

export default {};
export { Merges };
