import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import { testDatabasePath } from '../src/prisma/test-database';

const API_ROOT = fileURLToPath(new URL('..', import.meta.url));
const TEST_DATABASE_PATH = testDatabasePath();

export const TEST_DATABASE_URL = `file:${TEST_DATABASE_PATH}`;

function removeTestDatabase() {
  rmSync(TEST_DATABASE_PATH, { force: true });
  rmSync(`${TEST_DATABASE_PATH}-journal`, { force: true });
}

// Create this run's isolated database from migrations so tests never touch prisma/dev.db;
// the returned teardown deletes it.
export default function setup() {
  removeTestDatabase();

  const prismaCli = createRequire(import.meta.url).resolve('prisma/build/index.js');
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: API_ROOT,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  });

  return removeTestDatabase;
}
