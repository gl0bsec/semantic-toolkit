import { resolve } from 'path';
import { defineConfig } from 'vite';

const DATA_VIEWS = resolve(__dirname, '../analysis/data-views');

export default defineConfig({
  root: DATA_VIEWS,
  base: '/ui/data-views/',
  build: {
    outDir: resolve(__dirname, 'dist/data-views'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'embedding-viewer': resolve(DATA_VIEWS, 'embedding-viewer/embedding-viewer.html'),
        dashboard: resolve(DATA_VIEWS, 'dashboard/dashboard.html'),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/datasets': 'http://localhost:8080',
      '/home': 'http://localhost:8080',
      // Match any dataset path: /{name}/... but not Vite paths (/ui, /@, /node_modules, /__vite)
      '^/(?!ui/|@|node_modules/|__vite)[a-zA-Z][a-zA-Z0-9_-]+/': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
