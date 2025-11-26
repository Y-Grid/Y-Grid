import ToggleItem from './toggle-item';

export default class Merge extends ToggleItem {
  constructor() {
    super('merge');
  }

  // @ts-expect-error - Override with different signature
  setState(active: boolean, disabled: boolean): void {
    this.el.active(active).disabled(disabled);
  }
}
