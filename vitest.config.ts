import * as path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve('apps/mobile/src'),
      'react-native': path.resolve('tests/stubs/react-native.ts'),
      'expo-secure-store': path.resolve('tests/stubs/expo-secure-store.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
