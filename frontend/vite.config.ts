import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Suppress terminal shortcuts menu
    hmr: {
      overlay: true,
    },
  },
  clearScreen: false, // Prevent Vite from clearing terminal on restart
});
