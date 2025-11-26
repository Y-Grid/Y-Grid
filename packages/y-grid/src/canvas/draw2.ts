class Draw {
  el: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  constructor(el: HTMLCanvasElement) {
    this.el = el;
    this.ctx = el.getContext('2d')!;
  }

  clear(): this {
    const { width, height } = this.el;
    this.ctx.clearRect(0, 0, width, height);
    return this;
  }

  attr(m: Partial<CanvasRenderingContext2D>): this {
    Object.assign(this.ctx, m);
    return this;
  }

  save(): this {
    this.ctx.save();
    this.ctx.beginPath();
    return this;
  }

  restore(): this {
    this.ctx.restore();
    return this;
  }

  beginPath(): this {
    this.ctx.beginPath();
    return this;
  }

  closePath(): this {
    this.ctx.closePath();
    return this;
  }

  measureText(text: string): TextMetrics {
    return this.ctx.measureText(text);
  }

  rect(x: number, y: number, width: number, height: number): this {
    this.ctx.rect(x, y, width, height);
    return this;
  }

  scale(x: number, y: number): this {
    this.ctx.scale(x, y);
    return this;
  }

  rotate(angle: number): this {
    this.ctx.rotate(angle);
    return this;
  }

  translate(x: number, y: number): this {
    this.ctx.translate(x, y);
    return this;
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): this {
    this.ctx.transform(a, b, c, d, e, f);
    return this;
  }

  fillRect(x: number, y: number, w: number, h: number): this {
    this.ctx.fillRect(x, y, w, h);
    return this;
  }

  strokeRect(x: number, y: number, w: number, h: number): this {
    this.ctx.strokeRect(x, y, w, h);
    return this;
  }

  fillText(text: string, x: number, y: number, maxWidth?: number): this {
    this.ctx.fillText(text, x, y, maxWidth);
    return this;
  }

  strokeText(text: string, x: number, y: number, maxWidth?: number): this {
    this.ctx.strokeText(text, x, y, maxWidth);
    return this;
  }
}

export default {};
export { Draw };
