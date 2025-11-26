import { describe, it, expect, beforeEach } from 'vitest';
import { DirtyTracker } from '../../src/core/dirty-tracker';
import { CellRange } from '../../src/core/cell-range';

describe('DirtyTracker', () => {
  let tracker: DirtyTracker;

  beforeEach(() => {
    tracker = new DirtyTracker();
  });

  describe('initial state', () => {
    it('should not be dirty initially', () => {
      expect(tracker.isDirty()).toBe(false);
    });

    it('should have clean state', () => {
      const state = tracker.getState();
      expect(state.isDirty).toBe(false);
      expect(state.needsFullRedraw).toBe(false);
      expect(state.regions).toHaveLength(0);
    });
  });

  describe('markAll', () => {
    it('should mark everything dirty', () => {
      tracker.markAll();

      const state = tracker.getState();
      expect(state.isDirty).toBe(true);
      expect(state.needsFullRedraw).toBe(true);
      expect(state.selectionDirty).toBe(true);
      expect(state.headersDirty).toBe(true);
      expect(state.gridDirty).toBe(true);
    });
  });

  describe('markCell', () => {
    it('should mark a single cell dirty', () => {
      tracker.markCell(5, 3);

      expect(tracker.isDirty()).toBe(true);
      expect(tracker.isCellDirty(5, 3)).toBe(true);
    });

    it('should not affect other cells', () => {
      tracker.markCell(5, 3);

      expect(tracker.isCellDirty(0, 0)).toBe(false);
      expect(tracker.isCellDirty(10, 10)).toBe(false);
    });
  });

  describe('markRange', () => {
    it('should mark a range of cells dirty', () => {
      const range = new CellRange(2, 3, 5, 6);
      tracker.markRange(range);

      expect(tracker.isDirty()).toBe(true);
      expect(tracker.isCellDirty(3, 4)).toBe(true);
      expect(tracker.isCellDirty(5, 6)).toBe(true);
    });

    it('should not mark cells outside range', () => {
      const range = new CellRange(2, 3, 5, 6);
      tracker.markRange(range);

      expect(tracker.isCellDirty(0, 0)).toBe(false);
      expect(tracker.isCellDirty(10, 10)).toBe(false);
    });
  });

  describe('markRows', () => {
    it('should mark entire rows dirty', () => {
      tracker.markRows(3, 5);

      const state = tracker.getState();
      expect(state.isDirty).toBe(true);
      expect(state.headersDirty).toBe(true);
    });
  });

  describe('markCols', () => {
    it('should mark entire columns dirty', () => {
      tracker.markCols(2, 4);

      const state = tracker.getState();
      expect(state.isDirty).toBe(true);
      expect(state.headersDirty).toBe(true);
    });
  });

  describe('markSelection', () => {
    it('should mark selection dirty', () => {
      tracker.markSelection();

      const state = tracker.getState();
      expect(state.selectionDirty).toBe(true);
      expect(state.isDirty).toBe(true);
    });
  });

  describe('markScroll', () => {
    it('should mark scroll as dirty', () => {
      tracker.markScroll();

      const state = tracker.getState();
      expect(state.isDirty).toBe(true);
      expect(state.headersDirty).toBe(true);
    });

    it('should make all cells dirty during scroll', () => {
      tracker.markScroll();

      // Any cell should be considered dirty during scroll
      expect(tracker.isCellDirty(0, 0)).toBe(true);
      expect(tracker.isCellDirty(100, 100)).toBe(true);
    });
  });

  describe('markGrid', () => {
    it('should mark grid lines dirty', () => {
      tracker.markGrid();

      const state = tracker.getState();
      expect(state.gridDirty).toBe(true);
      expect(state.isDirty).toBe(true);
    });
  });

  describe('markHeaders', () => {
    it('should mark headers dirty', () => {
      tracker.markHeaders();

      const state = tracker.getState();
      expect(state.headersDirty).toBe(true);
      expect(state.isDirty).toBe(true);
    });
  });

  describe('isRangeDirty', () => {
    it('should return true if range intersects dirty region', () => {
      tracker.markRange(new CellRange(5, 5, 10, 10));

      const testRange = new CellRange(8, 8, 15, 15);
      expect(tracker.isRangeDirty(testRange)).toBe(true);
    });

    it('should return false if range does not intersect', () => {
      tracker.markRange(new CellRange(5, 5, 10, 10));

      const testRange = new CellRange(20, 20, 25, 25);
      expect(tracker.isRangeDirty(testRange)).toBe(false);
    });

    it('should return true if full redraw needed', () => {
      tracker.markAll();

      const testRange = new CellRange(100, 100, 200, 200);
      expect(tracker.isRangeDirty(testRange)).toBe(true);
    });
  });

  describe('getDirtyBounds', () => {
    it('should return null for full redraw', () => {
      tracker.markAll();
      expect(tracker.getDirtyBounds()).toBeNull();
    });

    it('should return null for no dirty regions', () => {
      expect(tracker.getDirtyBounds()).toBeNull();
    });

    it('should return bounding box of dirty regions', () => {
      tracker.markRange(new CellRange(2, 3, 5, 6));
      tracker.markRange(new CellRange(10, 8, 12, 15));

      const bounds = tracker.getDirtyBounds();
      expect(bounds).not.toBeNull();
      expect(bounds!.sri).toBe(2);
      expect(bounds!.sci).toBe(3);
      expect(bounds!.eri).toBe(12);
      expect(bounds!.eci).toBe(15);
    });
  });

  describe('clear', () => {
    it('should clear all dirty flags', () => {
      tracker.markAll();
      tracker.clear();

      const state = tracker.getState();
      expect(state.isDirty).toBe(false);
      expect(state.needsFullRedraw).toBe(false);
      expect(state.regions).toHaveLength(0);
      expect(state.selectionDirty).toBe(false);
      expect(state.headersDirty).toBe(false);
      expect(state.gridDirty).toBe(false);
    });
  });

  describe('clearSelection', () => {
    it('should only clear selection flag', () => {
      tracker.markSelection();
      tracker.markHeaders();
      tracker.clearSelection();

      const state = tracker.getState();
      expect(state.selectionDirty).toBe(false);
      expect(state.headersDirty).toBe(true);
    });
  });

  describe('region merging', () => {
    it('should merge overlapping regions of same type', () => {
      tracker.markRange(new CellRange(2, 2, 5, 5));
      tracker.markRange(new CellRange(4, 4, 8, 8));

      const state = tracker.getState();
      // Should have merged into one region
      expect(state.regions.length).toBe(1);
      expect(state.regions[0].range!.sri).toBe(2);
      expect(state.regions[0].range!.eci).toBe(8);
    });

    it('should switch to full redraw with too many regions', () => {
      // Add more than 50 non-overlapping regions
      for (let i = 0; i < 60; i++) {
        tracker.markCell(i * 10, i * 10);
      }

      const state = tracker.getState();
      expect(state.needsFullRedraw).toBe(true);
    });
  });
});
