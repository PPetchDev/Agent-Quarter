import { defineConfig } from 'vitest/config';
import { TEST_DATABASE_URL } from './test/global-setup';

export default defineConfig({
  test: {
    env: { DATABASE_URL: TEST_DATABASE_URL },
    globalSetup: ['./test/global-setup.ts'],
  },
});
