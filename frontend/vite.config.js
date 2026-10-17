import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_PROXY_TARGET || 'http://localhost:5000';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      // In dev the API and uploaded files are proxied, so no CORS setup is needed.
      proxy: { '/api': target, '/uploads': target },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
      css: false,
      testTimeout: 20000,
    },
  };
});
