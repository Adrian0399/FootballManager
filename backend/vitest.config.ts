import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tests live next to the code they cover.
    include: ['src/**/*.test.ts'],
    environment: 'node',
    reporters: 'default',
  },
});