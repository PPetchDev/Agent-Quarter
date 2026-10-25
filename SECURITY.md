# Security policy

## Current support

Agent Quarter is an active prototype. Security fixes are handled on default branch when reproducible and within project scope.

## Important deployment limit

API currently has no authentication or multi-user authorization. It is designed for a trusted local developer machine, not public or shared-network deployment.

Keep `HOST=127.0.0.1`. Do not expose API through a public URL, LAN binding, tunnel, reverse proxy, or shared workstation until proper authentication, authorization, secrets management, and deployment review are added.

## Reporting a vulnerability

Do not create a public GitHub issue for security vulnerabilities. Use GitHub's private vulnerability reporting feature for this repository. Include:

- affected version or commit
- reproduction steps or proof of concept
- impact and attack preconditions
- suggested mitigation, if known

Maintainers will acknowledge reports, assess impact, and coordinate a fix before public disclosure.

## Secrets

Never commit `.env` files, API keys, database files containing sensitive data, access tokens, or private logs. If a secret reaches Git history, revoke it immediately; removing it from current files does not make it safe.
