import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/mongo': {
        target: 'http://localhost:3031',
        changeOrigin: true
      },
      '/api/audit': {
        target: 'http://localhost:8089/api/v1/audit',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/audit/, '')
      },
      '/api/pref': {
        target: 'http://localhost:8099',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pref/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
