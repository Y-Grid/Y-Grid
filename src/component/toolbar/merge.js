import ToggleItem from './toggle-item';

export default class Merge extends ToggleItem {
  constructor() {
    super('merge');
  }

  setState(active, disabled) {
    this.el.active(active).disabled(disabled);
  }
}
