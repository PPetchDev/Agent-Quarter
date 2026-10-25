# Contributing to Agent Quarter

Thanks for improving Agent Quarter. Project welcomes bug reports, documentation, tests, UX ideas, and focused code changes.

## Before opening work

1. Search existing issues and pull requests.
2. Open an issue first for features or changes spanning multiple areas.
3. Keep pull requests focused. Include tests when behavior changes.
4. Do not include API keys, local databases, generated build output, or assets without redistribution rights.

## Local setup

```bash
pnpm install
cp .env.example apps/api/.env
pnpm dev
```

See [README.md](README.md) for configuration. Keep API on `127.0.0.1`; it is not authenticated.

## Validation

Run checks relevant to your change before opening a pull request:

```bash
pnpm test
pnpm typecheck
```

## Pull request checklist

- [ ] Change has a clear problem statement.
- [ ] Tests added or updated when behavior changed.
- [ ] `pnpm test` and `pnpm typecheck` pass locally.
- [ ] No secrets, database files, or unrelated formatting changes included.
- [ ] Documentation updated when setup, behavior, or public API changed.

## Code and review expectations

- Prefer small, reviewable commits and pull requests.
- Preserve local-first defaults and safe execution boundaries.
- Explain user-visible changes and known limits in pull request description.
- Be respectful. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Reporting security issues

Do not file public issues for a suspected vulnerability. Follow [SECURITY.md](SECURITY.md).
