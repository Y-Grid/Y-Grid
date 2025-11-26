import { cssPrefix } from '../config';
import { type Element, h } from './element';
import { mouseMoveUp } from './event';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  ri?: number;
  ci?: number;
}

interface Line {
  width: number;
  height: number;
}

type FinishedCallback = (rect: Rect, distance: number) => void;
type UnhideCallback = (index: number) => void;

export default class Resizer {
  moving: boolean;
  vertical: boolean;
  el: Element;
  unhideHoverEl: Element;
  hoverEl: Element;
  lineEl: Element;
  cRect: Rect | null;
  finishedFn: FinishedCallback | null;
  minDistance: number;
  unhideFn: UnhideCallback;
  unhideIndex?: number;

  constructor(vertical: boolean, minDistance: number) {
    this.moving = false;
    this.vertical = vertical;
    this.unhideHoverEl = h('div', `${cssPrefix}-resizer-hover`)
      .on('dblclick.stop', (evt) => this.mousedblclickHandler(evt))
      .css('position', 'absolute')
      .hide();
    this.hoverEl = h('div', `${cssPrefix}-resizer-hover`).on('mousedown.stop', (evt) =>
      this.mousedownHandler(evt as MouseEvent)
    );
    this.lineEl = h('div', `${cssPrefix}-resizer-line`).hide();
    this.el = h('div', `${cssPrefix}-resizer ${vertical ? 'vertical' : 'horizontal'}`)
      .children(this.unhideHoverEl, this.hoverEl, this.lineEl)
      .hide();
    // cell rect
    this.cRect = null;
    this.finishedFn = null;
    this.minDistance = minDistance;
    this.unhideFn = () => {};
  }

  showUnhide(index: number): void {
    this.unhideIndex = index;
    this.unhideHoverEl.show();
  }

  hideUnhide(): void {
    this.unhideHoverEl.hide();
  }

  // rect : {top, left, width, height}
  // line : {width, height}
  show(rect: Rect, line: Line): void {
    const { moving, vertical, hoverEl, lineEl, el, unhideHoverEl } = this;
    if (moving) return;
    this.cRect = rect;
    const { left, top, width, height } = rect;
    el.offset({
      left: vertical ? left + width - 5 : left,
      top: vertical ? top : top + height - 5,
    }).show();
    hoverEl.offset({
      width: vertical ? 5 : width,
      height: vertical ? height : 5,
    });
    lineEl.offset({
      width: vertical ? 0 : line.width,
      height: vertical ? line.height : 0,
    });
    unhideHoverEl.offset({
      left: vertical ? 5 - width : left,
      top: vertical ? top : 5 - height,
      width: vertical ? 5 : width,
      height: vertical ? height : 5,
    });
  }

  hide(): void {
    this.el
      .offset({
        left: 0,
        top: 0,
      })
      .hide();
    this.hideUnhide();
  }

  mousedblclickHandler(_evt?: Event): void {
    if (this.unhideIndex) this.unhideFn(this.unhideIndex);
  }

  mousedownHandler(evt: MouseEvent): void {
    let startEvt: MouseEvent | null = evt;
    const { el, lineEl, cRect, vertical, minDistance } = this;
    if (!cRect) return;
    let distance = vertical ? cRect.width : cRect.height;
    lineEl.show();
    mouseMoveUp(
      window,
      (e: MouseEvent) => {
        this.moving = true;
        if (startEvt !== null && e.buttons === 1) {
          if (vertical) {
            distance += e.movementX;
            if (distance > minDistance) {
              el.css('left', `${cRect.left + distance}px`);
            }
          } else {
            distance += e.movementY;
            if (distance > minDistance) {
              el.css('top', `${cRect.top + distance}px`);
            }
          }
          startEvt = e;
        }
      },
      () => {
        startEvt = null;
        lineEl.hide();
        this.moving = false;
        this.hide();
        if (this.finishedFn) {
          if (distance < minDistance) distance = minDistance;
          this.finishedFn(cRect, distance);
        }
      }
    );
  }
}
