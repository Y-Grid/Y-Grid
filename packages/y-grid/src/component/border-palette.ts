import { Element, h } from './element';
import Icon from './icon';
import DropdownColor from './dropdown-color';
import DropdownLineType from './dropdown-linetype';
import { cssPrefix } from '../config';

export interface BorderPaletteValue {
  mode: string;
  style: string;
  color: string;
}

type BorderChangeCallback = (value: BorderPaletteValue) => void;

function buildTable(...trs: Element[]): Element {
  return h('table', '').child(
    h('tbody', '').children(...trs),
  );
}

export default class BorderPalette {
  color: string;
  style: string;
  mode: string;
  change: BorderChangeCallback;
  ddColor: DropdownColor;
  ddType: DropdownLineType;
  el: Element;

  constructor() {
    this.color = '#000';
    this.style = 'thin';
    this.mode = 'all';
    this.change = () => {};
    this.ddColor = new DropdownColor('line-color', this.color);
    this.ddColor.change = (color) => {
      this.color = color as string;
    };
    this.ddType = new DropdownLineType(this.style);
    this.ddType.change = ([s]) => {
      this.style = s as string;
    };
    this.el = h('div', `${cssPrefix}-border-palette`);

    const buildTd = (iconName: string): Element => {
      return h('td', '').child(
        h('div', `${cssPrefix}-border-palette-cell`).child(
          new Icon(`border-${iconName}`),
        ).on('click', () => {
          this.mode = iconName;
          const { mode, style, color } = this;
          this.change({ mode, style, color });
        }),
      );
    };

    const table = buildTable(
      h('tr', '').children(
        h('td', `${cssPrefix}-border-palette-left`).child(
          buildTable(
            h('tr', '').children(
              ...['all', 'inside', 'horizontal', 'vertical', 'outside'].map(it => buildTd(it)),
            ),
            h('tr', '').children(
              ...['left', 'top', 'right', 'bottom', 'none'].map(it => buildTd(it)),
            ),
          ),
        ),
        h('td', `${cssPrefix}-border-palette-right`).children(
          h('div', `${cssPrefix}-toolbar-btn`).child(this.ddColor.el),
          h('div', `${cssPrefix}-toolbar-btn`).child(this.ddType.el),
        ),
      ),
    );
    this.el.child(table);
  }
}
