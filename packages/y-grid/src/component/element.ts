export interface Offset {
  top?: number;
  left?: number;
  height?: number;
  width?: number;
}

export interface ScrollPosition {
  top?: number;
  left?: number;
}

export type ElementChild = string | Element | HTMLElement | Text | Node;

class Element {
  el: HTMLElement;
  private _data: Record<string, unknown>;

  constructor(tag: string | HTMLElement, className: string = '') {
    if (typeof tag === 'string') {
      this.el = document.createElement(tag);
      this.el.className = className;
    } else {
      this.el = tag;
    }
    this._data = {};
  }

  // Getter overload
  data(key: string): unknown;
  // Setter overload
  data(key: string, value: unknown): this;
  data(key: string, value?: unknown): this | unknown {
    if (value !== undefined) {
      this._data[key] = value;
      return this;
    }
    return this._data[key];
  }

  on(eventNames: string, handler: (evt: Event) => void): this {
    const [fen, ...oen] = eventNames.split('.');
    let eventName = fen;
    if (eventName === 'mousewheel' && /Firefox/i.test(window.navigator.userAgent)) {
      eventName = 'DOMMouseScroll';
    }
    this.el.addEventListener(eventName, (evt) => {
      handler(evt);
      for (let i = 0; i < oen.length; i += 1) {
        const k = oen[i];
        if (k === 'left' && (evt as MouseEvent).button !== 0) {
          return;
        }
        if (k === 'right' && (evt as MouseEvent).button !== 2) {
          return;
        }
        if (k === 'stop') {
          evt.stopPropagation();
        }
      }
    });
    return this;
  }

  // Getter overload
  offset(): Offset;
  // Setter overload
  offset(value: Offset): this;
  offset(value?: Offset): this | Offset {
    if (value !== undefined) {
      Object.keys(value).forEach((k) => {
        this.css(k, `${value[k as keyof Offset]}px`);
      });
      return this;
    }
    const {
      offsetTop, offsetLeft, offsetHeight, offsetWidth,
    } = this.el;
    return {
      top: offsetTop,
      left: offsetLeft,
      height: offsetHeight,
      width: offsetWidth,
    };
  }

  scroll(v?: ScrollPosition): ScrollPosition {
    const { el } = this;
    if (v !== undefined) {
      if (v.left !== undefined) {
        el.scrollLeft = v.left;
      }
      if (v.top !== undefined) {
        el.scrollTop = v.top;
      }
    }
    return { left: el.scrollLeft, top: el.scrollTop };
  }

  box(): DOMRect {
    return this.el.getBoundingClientRect();
  }

  parent(): Element {
    return new Element(this.el.parentNode as HTMLElement);
  }

  // Getter overload
  children(): NodeListOf<ChildNode>;
  // Setter overload
  children(...eles: ElementChild[]): this;
  children(...eles: ElementChild[]): this | NodeListOf<ChildNode> {
    if (eles.length === 0) {
      return this.el.childNodes;
    }
    eles.forEach(ele => this.child(ele));
    return this;
  }

  removeChild(el: HTMLElement | Node): void {
    this.el.removeChild(el);
  }

  child(arg: ElementChild): this {
    let ele: Node;
    if (typeof arg === 'string') {
      ele = document.createTextNode(arg);
    } else if (arg instanceof Element) {
      ele = arg.el;
    } else {
      ele = arg;
    }
    this.el.appendChild(ele);
    return this;
  }

  contains(ele: Node | null): boolean {
    return this.el.contains(ele);
  }

  // Getter overload
  className(): string;
  // Setter overload
  className(v: string): this;
  className(v?: string): this | string {
    if (v !== undefined) {
      this.el.className = v;
      return this;
    }
    return this.el.className;
  }

  addClass(name: string): this {
    this.el.classList.add(name);
    return this;
  }

  hasClass(name: string): boolean {
    return this.el.classList.contains(name);
  }

  removeClass(name: string): this {
    this.el.classList.remove(name);
    return this;
  }

  toggle(cls: string = 'active'): boolean {
    return this.toggleClass(cls);
  }

  toggleClass(name: string): boolean {
    return this.el.classList.toggle(name);
  }

  active(flag: boolean = true, cls: string = 'active'): this {
    if (flag) this.addClass(cls);
    else this.removeClass(cls);
    return this;
  }

  checked(flag: boolean = true): this {
    this.active(flag, 'checked');
    return this;
  }

  disabled(flag: boolean = true): this {
    if (flag) this.addClass('disabled');
    else this.removeClass('disabled');
    return this;
  }

  // Getter overload (single key)
  attr(key: string): string | null;
  // Setter overload (single key-value)
  attr(key: string, value: string): this;
  // Setter overload (object of key-values)
  attr(key: Record<string, string>): this;
  attr(key: string | Record<string, string>, value?: string): this | string | null {
    if (value !== undefined) {
      this.el.setAttribute(key as string, value);
      return this;
    }
    if (typeof key === 'string') {
      return this.el.getAttribute(key);
    }
    Object.keys(key).forEach((k) => {
      this.el.setAttribute(k, key[k]);
    });
    return this;
  }

  removeAttr(key: string): this {
    this.el.removeAttribute(key);
    return this;
  }

  // Getter overload
  html(): string;
  // Setter overload
  html(content: string): this;
  html(content?: string): this | string {
    if (content !== undefined) {
      this.el.innerHTML = content;
      return this;
    }
    return this.el.innerHTML;
  }

  // Getter overload
  val(): string;
  // Setter overload
  val(v: string): this;
  val(v?: string): this | string {
    if (v !== undefined) {
      (this.el as HTMLInputElement).value = v;
      return this;
    }
    return (this.el as HTMLInputElement).value;
  }

  focus(): void {
    this.el.focus();
  }

  cssRemoveKeys(...keys: string[]): this {
    keys.forEach(k => this.el.style.removeProperty(k));
    return this;
  }

  // Getter overload (single key)
  css(name: string): string;
  // Setter overload (single key-value)
  css(name: string, value: string): this;
  // Setter overload (object of key-values)
  css(name: Record<string, string>): this;
  css(name: string | Record<string, string>, value?: string): this | string {
    if (value === undefined && typeof name !== 'string') {
      Object.keys(name).forEach((k) => {
        (this.el.style as unknown as Record<string, string>)[k] = name[k];
      });
      return this;
    }
    if (value !== undefined) {
      (this.el.style as unknown as Record<string, string>)[name as string] = value;
      return this;
    }
    return (this.el.style as unknown as Record<string, string>)[name as string];
  }

  computedStyle(): CSSStyleDeclaration {
    return window.getComputedStyle(this.el, null);
  }

  show(): this {
    this.css('display', 'block');
    return this;
  }

  hide(): this {
    this.css('display', 'none');
    return this;
  }
}

function h(tag: string, className?: string): Element;
function h(el: HTMLElement): Element;
function h(tag: string | HTMLElement, className: string = ''): Element {
  return new Element(tag, className);
}

export {
  Element,
  h,
};
