import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' keeps the build working on Vercel, GitHub Pages and any sub-path.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
