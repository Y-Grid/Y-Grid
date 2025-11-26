import { tf } from '../locale/locale';
import { numberCalc } from './helper';

export interface Formula {
  key: string;
  title: () => string;
  render: (ary: unknown[]) => unknown;
}

const baseFormulas: Formula[] = [
  {
    key: 'SUM',
    title: tf('formula.sum'),
    render: (ary: unknown[]): number | string =>
      ary.reduce((a, b) => numberCalc('+', a as number, b as number), 0) as number | string,
  },
  {
    key: 'AVERAGE',
    title: tf('formula.average'),
    render: (ary: unknown[]): number =>
      (ary.reduce((a, b) => Number(a) + Number(b), 0) as number) / ary.length,
  },
  {
    key: 'MAX',
    title: tf('formula.max'),
    render: (ary: unknown[]): number => Math.max(...ary.map((v) => Number(v))),
  },
  {
    key: 'MIN',
    title: tf('formula.min'),
    render: (ary: unknown[]): number => Math.min(...ary.map((v) => Number(v))),
  },
  {
    key: 'IF',
    title: tf('formula._if'),
    render: ([b, t, f]: unknown[]): unknown => (b ? t : f),
  },
  {
    key: 'AND',
    title: tf('formula.and'),
    render: (ary: unknown[]): boolean => ary.every((it) => it),
  },
  {
    key: 'OR',
    title: tf('formula.or'),
    render: (ary: unknown[]): boolean => ary.some((it) => it),
  },
  {
    key: 'CONCAT',
    title: tf('formula.concat'),
    render: (ary: unknown[]): string => ary.join(''),
  },
];

const formulas = baseFormulas;

const formulam: Record<string, Formula> = {};
for (const f of baseFormulas) {
  formulam[f.key] = f;
}

export default {};

export { formulam, formulas, baseFormulas };
