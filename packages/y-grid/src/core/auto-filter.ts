import { CellRange } from './cell-range';
import type { Cell } from './types';

// operator: all|eq|neq|gt|gte|lt|lte|in|be
// value:
//   in => []
//   be => [min, max]

export type FilterOperator = 'all' | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'be';
export type SortOrder = 'asc' | 'desc';

export interface FilterData {
  ci: number;
  operator: FilterOperator;
  value: string | string[] | [number, number];
}

export interface SortData {
  ci: number;
  order: SortOrder;
}

export interface AutoFilterData {
  ref?: string;
  filters?: FilterData[];
  sort?: SortData | null;
}

class Filter {
  ci: number;
  operator: FilterOperator;
  value: string | string[] | [number, number];

  constructor(ci: number, operator: FilterOperator, value: string | string[] | [number, number]) {
    this.ci = ci;
    this.operator = operator;
    this.value = value;
  }

  set(operator: FilterOperator, value: string | string[] | [number, number]): void {
    this.operator = operator;
    this.value = value;
  }

  includes(v: string): boolean {
    const { operator, value } = this;
    if (operator === 'all') {
      return true;
    }
    if (operator === 'in') {
      return (value as string[]).includes(v);
    }
    return false;
  }

  vlength(): number {
    const { operator, value } = this;
    if (operator === 'in') {
      return (value as string[]).length;
    }
    return 0;
  }

  getData(): FilterData {
    const { ci, operator, value } = this;
    return { ci, operator, value };
  }
}

class Sort {
  ci: number;
  order: SortOrder;

  constructor(ci: number, order: SortOrder) {
    this.ci = ci;
    this.order = order;
  }

  asc(): boolean {
    return this.order === 'asc';
  }

  desc(): boolean {
    return this.order === 'desc';
  }
}

export default class AutoFilter {
  ref: string | null = null;
  filters: Filter[] = [];
  sort: Sort | null = null;

  setData({ ref, filters, sort }: AutoFilterData): void {
    if (ref != null) {
      this.ref = ref;
      this.filters = (filters || []).map((it) => new Filter(it.ci, it.operator, it.value));
      if (sort) {
        this.sort = new Sort(sort.ci, sort.order);
      }
    }
  }

  getData(): AutoFilterData {
    if (this.active() && this.ref) {
      const { ref, filters, sort } = this;
      return { ref, filters: filters.map((it) => it.getData()), sort };
    }
    return {};
  }

  addFilter(
    ci: number,
    operator: FilterOperator,
    value: string | string[] | [number, number]
  ): void {
    const filter = this.getFilter(ci);
    if (filter == null) {
      this.filters.push(new Filter(ci, operator, value));
    } else {
      filter.set(operator, value);
    }
  }

  setSort(ci: number, order: SortOrder | null): void {
    this.sort = order ? new Sort(ci, order) : null;
  }

  includes(ri: number, ci: number): boolean {
    if (this.active()) {
      return this.hrange().includes(ri, ci);
    }
    return false;
  }

  getSort(ci: number): Sort | null {
    const { sort } = this;
    if (sort && sort.ci === ci) {
      return sort;
    }
    return null;
  }

  getFilter(ci: number): Filter | null {
    const { filters } = this;
    for (let i = 0; i < filters.length; i += 1) {
      if (filters[i].ci === ci) {
        return filters[i];
      }
    }
    return null;
  }

  filteredRows(getCell: (ri: number, ci: number) => Cell | null): {
    rset: Set<number>;
    fset: Set<number>;
  } {
    const rset = new Set<number>();
    const fset = new Set<number>();
    if (this.active()) {
      const { sri, eri } = this.range();
      const { filters } = this;
      for (let ri = sri + 1; ri <= eri; ri += 1) {
        for (let i = 0; i < filters.length; i += 1) {
          const filter = filters[i];
          const cell = getCell(ri, filter.ci);
          const ctext = cell ? cell.text || '' : '';
          if (!filter.includes(ctext)) {
            rset.add(ri);
            break;
          }
          fset.add(ri);
        }
      }
    }
    return { rset, fset };
  }

  items(ci: number, getCell: (ri: number, ci: number) => Cell | null): Record<string, number> {
    const m: Record<string, number> = {};
    if (this.active()) {
      const { sri, eri } = this.range();
      for (let ri = sri + 1; ri <= eri; ri += 1) {
        const cell = getCell(ri, ci);
        if (cell !== null && !/^\s*$/.test(cell.text || '')) {
          const key = cell.text || '';
          const cnt = (m[key] || 0) + 1;
          m[key] = cnt;
        } else {
          m[''] = (m[''] || 0) + 1;
        }
      }
    }
    return m;
  }

  range(): CellRange {
    return CellRange.valueOf(this.ref ?? '');
  }

  hrange(): CellRange {
    const r = this.range();
    r.eri = r.sri;
    return r;
  }

  clear(): void {
    this.ref = null;
    this.filters = [];
    this.sort = null;
  }

  active(): boolean {
    return this.ref !== null;
  }
}
