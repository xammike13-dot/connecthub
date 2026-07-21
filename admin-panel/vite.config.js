import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBase = (env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
  const backendTarget = apiBase.replace(/\/api$/, '');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    server: {
      port: 3001,
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
