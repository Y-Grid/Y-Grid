/**
 * Performance Benchmark Suite for Y-Grid
 *
 * Run with: npx tsx tests/performance/benchmark.ts
 *
 * Tests:
 * 1. Initial render time
 * 2. Scroll performance (FPS)
 * 3. Memory usage
 * 4. Data load time
 */

// This is a Node.js script that outputs benchmark specs
// Actual browser testing should use Playwright or similar

export interface BenchmarkResult {
  name: string;
  value: number;
  unit: string;
  threshold: number;
  passed: boolean;
}

export interface PerformanceMetrics {
  initialRenderMs: number;
  scrollFps: number;
  memoryMb: number;
  loadTimeMs: number;
  cellCount: number;
}

/**
 * Performance thresholds - these should work on mid-range hardware
 * (e.g., 8GB RAM, integrated graphics)
 */
export const PERFORMANCE_THRESHOLDS = {
  // Initial render should be under 100ms for 10K rows
  INITIAL_RENDER_10K_MS: 100,

  // Initial render should be under 500ms for 100K rows
  INITIAL_RENDER_100K_MS: 500,

  // Scroll should maintain at least 30fps (ideally 60)
  MIN_SCROLL_FPS_10K: 55,
  MIN_SCROLL_FPS_100K: 30,

  // Memory usage per 1000 rows (in MB)
  MEMORY_PER_1K_ROWS_MB: 1,

  // Data load time (parsing + rendering)
  LOAD_TIME_10K_MS: 200,
  LOAD_TIME_100K_MS: 1000,
};

/**
 * Generate test data
 */
export function generateTestData(rowCount: number, colCount = 26): Record<string, unknown> {
  const rows: Record<number, { cells: Record<number, { text: string }> }> = {};

  for (let r = 0; r < rowCount; r++) {
    const cells: Record<number, { text: string }> = {};
    for (let c = 0; c < colCount; c++) {
      cells[c] = { text: `R${r}C${c}` };
    }
    rows[r] = { cells };
  }

  return {
    name: 'Benchmark',
    rows: { ...rows, len: rowCount },
    cols: { len: colCount },
  };
}

/**
 * Browser-based performance test (to be run in browser context)
 */
export const BROWSER_BENCHMARK_SCRIPT = `
async function runBenchmark(YGrid, rowCount = 10000) {
  const results = {
    rowCount,
    colCount: 26,
    metrics: {}
  };

  // Create container
  const container = document.createElement('div');
  container.style.width = '1200px';
  container.style.height = '600px';
  document.body.appendChild(container);

  // Generate data
  console.log('Generating ' + rowCount + ' rows...');
  const data = generateTestData(rowCount, 26);

  // Measure initial load time
  const loadStart = performance.now();
  const grid = new YGrid(container, {
    row: { len: rowCount, height: 25 },
    col: { len: 26, width: 100 }
  });
  grid.loadData([data]);
  const loadEnd = performance.now();
  results.metrics.loadTimeMs = loadEnd - loadStart;
  console.log('Load time: ' + results.metrics.loadTimeMs.toFixed(2) + 'ms');

  // Measure render time
  const renderStart = performance.now();
  grid.reRender();
  const renderEnd = performance.now();
  results.metrics.renderTimeMs = renderEnd - renderStart;
  console.log('Render time: ' + results.metrics.renderTimeMs.toFixed(2) + 'ms');

  // Measure scroll FPS
  results.metrics.scrollFps = await measureScrollFps(grid, container);
  console.log('Scroll FPS: ' + results.metrics.scrollFps.toFixed(1));

  // Measure memory
  if (performance.memory) {
    results.metrics.memoryMb = performance.memory.usedJSHeapSize / 1024 / 1024;
    console.log('Memory: ' + results.metrics.memoryMb.toFixed(2) + 'MB');
  }

  // Cleanup
  container.remove();

  return results;
}

async function measureScrollFps(grid, container) {
  return new Promise((resolve) => {
    let frameCount = 0;
    let lastTime = performance.now();
    const fpsSamples = [];

    const canvas = container.querySelector('canvas');
    if (!canvas) {
      resolve(0);
      return;
    }

    // Measure for 3 seconds
    const duration = 3000;
    const startTime = performance.now();
    let scrollY = 0;

    function frame(now) {
      frameCount++;

      // Calculate FPS every second
      if (now - lastTime >= 1000) {
        fpsSamples.push(frameCount);
        frameCount = 0;
        lastTime = now;
      }

      // Simulate scroll
      scrollY += 50;
      const event = new WheelEvent('wheel', {
        deltaY: 50,
        bubbles: true
      });
      canvas.dispatchEvent(event);

      if (now - startTime < duration) {
        requestAnimationFrame(frame);
      } else {
        const avgFps = fpsSamples.length > 0
          ? fpsSamples.reduce((a, b) => a + b) / fpsSamples.length
          : 0;
        resolve(avgFps);
      }
    }

    requestAnimationFrame(frame);
  });
}

function generateTestData(rowCount, colCount) {
  const rows = {};
  for (let r = 0; r < rowCount; r++) {
    const cells = {};
    for (let c = 0; c < colCount; c++) {
      cells[c] = { text: 'R' + r + 'C' + c };
    }
    rows[r] = { cells };
  }
  return {
    name: 'Benchmark',
    rows: { ...rows, len: rowCount },
    cols: { len: colCount }
  };
}
`;

/**
 * CLI output for benchmark results
 */
export function formatBenchmarkResults(results: BenchmarkResult[]): string {
  const lines = [
    '',
    '╔══════════════════════════════════════════════════════════════╗',
    '║                    Y-GRID PERFORMANCE BENCHMARK              ║',
    '╠══════════════════════════════════════════════════════════════╣',
  ];

  for (const r of results) {
    const status = r.passed ? '✓' : '✗';
    const statusColor = r.passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    const line = `║ ${statusColor}${status}${reset} ${r.name.padEnd(30)} ${String(r.value.toFixed(2)).padStart(10)} ${r.unit.padEnd(5)} (threshold: ${String(r.threshold)} ${r.unit})`;
    lines.push(`${line.padEnd(70)}║`);
  }

  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  lines.push(`Results: ${passed}/${total} passed`);

  return lines.join('\n');
}

// Export for use in browser tests
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).YGridBenchmark = {
    generateTestData,
    PERFORMANCE_THRESHOLDS,
    BROWSER_BENCHMARK_SCRIPT,
  };
}

console.log(`
Y-Grid Performance Benchmark
============================

To run benchmarks, open the demo page and paste this in the console:

${BROWSER_BENCHMARK_SCRIPT}

// Then run:
runBenchmark(YGrid, 10000).then(console.log);  // 10K rows
runBenchmark(YGrid, 100000).then(console.log); // 100K rows

Performance Thresholds:
- 10K rows: render < ${String(PERFORMANCE_THRESHOLDS.INITIAL_RENDER_10K_MS)}ms, scroll > ${String(PERFORMANCE_THRESHOLDS.MIN_SCROLL_FPS_10K)} FPS
- 100K rows: render < ${String(PERFORMANCE_THRESHOLDS.INITIAL_RENDER_100K_MS)}ms, scroll > ${String(PERFORMANCE_THRESHOLDS.MIN_SCROLL_FPS_100K)} FPS
`);
