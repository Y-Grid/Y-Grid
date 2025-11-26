import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.{js,ts}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,ts}'],
    },
  },
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      fileName: 'y-grid',
      formats: ['es'],
    },
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        exports: 'named',
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.[0] === 'style.css') return 'y-grid.css';
          return assetInfo.names?.[0] || 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  css: {
    preprocessorOptions: {
      less: {},
    },
  },
  server: {
    port: 8080,
    open: '/demo/index.html',
  },
  preview: {
    port: 8080,
    open: '/demo/index.html',
  },
});
