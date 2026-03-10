import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/ui/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        viewer: resolve(__dirname, 'src/viewer/viewer.html'),
        dashboard: resolve(__dirname, 'src/dashboard/dashboard.html'),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/datasets': 'http://localhost:8080',
      '/home': 'http://localhost:8080',
      // Proxy dataset index/analysis pages to the Python server
      '^/[A-Z][A-Z0-9_]+/': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
