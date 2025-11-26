import { CellRange } from './cell-range';

export default class Selector {
  range: CellRange = new CellRange(0, 0, 0, 0);
  ri = 0;
  ci = 0;

  multiple(): boolean {
    return this.range.multiple();
  }

  setIndexes(ri: number, ci: number): void {
    this.ri = ri;
    this.ci = ci;
  }

  size(): [number, number] {
    return this.range.size();
  }
}
