import helper from './helper';
import type { Col, ColData } from './types';

export interface ColsConfig {
  len: number;
  width: number;
  indexWidth: number;
  minWidth: number;
}

class Cols {
  _: Record<number, Col> = {};
  len: number;
  width: number;
  indexWidth: number;
  minWidth: number;

  constructor({ len, width, indexWidth, minWidth }: ColsConfig) {
    this.len = len;
    this.width = width;
    this.indexWidth = indexWidth;
    this.minWidth = minWidth;
  }

  setData(d: ColData): void {
    if (d.len) {
      this.len = d.len as number;
      d.len = undefined;
    }
    this._ = d as unknown as Record<number, Col>;
  }

  getData(): ColData {
    const { len } = this;
    return Object.assign({ len }, this._) as ColData;
  }

  getWidth(i: number): number {
    if (this.isHide(i)) return 0;
    const col = this._[i];
    if (col?.width) {
      return col.width;
    }
    return this.width;
  }

  getOrNew(ci: number): Col {
    this._[ci] = this._[ci] || {};
    return this._[ci];
  }

  setWidth(ci: number, width: number): void {
    const col = this.getOrNew(ci);
    col.width = width;
  }

  unhide(idx: number): void {
    let index = idx;
    while (index > 0) {
      index -= 1;
      if (this.isHide(index)) {
        this.setHide(index, false);
      } else break;
    }
  }

  isHide(ci: number): boolean {
    const col = this._[ci];
    return !!col?.hide;
  }

  setHide(ci: number, v: boolean): void {
    const col = this.getOrNew(ci);
    if (v === true) col.hide = true;
    else col.hide = undefined;
  }

  setStyle(ci: number, style: number): void {
    const col = this.getOrNew(ci);
    col.style = style;
  }

  sumWidth(min: number, max: number): number {
    return helper.rangeSum(min, max, (i) => this.getWidth(i));
  }

  totalWidth(): number {
    return this.sumWidth(0, this.len);
  }
}

export default {};
export { Cols };
