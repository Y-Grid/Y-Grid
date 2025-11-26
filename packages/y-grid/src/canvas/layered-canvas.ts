/**
 * LayeredCanvas - Multi-layer canvas system for efficient rendering
 *
 * Separates static content (grid, backgrounds) from dynamic content (selection)
 * so we can redraw layers independently without full canvas redraws.
 *
 * Layer structure (bottom to top):
 * 1. Grid layer: Grid lines, cell backgrounds (rarely changes)
 * 2. Content layer: Cell content, text, borders (changes on data edit)
 * 3. Overlay layer: Selection, highlights, cursor (changes frequently)
 */

import { Draw } from './draw';

export type LayerType = 'grid' | 'content' | 'overlay';

export interface LayerConfig {
  name: LayerType;
  zIndex: number;
}

const LAYER_CONFIGS: LayerConfig[] = [
  { name: 'grid', zIndex: 0 },
  { name: 'content', zIndex: 1 },
  { name: 'overlay', zIndex: 2 },
];

export class Layer {
  readonly name: LayerType;
  readonly canvas: HTMLCanvasElement;
  readonly draw: Draw;
  private dirty = true;

  constructor(name: LayerType, width: number, height: number, zIndex: number) {
    this.name = name;
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = '0';
    this.canvas.style.top = '0';
    this.canvas.style.zIndex = String(zIndex);
    this.canvas.style.pointerEvents = name === 'overlay' ? 'none' : 'auto';
    this.draw = new Draw(this.canvas, width, height);
  }

  resize(width: number, height: number): void {
    this.draw.resize(width, height);
    this.dirty = true;
  }

  clear(): void {
    this.draw.clear();
  }

  markDirty(): void {
    this.dirty = true;
  }

  markClean(): void {
    this.dirty = false;
  }

  isDirty(): boolean {
    return this.dirty;
  }
}

export class LayeredCanvas {
  private layers: Map<LayerType, Layer> = new Map();
  private width: number;
  private height: number;

  constructor(container: HTMLElement, width: number, height: number) {
    this.width = width;
    this.height = height;

    // Set container to relative positioning for absolute layer positioning
    container.style.position = 'relative';

    // Create all layers
    for (const config of LAYER_CONFIGS) {
      const layer = new Layer(config.name, width, height, config.zIndex);
      this.layers.set(config.name, layer);
      container.appendChild(layer.canvas);
    }
  }

  /**
   * Get a specific layer
   */
  getLayer(name: LayerType): Layer {
    const layer = this.layers.get(name);
    if (!layer) {
      throw new Error(`Layer "${name}" not found`);
    }
    return layer;
  }

  /**
   * Get the Draw instance for a layer
   */
  getDraw(name: LayerType): Draw {
    return this.getLayer(name).draw;
  }

  /**
   * Resize all layers
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    for (const layer of this.layers.values()) {
      layer.resize(width, height);
    }
  }

  /**
   * Clear a specific layer
   */
  clearLayer(name: LayerType): void {
    this.getLayer(name).clear();
  }

  /**
   * Clear all layers
   */
  clearAll(): void {
    for (const layer of this.layers.values()) {
      layer.clear();
    }
  }

  /**
   * Mark a layer as dirty
   */
  markLayerDirty(name: LayerType): void {
    this.getLayer(name).markDirty();
  }

  /**
   * Mark all layers as dirty
   */
  markAllDirty(): void {
    for (const layer of this.layers.values()) {
      layer.markDirty();
    }
  }

  /**
   * Check if a layer is dirty
   */
  isLayerDirty(name: LayerType): boolean {
    return this.getLayer(name).isDirty();
  }

  /**
   * Check if any layer is dirty
   */
  isAnyDirty(): boolean {
    for (const layer of this.layers.values()) {
      if (layer.isDirty()) return true;
    }
    return false;
  }

  /**
   * Mark a layer as clean after rendering
   */
  markLayerClean(name: LayerType): void {
    this.getLayer(name).markClean();
  }

  /**
   * Mark all layers as clean
   */
  markAllClean(): void {
    for (const layer of this.layers.values()) {
      layer.markClean();
    }
  }

  /**
   * Get the canvas element for a layer (for event binding)
   */
  getCanvas(name: LayerType): HTMLCanvasElement {
    return this.getLayer(name).canvas;
  }

  /**
   * Get the top-most canvas (for event binding)
   */
  getTopCanvas(): HTMLCanvasElement {
    return this.getCanvas('overlay');
  }

  /**
   * Get the bottom-most canvas (for background events)
   */
  getBottomCanvas(): HTMLCanvasElement {
    return this.getCanvas('grid');
  }

  /**
   * Destroy all layers and clean up
   */
  destroy(): void {
    for (const layer of this.layers.values()) {
      layer.canvas.remove();
    }
    this.layers.clear();
  }

  /**
   * Get current dimensions
   */
  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}

export default LayeredCanvas;
