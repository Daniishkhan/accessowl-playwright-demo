# Implementation Plan

## M0 - Docs and Scaffold

- Split the original one-pager and technical draft into README plus focused docs.
- Add npm workspace files, TypeScript config, Vitest config, and Playwright config.
- Add Appsmith Docker Compose setup on ports `8080` and `8443`.

Acceptance:

- `npm install` succeeds.
- `npm run typecheck` succeeds.
- Docs explain the AccessOwl relevance in one screen.

## M1 - Core Primitives

- Add Zod schemas for config, normalized users, audit events, evidence, and action plans.
- Add redaction helpers.
- Add evidence writer with standard run directories.
- Add browser session factory and storage-state helpers.

Acceptance:

- Unit tests cover schema validation, redaction, evidence directory creation, and confirmation gates.

## M2 - Appsmith Workflows

- Implement setup check, login, sync users, invite, deprovision, API observation, and broken-selector demo.
- Add first-admin signup and auth-check helpers for repeatable local practice.
- Add CLI commands and root npm scripts.
- Keep write actions dry-run capable.

Acceptance:

- Commands are present and fail with clear messages when Appsmith is not configured.
- Dry-run write workflows produce evidence without changing the target.

## M3 - Fixture Tests

- Add a mock Appsmith-like page for Playwright tests.
- Validate user extraction from fixture HTML.
- Validate broken-selector fallback with a fixture action plan.
- Validate prompt-injection text does not change the goal.

Acceptance:

- `npm test` passes.
- `npm run test:fixtures` passes when Playwright Chromium is available.

## M4 - Real Target Smoke

- Gate real Appsmith checks behind `APPSMITH_E2E=1`.
- Run setup check, login, sync, and dry-run write flows against `http://localhost:8080`.

Acceptance:

- Real target smoke does not run accidentally in CI or local unit tests.
