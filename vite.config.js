import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' && !process.env.VERCEL ? '/nike-3d-store/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    open: false
  }
}));
