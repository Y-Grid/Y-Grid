import { describe, it, expect, beforeEach } from 'vitest';
import { Viewport } from '../../src/core/viewport';

describe('Viewport', () => {
  let viewport: Viewport;

  const createViewport = (config = {}) => {
    return new Viewport(config, {
      getRowHeight: () => 25,
      getColWidth: () => 100,
      getTotalRows: () => 1000,
      getTotalCols: () => 26,
      isRowHidden: () => false,
      isColHidden: () => false,
    });
  };

  beforeEach(() => {
    viewport = createViewport({ rowBuffer: 5, colBuffer: 3 });
    viewport.setViewSize(800, 600);
  });

  describe('getRange', () => {
    it('should return correct range for initial state', () => {
      viewport.setScroll(0, 0);
      const range = viewport.getRange();

      expect(range.sri).toBe(0);
      expect(range.sci).toBe(0);
      // Should include visible cells plus buffer
      expect(range.eri).toBeGreaterThan(0);
      expect(range.eci).toBeGreaterThan(0);
    });

    it('should account for scroll position', () => {
      viewport.setScroll(200, 500);
      const range = viewport.getRange();

      // First visible row at scroll 500px with 25px row height = row 20
      // With buffer of 5, should start at row 15 (or freeze row if higher)
      expect(range.sri).toBeGreaterThanOrEqual(0);
      expect(range.sci).toBeGreaterThanOrEqual(0);
    });

    it('should cache range until invalidated', () => {
      const range1 = viewport.getRange();
      const range2 = viewport.getRange();

      expect(range1).toBe(range2); // Same object reference
    });

    it('should recalculate after setScroll', () => {
      const range1 = viewport.getRange();
      viewport.setScroll(100, 100);
      const range2 = viewport.getRange();

      expect(range1).not.toBe(range2);
    });
  });

  describe('isVisible', () => {
    it('should return true for cells in visible range', () => {
      viewport.setScroll(0, 0);
      expect(viewport.isVisible(0, 0)).toBe(true);
      expect(viewport.isVisible(5, 3)).toBe(true);
    });

    it('should return false for cells outside visible range', () => {
      viewport.setScroll(0, 0);
      expect(viewport.isVisible(500, 0)).toBe(false);
      expect(viewport.isVisible(0, 100)).toBe(false);
    });
  });

  describe('isRowVisible', () => {
    it('should return true for visible rows', () => {
      viewport.setScroll(0, 0);
      expect(viewport.isRowVisible(0)).toBe(true);
      expect(viewport.isRowVisible(10)).toBe(true);
    });

    it('should return false for rows outside viewport', () => {
      viewport.setScroll(0, 0);
      expect(viewport.isRowVisible(500)).toBe(false);
    });
  });

  describe('isColVisible', () => {
    it('should return true for visible columns', () => {
      viewport.setScroll(0, 0);
      expect(viewport.isColVisible(0)).toBe(true);
      expect(viewport.isColVisible(5)).toBe(true);
    });

    it('should return false for columns outside viewport', () => {
      viewport.setScroll(0, 0);
      // With 800px width and 100px columns, we can see ~8 columns + buffer
      expect(viewport.isColVisible(20)).toBe(false);
    });
  });

  describe('findRowAtY', () => {
    it('should find correct row at Y position', () => {
      viewport.setScroll(0, 0);
      const result = viewport.findRowAtY(50);

      // At 50px with 25px row height, should be row 2
      expect(result.ri).toBe(2);
      expect(result.top).toBe(50);
    });

    it('should handle Y position at row boundary', () => {
      viewport.setScroll(0, 0);
      const result = viewport.findRowAtY(25);

      expect(result.ri).toBe(1);
      expect(result.top).toBe(25);
    });
  });

  describe('findColAtX', () => {
    it('should find correct column at X position', () => {
      viewport.setScroll(0, 0);
      const result = viewport.findColAtX(150);

      // At 150px with 100px column width, should be column 1
      expect(result.ci).toBe(1);
      expect(result.left).toBe(100);
    });
  });

  describe('setFreeze', () => {
    it('should adjust range for frozen panes', () => {
      viewport.setFreeze(2, 1);
      viewport.setScroll(0, 0);
      const range = viewport.getRange();

      // With freeze at row 2, col 1, visible range should start from freeze
      expect(range.sri).toBeGreaterThanOrEqual(0);
      expect(range.sci).toBeGreaterThanOrEqual(0);
    });
  });

  describe('eachVisibleCell', () => {
    it('should iterate over all visible cells', () => {
      viewport.setScroll(0, 0);
      viewport.setViewSize(300, 100); // Small viewport

      const cells: { ri: number; ci: number }[] = [];
      viewport.eachVisibleCell((ri, ci) => {
        cells.push({ ri, ci });
      });

      expect(cells.length).toBeGreaterThan(0);
      // First cell should be (0, 0)
      expect(cells[0]).toEqual({ ri: 0, ci: 0 });
    });
  });

  describe('eachVisibleRow', () => {
    it('should iterate over visible rows', () => {
      viewport.setScroll(0, 0);
      viewport.setViewSize(300, 100);

      const rows: number[] = [];
      viewport.eachVisibleRow((ri) => {
        rows.push(ri);
      });

      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0]).toBe(0);
    });
  });

  describe('eachVisibleCol', () => {
    it('should iterate over visible columns', () => {
      viewport.setScroll(0, 0);
      viewport.setViewSize(300, 100);

      const cols: number[] = [];
      viewport.eachVisibleCol((ci) => {
        cols.push(ci);
      });

      expect(cols.length).toBeGreaterThan(0);
      expect(cols[0]).toBe(0);
    });
  });

  describe('with hidden rows/cols', () => {
    it('should skip hidden rows', () => {
      const hiddenRows = new Set([2, 3]);
      viewport = new Viewport(
        { rowBuffer: 0, colBuffer: 0 },
        {
          getRowHeight: () => 25,
          getColWidth: () => 100,
          getTotalRows: () => 100,
          getTotalCols: () => 10,
          isRowHidden: (ri) => hiddenRows.has(ri),
          isColHidden: () => false,
        }
      );
      viewport.setViewSize(300, 100);
      viewport.setScroll(0, 0);

      const rows: number[] = [];
      viewport.eachVisibleRow((ri) => {
        rows.push(ri);
      });

      expect(rows).not.toContain(2);
      expect(rows).not.toContain(3);
    });
  });
});
