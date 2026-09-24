import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

const TEST_DATABASE_FILE = /^squad-api-test-\d+\.db$/;

/** Per-process SQLite file, so concurrent test runs never share or delete each other's database. */
export function testDatabasePath(pid: number = process.pid): string {
  return join(tmpdir(), `squad-api-test-${pid}.db`);
}

/** Throws unless `url` points at a test database created by `test/global-setup.ts`. */
export function assertTestDatabase(url: string | undefined = process.env.DATABASE_URL): void {
  const filePath = (url ?? '').replace(/^file:/, '').split('?')[0] ?? '';
  const isTestDatabase =
    dirname(filePath) === tmpdir() && TEST_DATABASE_FILE.test(basename(filePath));
  if (!isTestDatabase) {
    throw new Error(`Refusing to use non-test database: ${url || '(unset)'}`);
  }
}
