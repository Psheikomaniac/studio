import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // Cast test block to `any` to accommodate Vitest v4 runtime options like `poolOptions`
  test: {
    environment: 'happy-dom',
    globals: true,
    pool: 'threads',
    // Run integration tests in a single worker to avoid cross-worker emulator/mock issues
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    // Avoid indefinite hangs by setting explicit timeouts
    testTimeout: 30000,
    hookTimeout: 30000,
    // Use integration setup to connect to Firebase Emulator
    setupFiles: ['./tests/integration/setup.ts'],
    include: ['tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/**/*.d.ts',
        'src/app/**/*.tsx',
        'src/components/**/*.tsx',
        'src/ai/**/*.ts',
        'node_modules/**',
      ],
      thresholds: {
        lines: 7.5,
        functions: 7.5,
        branches: 12,
        statements: 7.5,
      },
    },
  } as any,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
