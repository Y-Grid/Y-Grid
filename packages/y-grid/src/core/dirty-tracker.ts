/**
 * DirtyTracker - Tracks which regions of the grid need to be redrawn
 *
 * Instead of redrawing the entire canvas on every change, this tracks
 * dirty regions and enables partial redraws for better performance.
 */

import { CellRange } from './cell-range';

export type DirtyType =
  | 'all' // Full redraw needed
  | 'cells' // Specific cells changed
  | 'rows' // Entire rows changed
  | 'cols' // Entire columns changed
  | 'selection' // Selection overlay changed
  | 'scroll' // Scroll position changed
  | 'grid' // Grid lines changed
  | 'headers'; // Row/column headers changed

export interface DirtyRegion {
  type: DirtyType;
  range: CellRange | null;
  timestamp: number;
}

export interface DirtyState {
  /** Whether any region is dirty */
  isDirty: boolean;
  /** Whether a full redraw is needed */
  needsFullRedraw: boolean;
  /** Dirty regions that need partial redraw */
  regions: DirtyRegion[];
  /** Whether selection overlay needs redraw */
  selectionDirty: boolean;
  /** Whether headers need redraw */
  headersDirty: boolean;
  /** Whether grid lines need redraw */
  gridDirty: boolean;
}

export class DirtyTracker {
  private regions: DirtyRegion[] = [];
  private fullRedrawNeeded = false;
  private selectionDirty = false;
  private headersDirty = false;
  private gridDirty = false;

  /**
   * Mark the entire canvas as dirty (full redraw)
   */
  markAll(): void {
    this.fullRedrawNeeded = true;
    this.regions = [];
    this.selectionDirty = true;
    this.headersDirty = true;
    this.gridDirty = true;
  }

  /**
   * Mark a specific cell as dirty
   */
  markCell(ri: number, ci: number): void {
    if (this.fullRedrawNeeded) return;
    this.addRegion('cells', new CellRange(ri, ci, ri, ci));
  }

  /**
   * Mark a range of cells as dirty
   */
  markRange(range: CellRange): void {
    if (this.fullRedrawNeeded) return;
    this.addRegion('cells', range);
  }

  /**
   * Mark entire rows as dirty
   */
  markRows(startRow: number, endRow: number): void {
    if (this.fullRedrawNeeded) return;
    this.addRegion('rows', new CellRange(startRow, 0, endRow, Number.MAX_SAFE_INTEGER));
    this.headersDirty = true;
  }

  /**
   * Mark entire columns as dirty
   */
  markCols(startCol: number, endCol: number): void {
    if (this.fullRedrawNeeded) return;
    this.addRegion('cols', new CellRange(0, startCol, Number.MAX_SAFE_INTEGER, endCol));
    this.headersDirty = true;
  }

  /**
   * Mark selection as dirty
   */
  markSelection(): void {
    this.selectionDirty = true;
  }

  /**
   * Mark scroll as dirty (triggers visible region redraw)
   */
  markScroll(): void {
    // Scrolling requires redrawing the content area
    if (this.fullRedrawNeeded) return;
    this.addRegion('scroll', null);
    this.headersDirty = true;
  }

  /**
   * Mark grid lines as dirty
   */
  markGrid(): void {
    this.gridDirty = true;
  }

  /**
   * Mark headers as dirty
   */
  markHeaders(): void {
    this.headersDirty = true;
  }

  /**
   * Get the current dirty state
   */
  getState(): DirtyState {
    return {
      isDirty:
        this.fullRedrawNeeded ||
        this.regions.length > 0 ||
        this.selectionDirty ||
        this.headersDirty ||
        this.gridDirty,
      needsFullRedraw: this.fullRedrawNeeded,
      regions: [...this.regions],
      selectionDirty: this.selectionDirty,
      headersDirty: this.headersDirty,
      gridDirty: this.gridDirty,
    };
  }

  /**
   * Check if anything is dirty
   */
  isDirty(): boolean {
    return (
      this.fullRedrawNeeded ||
      this.regions.length > 0 ||
      this.selectionDirty ||
      this.headersDirty ||
      this.gridDirty
    );
  }

  /**
   * Check if a specific cell is dirty
   */
  isCellDirty(ri: number, ci: number): boolean {
    if (this.fullRedrawNeeded) return true;

    for (const region of this.regions) {
      if (region.range?.includes(ri, ci)) {
        return true;
      }
      if (region.type === 'scroll') {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a range intersects with any dirty region
   */
  isRangeDirty(range: CellRange): boolean {
    if (this.fullRedrawNeeded) return true;

    for (const region of this.regions) {
      if (region.range?.intersects(range)) {
        return true;
      }
      if (region.type === 'scroll') {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the bounding box of all dirty regions
   */
  getDirtyBounds(): CellRange | null {
    if (this.fullRedrawNeeded || this.regions.length === 0) {
      return null;
    }

    let minRi = Number.MAX_SAFE_INTEGER;
    let minCi = Number.MAX_SAFE_INTEGER;
    let maxRi = 0;
    let maxCi = 0;

    for (const region of this.regions) {
      if (region.range) {
        minRi = Math.min(minRi, region.range.sri);
        minCi = Math.min(minCi, region.range.sci);
        maxRi = Math.max(maxRi, region.range.eri);
        maxCi = Math.max(maxCi, region.range.eci);
      }
    }

    if (minRi === Number.MAX_SAFE_INTEGER) {
      return null;
    }

    return new CellRange(minRi, minCi, maxRi, maxCi);
  }

  /**
   * Clear all dirty flags (call after rendering)
   */
  clear(): void {
    this.regions = [];
    this.fullRedrawNeeded = false;
    this.selectionDirty = false;
    this.headersDirty = false;
    this.gridDirty = false;
  }

  /**
   * Clear only selection dirty flag
   */
  clearSelection(): void {
    this.selectionDirty = false;
  }

  /**
   * Clear only headers dirty flag
   */
  clearHeaders(): void {
    this.headersDirty = false;
  }

  /**
   * Clear only grid dirty flag
   */
  clearGrid(): void {
    this.gridDirty = false;
  }

  /**
   * Add a dirty region, merging with existing overlapping regions
   */
  private addRegion(type: DirtyType, range: CellRange | null): void {
    // If we have too many regions, switch to full redraw
    if (this.regions.length > 50) {
      this.markAll();
      return;
    }

    // Try to merge with existing region of same type
    if (range) {
      for (const existing of this.regions) {
        if (existing.type === type && existing.range?.intersects(range)) {
          existing.range = existing.range.union(range);
          existing.timestamp = Date.now();
          return;
        }
      }
    }

    this.regions.push({
      type,
      range,
      timestamp: Date.now(),
    });
  }
}

export default DirtyTracker;
