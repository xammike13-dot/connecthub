import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rawApiBase = env.VITE_API_URL || 'http://127.0.0.1:5000/api';
  const apiBase = rawApiBase.replace(/\/$/, '');
  const backendTarget = apiBase
    .replace(/\/api$/, '')
    .replace('://localhost:', '://127.0.0.1:');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  };
});