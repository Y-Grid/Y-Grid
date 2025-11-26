import { Element } from './element';

type TouchDirection = 'left' | 'right' | 'up' | 'down';
type TouchMoveCallback = (direction: TouchDirection, distance: number, evt: TouchEvent) => void;
type EventCallback = (...args: unknown[]) => void;

interface ExtendedElement extends HTMLElement {
  xclickoutside?: (evt: MouseEvent) => void;
  xEvtUp?: (evt: MouseEvent) => void;
}

interface TouchCallbacks {
  move?: TouchMoveCallback;
  end?: TouchMoveCallback;
}

interface EventEmitter {
  readonly current: Map<string, EventCallback[]>;
  on: (eventName: string, callback: EventCallback) => boolean | undefined;
  once: (eventName: string, callback: EventCallback) => boolean | undefined;
  fire: (eventName: string, args: unknown[]) => boolean | undefined;
  removeListener: (eventName: string, callback: EventCallback) => boolean;
  removeAllListeners: () => void;
}

export function bind(target: EventTarget, name: string, fn: EventListener): void {
  target.addEventListener(name, fn);
}

export function unbind(target: EventTarget, name: string, fn: EventListener): void {
  target.removeEventListener(name, fn);
}

export function unbindClickoutside(el: Element | ExtendedElement): void {
  const element = el instanceof Element ? (el.el as ExtendedElement) : (el as ExtendedElement);
  if (element.xclickoutside) {
    unbind(window.document.body, 'click', element.xclickoutside as EventListener);
    element.xclickoutside = undefined;
  }
}

// the left mouse button: mousedown → mouseup → click
// the right mouse button: mousedown → contenxtmenu → mouseup
// the right mouse button in firefox(>65.0): mousedown → contenxtmenu → mouseup → click on window
export function bindClickoutside(el: Element, cb?: (el: Element) => void): void {
  const element = el.el as ExtendedElement;
  element.xclickoutside = (evt: MouseEvent) => {
    // ignore double click
    if (evt.detail === 2 || el.contains(evt.target as Node)) return;
    if (cb) cb(el);
    else {
      el.hide();
      unbindClickoutside(el);
    }
  };
  bind(window.document.body, 'click', element.xclickoutside as EventListener);
}

export function mouseMoveUp(
  target: EventTarget,
  movefunc: (evt: MouseEvent) => void,
  upfunc: (evt: MouseEvent) => void
): void {
  bind(target, 'mousemove', movefunc as EventListener);
  const t = target as ExtendedElement;
  t.xEvtUp = (evt: MouseEvent) => {
    unbind(target, 'mousemove', movefunc as EventListener);
    unbind(target, 'mouseup', t.xEvtUp as EventListener);
    upfunc(evt);
  };
  bind(target, 'mouseup', t.xEvtUp as EventListener);
}

function calTouchDirection(
  spanx: number,
  spany: number,
  evt: TouchEvent,
  cb: TouchMoveCallback
): void {
  let direction: TouchDirection;
  if (Math.abs(spanx) > Math.abs(spany)) {
    // horizontal
    direction = spanx > 0 ? 'right' : 'left';
    cb(direction, spanx, evt);
  } else {
    // vertical
    direction = spany > 0 ? 'down' : 'up';
    cb(direction, spany, evt);
  }
}

// cb = (direction, distance) => {}
export function bindTouch(target: EventTarget, { move, end }: TouchCallbacks): void {
  let startx = 0;
  let starty = 0;
  bind(target, 'touchstart', ((evt: TouchEvent) => {
    const { pageX, pageY } = evt.touches[0];
    startx = pageX;
    starty = pageY;
  }) as EventListener);
  bind(target, 'touchmove', ((evt: TouchEvent) => {
    if (!move) return;
    const { pageX, pageY } = evt.changedTouches[0];
    const spanx = pageX - startx;
    const spany = pageY - starty;
    if (Math.abs(spanx) > 10 || Math.abs(spany) > 10) {
      calTouchDirection(spanx, spany, evt, move);
      startx = pageX;
      starty = pageY;
    }
    evt.preventDefault();
  }) as EventListener);
  bind(target, 'touchend', ((evt: TouchEvent) => {
    if (!end) return;
    const { pageX, pageY } = evt.changedTouches[0];
    const spanx = pageX - startx;
    const spany = pageY - starty;
    calTouchDirection(spanx, spany, evt, end);
  }) as EventListener);
}

// eventemitter
export function createEventEmitter(): EventEmitter {
  const listeners = new Map<string, EventCallback[]>();

  function on(eventName: string, callback: EventCallback): boolean | undefined {
    if (listeners.has(eventName)) {
      const currentListener = listeners.get(eventName);
      if (Array.isArray(currentListener)) {
        currentListener.push(callback);
        return true;
      }
      return false;
    }
    listeners.set(eventName, [callback]);
    return undefined;
  }

  function fire(eventName: string, args: unknown[]): boolean | undefined {
    if (!listeners.has(eventName)) return undefined;
    const currentListener = listeners.get(eventName);
    if (currentListener) {
      for (const callback of currentListener) callback.call(null, ...args);
    }
    return true;
  }

  function removeListener(eventName: string, callback: EventCallback): boolean {
    if (!listeners.has(eventName)) return false;
    const currentListener = listeners.get(eventName);
    if (!currentListener) return false;
    const idx = currentListener.indexOf(callback);
    if (idx < 0) return false;
    currentListener.splice(idx, 1);
    if (listeners.get(eventName)?.length === 0) {
      listeners.delete(eventName);
    }
    return true;
  }

  function once(eventName: string, callback: EventCallback): boolean | undefined {
    const execCallback = (...args: unknown[]): void => {
      callback.call(null, ...args);
      removeListener(eventName, execCallback);
    };

    return on(eventName, execCallback);
  }

  function removeAllListeners(): void {
    listeners.clear();
  }

  return {
    get current() {
      return listeners;
    },
    on,
    once,
    fire,
    removeListener,
    removeAllListeners,
  };
}
