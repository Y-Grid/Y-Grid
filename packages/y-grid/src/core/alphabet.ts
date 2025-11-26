const alphabets = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

/**
 * Convert column index to letter(s)
 * @example stringAt(0) => 'A', stringAt(26) => 'AA'
 */
export function stringAt(index: number): string {
  let str = '';
  let cindex = index;
  while (cindex >= alphabets.length) {
    cindex /= alphabets.length;
    cindex -= 1;
    str += alphabets[Math.floor(cindex) % alphabets.length];
  }
  const last = index % alphabets.length;
  str += alphabets[last];
  return str;
}

/**
 * Convert column letter(s) to index
 * @example indexAt('A') => 0, indexAt('AA') => 26
 */
export function indexAt(str: string): number {
  let ret = 0;
  for (let i = 0; i !== str.length; ++i) {
    ret = 26 * ret + str.charCodeAt(i) - 64;
  }
  return ret - 1;
}

/**
 * Convert A1-notation to [column, row] tuple
 * @example expr2xy('B10') => [1, 9]
 */
export function expr2xy(src: string): [number, number] {
  let x = '';
  let y = '';
  for (let i = 0; i < src.length; i += 1) {
    if (src.charAt(i) >= '0' && src.charAt(i) <= '9') {
      y += src.charAt(i);
    } else {
      x += src.charAt(i);
    }
  }
  return [indexAt(x), parseInt(y, 10) - 1];
}

/**
 * Convert [column, row] to A1-notation
 * @example xy2expr(1, 9) => 'B10'
 */
export function xy2expr(x: number, y: number): string {
  return `${stringAt(x)}${y + 1}`;
}

/**
 * Translate A1-notation by offset
 * @example expr2expr('A1', 1, 1) => 'B2'
 */
export function expr2expr(
  src: string,
  xn: number,
  yn: number,
  condition: (x: number, y: number) => boolean = () => true
): string {
  if (xn === 0 && yn === 0) return src;
  const [x, y] = expr2xy(src);
  if (!condition(x, y)) return src;
  return xy2expr(x + xn, y + yn);
}

export default {
  stringAt,
  indexAt,
  expr2xy,
  xy2expr,
  expr2expr,
};
