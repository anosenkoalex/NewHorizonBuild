import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig(() => {
  const apiUrl = process.env.VITE_API_URL || '/api';
  const proxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000';

  return {
    plugins: [react()],

    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    },

    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },

    preview: { port: 4173, strictPort: true },
    base: '/',
  };
});