/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts', 'scripts/**/*.test.ts', 'src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: { name: 'dom', environment: 'happy-dom', include: ['tests/dom/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'content',
          environment: 'node',
          include: ['tests/content/**/*.test.ts'],
          testTimeout: 60_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts', 'src/i18n/**/*.ts', 'scripts/**/*.ts'],
      exclude: ['**/*.test.ts', 'scripts/ci/**'],
    },
  },
});
