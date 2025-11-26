import type { CellRange } from './cell-range';

type ClipboardState = 'clear' | 'copy' | 'cut';

export default class Clipboard {
  range: CellRange | null = null;
  state: ClipboardState = 'clear';

  copy(cellRange: CellRange): this {
    this.range = cellRange;
    this.state = 'copy';
    return this;
  }

  cut(cellRange: CellRange): this {
    this.range = cellRange;
    this.state = 'cut';
    return this;
  }

  isCopy(): boolean {
    return this.state === 'copy';
  }

  isCut(): boolean {
    return this.state === 'cut';
  }

  isClear(): boolean {
    return this.state === 'clear';
  }

  clear(): void {
    this.range = null;
    this.state = 'clear';
  }
}
