import { cssPrefix } from '../config';
import { t } from '../locale/locale';
import Button from './button';
import { type Element, h } from './element';
import { bindClickoutside, unbindClickoutside } from './event';

interface Sort {
  order: string;
  asc: () => boolean;
  desc: () => boolean;
}

interface Filter {
  value: string[];
}

type OkCallback = (
  ci: number,
  sort: string | null,
  operator: string,
  filterValues: string[]
) => void;

function buildMenu(clsName: string): Element {
  return h('div', `${cssPrefix}-item ${clsName}`);
}

function buildSortItem(this: SortFilter, it: string): Element {
  return buildMenu('state')
    .child(t(`sort.${it}`))
    .on('click.stop', () => this.itemClick(it));
}

function buildFilterBody(this: SortFilter, items: Record<string, number>): void {
  const { filterbEl, filterValues } = this;
  filterbEl.html('');
  const itemKeys = Object.keys(items);
  itemKeys.forEach((it, index) => {
    const cnt = items[it];
    const active = filterValues.includes(it) ? 'checked' : '';
    filterbEl.child(
      h('div', `${cssPrefix}-item state ${active}`)
        .on('click.stop', () => this.filterClick(index, it))
        .children(it === '' ? t('filter.empty') : it, h('div', 'label').html(`(${cnt})`))
    );
  });
}

function resetFilterHeader(this: SortFilter): void {
  const { filterhEl, filterValues, values } = this;
  const valuesLength = values?.length ?? 0;
  filterhEl.html(`${filterValues.length} / ${valuesLength}`);
  filterhEl.checked(filterValues.length === valuesLength);
}

export default class SortFilter {
  filterbEl: Element;
  filterhEl: Element;
  el: Element;
  sortAscEl: Element;
  sortDescEl: Element;
  ci: number | null;
  sortDesc: string | null;
  sort: string | null;
  values: string[] | null;
  filterValues: string[];
  ok?: OkCallback;

  constructor() {
    this.sortAscEl = buildSortItem.call(this, 'asc');
    this.sortDescEl = buildSortItem.call(this, 'desc');
    this.filterbEl = h('div', `${cssPrefix}-body`);
    this.filterhEl = h('div', `${cssPrefix}-header state`).on('click.stop', () =>
      this.filterClick(0, 'all')
    );
    this.el = h('div', `${cssPrefix}-sort-filter`)
      .children(
        this.sortAscEl,
        this.sortDescEl,
        buildMenu('divider'),
        h('div', `${cssPrefix}-filter`).children(this.filterhEl, this.filterbEl),
        h('div', `${cssPrefix}-buttons`).children(
          new Button('cancel').on('click', () => this.btnClick('cancel')),
          new Button('ok', 'primary').on('click', () => this.btnClick('ok'))
        )
      )
      .hide();
    this.ci = null;
    this.sortDesc = null;
    this.sort = null;
    this.values = null;
    this.filterValues = [];
  }

  btnClick(it: string): void {
    if (it === 'ok') {
      const { ci, sort, filterValues } = this;
      if (this.ok && ci !== null) {
        this.ok(ci, sort, 'in', filterValues);
      }
    }
    this.hide();
  }

  itemClick(it: string): void {
    this.sort = it;
    const { sortAscEl, sortDescEl } = this;
    sortAscEl.checked(it === 'asc');
    sortDescEl.checked(it === 'desc');
  }

  filterClick(index: number, it: string): void {
    const { filterbEl, filterValues, values } = this;
    const children = filterbEl.children() as NodeListOf<HTMLElement>;
    if (it === 'all') {
      if (children.length === filterValues.length) {
        this.filterValues = [];
        for (const i of children) {
          h(i).checked(false);
        }
      } else {
        this.filterValues = values ? Array.from(values) : [];
        for (const i of children) {
          h(i).checked(true);
        }
      }
    } else {
      const checked = h(children[index]).toggle('checked');
      if (checked) {
        filterValues.push(it);
      } else {
        filterValues.splice(
          filterValues.findIndex((i) => i === it),
          1
        );
      }
    }
    resetFilterHeader.call(this);
  }

  // v: autoFilter
  // items: {value: cnt}
  // sort { ci, order }
  set(ci: number, items: Record<string, number>, filter: Filter | null, sort: Sort | null): void {
    this.ci = ci;
    const { sortAscEl, sortDescEl } = this;
    if (sort !== null) {
      this.sort = sort.order;
      sortAscEl.checked(sort.asc());
      sortDescEl.checked(sort.desc());
    } else {
      this.sortDesc = null;
      sortAscEl.checked(false);
      sortDescEl.checked(false);
    }
    this.values = Object.keys(items);
    this.filterValues = filter ? Array.from(filter.value) : Object.keys(items);
    buildFilterBody.call(this, items);
    resetFilterHeader.call(this);
  }

  setOffset(v: { left: number; top: number }): void {
    this.el.offset(v).show();
    let tindex = 1;
    bindClickoutside(this.el, () => {
      if (tindex <= 0) {
        this.hide();
      }
      tindex -= 1;
    });
  }

  show(): void {
    this.el.show();
  }

  hide(): void {
    this.el.hide();
    unbindClickoutside(this.el);
  }
}
