import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    environmentMatchGlobs: [['src/player/**', 'jsdom'], ['**/*.test.tsx', 'jsdom']],
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['node_modules/**', '.claude/**', 'dist/**'],
  },
});
