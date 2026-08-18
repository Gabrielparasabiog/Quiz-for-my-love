import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/Quiz-for-my-love/',
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
  },
});
