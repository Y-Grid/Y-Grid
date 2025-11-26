import { cssPrefix } from '../config';
import Calendar from './calendar';
import { type Element, h } from './element';

export default class Datepicker {
  calendar: Calendar;
  el: Element;

  constructor() {
    this.calendar = new Calendar(new Date());
    this.el = h('div', `${cssPrefix}-datepicker`).child(this.calendar.el).hide();
  }

  setValue(date: string | Date): this {
    const { calendar } = this;
    if (typeof date === 'string') {
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(date)) {
        calendar.setValue(new Date(date.replace(/-/g, '/')));
      }
    } else if (date instanceof Date) {
      calendar.setValue(date);
    }
    return this;
  }

  change(cb: (date: Date) => void): void {
    this.calendar.selectChange = (d: Date) => {
      cb(d);
      this.hide();
    };
  }

  show(): void {
    this.el.show();
  }

  hide(): void {
    this.el.hide();
  }
}
