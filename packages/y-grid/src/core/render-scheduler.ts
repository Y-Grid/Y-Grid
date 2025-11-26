/**
 * RenderScheduler - Batches render requests using requestAnimationFrame
 *
 * Instead of rendering on every event, this queues render requests
 * and batches them into single animation frames for smooth 60fps.
 */

export type RenderPriority = 'high' | 'normal' | 'low';

export interface RenderTask {
  id: string;
  priority: RenderPriority;
  callback: () => void;
  timestamp: number;
}

const PRIORITY_ORDER: Record<RenderPriority, number> = {
  high: 0, // Selection, cursor - must be responsive
  normal: 1, // Cell content changes
  low: 2, // Grid lines, backgrounds
};

export class RenderScheduler {
  private pending = false;
  private rafId: number | null = null;
  private tasks: Map<string, RenderTask> = new Map();
  private onRender: (() => void) | null = null;

  // Performance tracking
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private fps = 0;

  /**
   * Set the main render callback
   */
  setRenderCallback(callback: () => void): void {
    this.onRender = callback;
  }

  /**
   * Schedule a render with default priority
   */
  schedule(): void {
    this.scheduleTask('default', 'normal', () => {});
  }

  /**
   * Schedule a specific render task
   */
  scheduleTask(id: string, priority: RenderPriority, callback: () => void): void {
    // Update or add the task
    this.tasks.set(id, {
      id,
      priority,
      callback,
      timestamp: performance.now(),
    });

    this.requestFrame();
  }

  /**
   * Schedule a high-priority render (selection, cursor)
   */
  scheduleHighPriority(id: string, callback: () => void): void {
    this.scheduleTask(id, 'high', callback);
  }

  /**
   * Schedule a normal-priority render (content)
   */
  scheduleNormal(id: string, callback: () => void): void {
    this.scheduleTask(id, 'normal', callback);
  }

  /**
   * Schedule a low-priority render (grid, backgrounds)
   */
  scheduleLow(id: string, callback: () => void): void {
    this.scheduleTask(id, 'low', callback);
  }

  /**
   * Cancel a scheduled task
   */
  cancelTask(id: string): void {
    this.tasks.delete(id);
  }

  /**
   * Cancel all pending renders
   */
  cancelAll(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pending = false;
    this.tasks.clear();
  }

  /**
   * Force an immediate render (bypasses RAF)
   */
  renderNow(): void {
    this.cancelAll();
    this.executeRender();
  }

  /**
   * Check if a render is pending
   */
  isPending(): boolean {
    return this.pending;
  }

  /**
   * Get current FPS
   */
  getFps(): number {
    return this.fps;
  }

  /**
   * Get the number of pending tasks
   */
  getPendingCount(): number {
    return this.tasks.size;
  }

  /**
   * Request an animation frame if not already pending
   */
  private requestFrame(): void {
    if (this.pending) return;

    this.pending = true;
    this.rafId = requestAnimationFrame((timestamp) => {
      this.onFrame(timestamp);
    });
  }

  /**
   * Handle animation frame
   */
  private onFrame(timestamp: number): void {
    this.pending = false;
    this.rafId = null;

    // Update FPS counter
    this.frameCount++;
    if (timestamp - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = timestamp;
    }

    this.executeRender();
  }

  /**
   * Execute all pending render tasks
   */
  private executeRender(): void {
    if (this.tasks.size === 0 && !this.onRender) return;

    // Sort tasks by priority
    const sortedTasks = Array.from(this.tasks.values()).sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    );

    // Execute task callbacks
    for (const task of sortedTasks) {
      task.callback();
    }

    // Clear tasks
    this.tasks.clear();

    // Execute main render callback
    if (this.onRender) {
      this.onRender();
    }
  }

  /**
   * Destroy the scheduler
   */
  destroy(): void {
    this.cancelAll();
    this.onRender = null;
  }
}

/**
 * Throttle helper - limits function execution to once per interval
 */
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastRun = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = limit - (now - lastRun);

    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastRun = now;
      func(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastRun = Date.now();
        timeout = null;
        func(...args);
      }, remaining);
    }
  };
}

/**
 * Debounce helper - delays function execution until after wait period
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      timeout = null;
      func(...args);
    }, wait);
  };
}

export default RenderScheduler;
