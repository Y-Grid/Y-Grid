import { Draw } from '../canvas/draw';
import { cssPrefix } from '../config';
import { t } from '../locale/locale';
import Button from './button';
import { type Element, h } from './element';
import { renderCell } from './table';

// resolution: 72 => 595 x 842
// 150 => 1240 x 1754
// 200 => 1654 x 2339
// 300 => 2479 x 3508
// 96 * cm / 2.54 , 96 * cm / 2.54

type PagerSize = [string, number, number];
type Orientation = 'landscape' | 'portrait';

interface DataProxy {
  viewWidth: () => number;
  viewHeight: () => number;
  contentRange: () => { w: number; h: number; eri: number; eci: number };
  rows: { getHeight: (ri: number) => number };
  eachMergesInView: (range: ViewRange, cb: (merge: { sri: number; sci: number }) => void) => void;
}

interface ViewRange {
  sri: number;
  sci: number;
  eri: number;
  eci: number;
}

interface Paper {
  w: number;
  h: number;
  padding: number;
  orientation: Orientation;
  readonly width: number;
  readonly height: number;
}

const PAGER_SIZES: PagerSize[] = [
  ['A3', 11.69, 16.54],
  ['A4', 8.27, 11.69],
  ['A5', 5.83, 8.27],
  ['B4', 9.84, 13.9],
  ['B5', 6.93, 9.84],
];

const PAGER_ORIENTATIONS: Orientation[] = ['landscape', 'portrait'];

function inches2px(inc: number): number {
  return Number.parseInt(String(96 * inc), 10);
}

function btnClick(this: Print, type: string): void {
  if (type === 'cancel') {
    this.el.hide();
  } else {
    this.toPrint();
  }
}

function pagerSizeChange(this: Print, evt: Event): void {
  const { paper } = this;
  const { value } = evt.target as HTMLSelectElement;
  const ps = PAGER_SIZES[Number(value)];
  paper.w = inches2px(ps[1]);
  paper.h = inches2px(ps[2]);
  this.preview();
}

function pagerOrientationChange(this: Print, evt: Event): void {
  const { paper } = this;
  const { value } = evt.target as HTMLSelectElement;
  const v = PAGER_ORIENTATIONS[Number(value)];
  paper.orientation = v;
  this.preview();
}

export default class Print {
  paper: Paper;
  data: DataProxy;
  el: Element;
  contentEl: Element;
  canvases: HTMLCanvasElement[];

  constructor(data: DataProxy) {
    this.paper = {
      w: inches2px(PAGER_SIZES[0][1]),
      h: inches2px(PAGER_SIZES[0][2]),
      padding: 50,
      orientation: PAGER_ORIENTATIONS[0],
      get width() {
        return this.orientation === 'landscape' ? this.h : this.w;
      },
      get height() {
        return this.orientation === 'landscape' ? this.w : this.h;
      },
    };
    this.data = data;
    this.canvases = [];
    this.contentEl = h('div', '-content');
    this.el = h('div', `${cssPrefix}-print`)
      .children(
        h('div', `${cssPrefix}-print-bar`).children(
          h('div', '-title').child('Print settings'),
          h('div', '-right').children(
            h('div', `${cssPrefix}-buttons`).children(
              new Button('cancel').on('click', btnClick.bind(this, 'cancel')),
              new Button('next', 'primary').on('click', btnClick.bind(this, 'next'))
            )
          )
        ),
        h('div', `${cssPrefix}-print-content`).children(
          this.contentEl,
          h('div', '-sider').child(
            h('form', '').children(
              h('fieldset', '').children(
                h('label', '').child(`${t('print.size')}`),
                h('select', '')
                  .children(
                    ...PAGER_SIZES.map((it, index) =>
                      h('option', '')
                        .attr('value', String(index))
                        .child(`${it[0]} ( ${it[1]}''x${it[2]}'' )`)
                    )
                  )
                  .on('change', pagerSizeChange.bind(this))
              ),
              h('fieldset', '').children(
                h('label', '').child(`${t('print.orientation')}`),
                h('select', '')
                  .children(
                    ...PAGER_ORIENTATIONS.map((_it, index) =>
                      h('option', '')
                        .attr('value', String(index))
                        .child(`${(t('print.orientations') as string[])[index]}`)
                    )
                  )
                  .on('change', pagerOrientationChange.bind(this))
              )
            )
          )
        )
      )
      .hide();
  }

  resetData(data: DataProxy): void {
    this.data = data;
  }

  preview(): void {
    const { data, paper } = this;
    const { width, height, padding } = paper;
    const iwidth = width - padding * 2;
    const iheight = height - padding * 2;
    const cr = data.contentRange();
    const pages = Number.parseInt(String(cr.h / iheight), 10) + 1;
    const scale = iwidth / cr.w;
    let left = padding;
    const top = padding;
    if (scale > 1) {
      left += (iwidth - cr.w) / 2;
    }
    let ri = 0;
    let yoffset = 0;
    this.contentEl.html('');
    this.canvases = [];
    const mViewRange: ViewRange = {
      sri: 0,
      sci: 0,
      eri: 0,
      eci: 0,
    };
    for (let i = 0; i < pages; i += 1) {
      let th = 0;
      let yo = 0;
      const wrap = h('div', `${cssPrefix}-canvas-card`);
      const canvas = h('canvas', `${cssPrefix}-canvas`);
      this.canvases.push(canvas.el as HTMLCanvasElement);
      const draw = new Draw(canvas.el as HTMLCanvasElement, width, height);
      // cell-content
      draw.save();
      draw.translate(left, top);
      if (scale < 1) draw.scale(scale, scale);
      for (; ri <= cr.eri; ri += 1) {
        const rh = data.rows.getHeight(ri);
        th += rh;
        if (th < iheight) {
          for (let ci = 0; ci <= cr.eci; ci += 1) {
            renderCell(draw, data as unknown as Parameters<typeof renderCell>[1], ri, ci, yoffset);
            mViewRange.eci = ci;
          }
        } else {
          yo = -(th - rh);
          break;
        }
      }
      mViewRange.eri = ri;
      draw.restore();
      // merge-cell
      draw.save();
      draw.translate(left, top);
      if (scale < 1) draw.scale(scale, scale);
      const yof = yoffset;
      data.eachMergesInView(mViewRange, ({ sri, sci }) => {
        renderCell(draw, data as unknown as Parameters<typeof renderCell>[1], sri, sci, yof);
      });
      draw.restore();

      mViewRange.sri = mViewRange.eri;
      mViewRange.sci = mViewRange.eci;
      yoffset += yo;
      this.contentEl.child(h('div', `${cssPrefix}-canvas-card-wraper`).child(wrap.child(canvas)));
    }
    this.el.show();
  }

  toPrint(): void {
    this.el.hide();
    const { paper } = this;
    const iframe = h('iframe', '').hide();
    const { el } = iframe;
    window.document.body.appendChild(el);
    const { contentWindow } = el as HTMLIFrameElement;
    const idoc = contentWindow!.document;
    const style = document.createElement('style');
    style.innerHTML = `
      @page { size: ${paper.width}px ${paper.height}px; };
      canvas {
        page-break-before: auto;
        page-break-after: always;
        image-rendering: pixelated;
      };
    `;
    idoc.head.appendChild(style);
    this.canvases.forEach((it) => {
      const cn = it.cloneNode(false) as HTMLCanvasElement;
      const ctx = cn.getContext('2d');
      ctx!.drawImage(it, 0, 0);
      idoc.body.appendChild(cn);
    });
    contentWindow!.print();
  }
}
