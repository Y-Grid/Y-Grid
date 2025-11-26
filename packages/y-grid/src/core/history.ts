export default class History {
  undoItems: string[] = [];
  redoItems: string[] = [];

  add(data: unknown): void {
    this.undoItems.push(JSON.stringify(data));
    this.redoItems = [];
  }

  canUndo(): boolean {
    return this.undoItems.length > 0;
  }

  canRedo(): boolean {
    return this.redoItems.length > 0;
  }

  undo(currentd: unknown, cb: (data: unknown) => void): void {
    const { undoItems, redoItems } = this;
    if (this.canUndo()) {
      redoItems.push(JSON.stringify(currentd));
      const item = undoItems.pop();
      if (item !== undefined) cb(JSON.parse(item));
    }
  }

  redo(currentd: unknown, cb: (data: unknown) => void): void {
    const { undoItems, redoItems } = this;
    if (this.canRedo()) {
      undoItems.push(JSON.stringify(currentd));
      const item = redoItems.pop();
      if (item !== undefined) cb(JSON.parse(item));
    }
  }
}
