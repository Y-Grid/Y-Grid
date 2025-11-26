import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    include: ["test/**/*_test.js"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
    },
  },
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/index.js"),
      name: "y_grid",
      fileName: "y-grid",
      formats: ["es"],
    },
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        exports: "named",
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.[0] === "style.css") return "y-grid.css";
          return assetInfo.names?.[0] || "assets/[name]-[hash][extname]";
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
    open: true,
  },
});
