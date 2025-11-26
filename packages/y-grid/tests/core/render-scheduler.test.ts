import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RenderScheduler, throttle, debounce } from '../../src/core/render-scheduler';

// Mock requestAnimationFrame and cancelAnimationFrame for Node.js environment
let rafCallbacks: Map<number, (timestamp: number) => void>;
let rafId: number;

beforeEach(() => {
  rafCallbacks = new Map();
  rafId = 0;

  globalThis.requestAnimationFrame = vi.fn((callback: (timestamp: number) => void) => {
    const id = ++rafId;
    rafCallbacks.set(id, callback);
    // Schedule callback to run
    setTimeout(() => {
      const cb = rafCallbacks.get(id);
      if (cb) {
        rafCallbacks.delete(id);
        cb(performance.now());
      }
    }, 0);
    return id;
  });

  globalThis.cancelAnimationFrame = vi.fn((id: number) => {
    rafCallbacks.delete(id);
  });
});

afterEach(() => {
  rafCallbacks.clear();
});

describe('RenderScheduler', () => {
  let scheduler: RenderScheduler;

  beforeEach(() => {
    scheduler = new RenderScheduler();
    vi.useFakeTimers();
  });

  afterEach(() => {
    scheduler.destroy();
    vi.useRealTimers();
  });

  describe('schedule', () => {
    it('should schedule a render', () => {
      const callback = vi.fn();
      scheduler.setRenderCallback(callback);

      scheduler.schedule();
      expect(scheduler.isPending()).toBe(true);

      // Run the RAF callback
      vi.runAllTimers();
      expect(callback).toHaveBeenCalled();
    });

    it('should batch multiple schedules into one render', () => {
      const callback = vi.fn();
      scheduler.setRenderCallback(callback);

      scheduler.schedule();
      scheduler.schedule();
      scheduler.schedule();

      vi.runAllTimers();
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('scheduleTask', () => {
    it('should execute task callbacks before main render', () => {
      const order: string[] = [];
      const taskCallback = vi.fn(() => order.push('task'));
      const renderCallback = vi.fn(() => order.push('render'));

      scheduler.setRenderCallback(renderCallback);
      scheduler.scheduleTask('test', 'normal', taskCallback);

      vi.runAllTimers();

      expect(taskCallback).toHaveBeenCalled();
      expect(renderCallback).toHaveBeenCalled();
      expect(order).toEqual(['task', 'render']);
    });

    it('should execute tasks in priority order', () => {
      const order: string[] = [];

      scheduler.scheduleTask('low', 'low', () => order.push('low'));
      scheduler.scheduleTask('high', 'high', () => order.push('high'));
      scheduler.scheduleTask('normal', 'normal', () => order.push('normal'));

      vi.runAllTimers();

      expect(order).toEqual(['high', 'normal', 'low']);
    });
  });

  describe('cancelTask', () => {
    it('should cancel a specific task', () => {
      const callback = vi.fn();

      scheduler.scheduleTask('test', 'normal', callback);
      scheduler.cancelTask('test');

      vi.runAllTimers();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('cancelAll', () => {
    it('should cancel all pending tasks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      scheduler.scheduleTask('test1', 'normal', callback1);
      scheduler.scheduleTask('test2', 'normal', callback2);
      scheduler.cancelAll();

      vi.runAllTimers();

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      expect(scheduler.isPending()).toBe(false);
    });
  });

  describe('renderNow', () => {
    it('should render immediately', () => {
      const callback = vi.fn();
      scheduler.setRenderCallback(callback);

      scheduler.renderNow();

      expect(callback).toHaveBeenCalled();
      expect(scheduler.isPending()).toBe(false);
    });
  });

  describe('getPendingCount', () => {
    it('should return the number of pending tasks', () => {
      scheduler.scheduleTask('task1', 'normal', () => {});
      scheduler.scheduleTask('task2', 'normal', () => {});
      scheduler.scheduleTask('task3', 'normal', () => {});

      expect(scheduler.getPendingCount()).toBe(3);
    });

    it('should clear after render', () => {
      scheduler.scheduleTask('task1', 'normal', () => {});

      vi.runAllTimers();

      expect(scheduler.getPendingCount()).toBe(0);
    });
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call function immediately on first call', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should not call function again within limit', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call function after limit expires', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    vi.advanceTimersByTime(150);
    throttled();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should pass arguments to the function', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('arg1', 'arg2');

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not call function immediately', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();

    expect(fn).not.toHaveBeenCalled();
  });

  it('should call function after wait period', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(150);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should reset timer on subsequent calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(150);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to the function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('arg1', 'arg2');
    vi.advanceTimersByTime(150);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});
