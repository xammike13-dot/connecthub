import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Determine backend proxy target:
  // 1. If VITE_PROXY_TARGET is explicitly specified, use it.
  // 2. If VITE_API_URL is an absolute HTTP/HTTPS URL, extract origin.
  // 3. Otherwise default to local Express backend on http://localhost:5000.
  let target = 'http://localhost:5000';
  if (env.VITE_PROXY_TARGET) {
    target = env.VITE_PROXY_TARGET.replace(/\/$/, '');
  } else if (env.VITE_API_URL && env.VITE_API_URL.startsWith('http')) {
    target = env.VITE_API_URL.replace(/\/api\/?$/, '');
  }

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    server: {
      port: 5173,
      open: false,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  };
});
