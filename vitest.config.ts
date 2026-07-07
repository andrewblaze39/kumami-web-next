import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Stub out `server-only` in the test environment so modules that import
      // it (cache.ts, gating.ts) can be unit-tested without Next.js scaffolding.
      'server-only': path.resolve(__dirname, './src/__mocks__/server-only.ts'),
    },
  },
});
