import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  return {
  plugins: [react()],
  // Public base path. Empty for local dev and for hosts that serve the app
  // at the domain root; set it to "/<repo>/" when publishing to GitHub
  // Pages (e.g. VITE_BASE_PATH=/FootballManager/).
  base: env.VITE_BASE_PATH ?? '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Sourcemaps only outside production so we do not ship them publicly.
    sourcemap: mode !== 'production',
    rollupOptions: {
      output: {
        // Long-lived vendor code stays cached across deploys and is not
        // re-downloaded with every lazy page chunk.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          http: ['axios'],
        },
      },
    },
  },
  };
});