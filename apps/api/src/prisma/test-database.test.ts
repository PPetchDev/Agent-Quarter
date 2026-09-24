import { describe, expect, it } from 'vitest';
import { assertTestDatabase, testDatabasePath } from './test-database';

describe('assertTestDatabase', () => {
  it('accepts the per-process test database', () => {
    expect(() => assertTestDatabase(`file:${testDatabasePath(123)}`)).not.toThrow();
  });

  it('rejects the dev database', () => {
    expect(() => assertTestDatabase('file:/repo/apps/api/prisma/dev.db')).toThrow(
      /non-test database/,
    );
  });

  it('rejects a query string that only mentions the test file', () => {
    const decoy = `file:/repo/apps/api/prisma/dev.db?x=${testDatabasePath(123)}`;
    expect(() => assertTestDatabase(decoy)).toThrow(/non-test database/);
  });

  it('rejects an empty url', () => {
    expect(() => assertTestDatabase('')).toThrow(/non-test database/);
  });
});
