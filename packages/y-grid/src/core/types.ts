// font.js
/**
 * px for fontSize
 */
export type FontSizePX = number;

/**
 * pt for fontSize
 */
export type FontSizePT = number;

/**
 * Base font definition
 */
export interface BaseFont {
  /** inner key */
  key: string;
  /** title for display */
  title: string;
}

/**
 * Font size mapping
 */
export interface FontSize {
  pt: FontSizePT;
  px: FontSizePX;
}

// alphabet.js
/**
 * A1 tag for XY-tag (0, 0)
 * @example "A1"
 */
export type TagA1 = string;

/**
 * XY tag tuple
 * @example [0, 0]
 */
export type TagXY = [number, number];

// Cell types
export interface CellStyle {
  bgcolor?: string;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  textwrap?: boolean;
  strike?: boolean;
  underline?: boolean;
  color?: string;
  format?: string;
  border?: {
    left?: [string, string];
    right?: [string, string];
    top?: [string, string];
    bottom?: [string, string];
  };
  font?: {
    name?: string;
    size?: number;
    bold?: boolean;
    italic?: boolean;
  };
  [key: string]: unknown;
}

export interface Cell {
  text?: string;
  value?: unknown;
  style?: number;
  merge?: [number, number];
  editable?: boolean;
}

export interface Row {
  height?: number;
  style?: number;
  hide?: boolean;
  cells: Record<string, Cell>;
}

export interface Col {
  width?: number;
  style?: number;
  hide?: boolean;
}

export interface RowData {
  len: number;
  [key: string]: Row | number;
}

export interface ColData {
  len: number;
  [key: string]: Col | number;
}
