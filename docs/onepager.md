# Appsmith Access Agent - One Pager

## Project Summary

Appsmith Access Agent is a self-hosted SaaS access automation lab built for an AccessOwl-style interview demo. It uses TypeScript, Playwright, Zod, evidence capture, and constrained LLM fallback to automate access-management flows against an Appsmith instance that you own.

The point is not to make a flashy browser bot. The point is to show production judgment around agentic SaaS integrations: deterministic automation first, clear safety boundaries, observable runs, and AI only where it meaningfully reduces maintenance risk.

## AccessOwl Fit

AccessOwl automates SaaS access where SCIM/SAML/API support is missing, expensive, or incomplete. This project mirrors the same technical shape:

- **Structure Sync:** discover available roles, groups, and visible permission surfaces.
- **User Sync:** extract users, status, roles, and groups into normalized JSON.
- **Provisioning:** invite or add a test user with a selected role when available.
- **Deprovisioning:** deactivate or remove a test user behind explicit confirmation.
- **Access Review Evidence:** produce screenshots, traces, before/after state, redacted logs, and audit JSON.

## Demo Thesis

> I built a controlled AccessOwl-style integration lab: deterministic Playwright automation over a self-hosted SaaS admin UI, with user/permission sync, provisioning evidence, authenticated API observation where appropriate, and a constrained LLM fallback for selector repair.

## MVP Demo Flow

1. Start Appsmith locally with Docker Compose.
2. Log in with a dedicated service account and persist Playwright `storageState`.
3. Sync visible users and permission metadata from the Admin UI.
4. Run invite/deprovision in dry-run mode.
5. Run a confirmed action on a fake user.
6. Open the evidence bundle and Playwright trace.
7. Run the broken-selector demo.
8. Show deterministic failure, JSON-only LLM plan validation, and safe recovery.

## What Makes It Credible

- Owned self-hosted target, not third-party scraping.
- Role and label locators before CSS or coordinates.
- Auth state and evidence excluded from Git.
- Redaction for secrets and non-demo identities.
- Human confirmation for destructive actions.
- LLM output treated as untrusted data and validated with Zod.
- Prompt-injection page content handled as hostile input.

## Final Pitch

Built a TypeScript/Playwright access automation agent against a self-hosted Appsmith instance, including service-account login, storage-state reuse, browser-driven user and permission sync, provisioning/deprovisioning workflows, Playwright trace evidence, authenticated API observation on an owned target, and Zod-validated LLM fallback for broken selectors.
