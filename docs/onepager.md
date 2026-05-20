# One Pager

## Summary

**Appsmith Access Agent** is a runnable Playwright automation lab for no-SCIM SaaS access workflows. It uses a self-hosted Appsmith instance as the safe target and demonstrates service-account browser automation, auth-state reuse, evidence capture, network observation, dry-run/confirmation guards, and constrained OpenAI selector repair.

The goal is to show the engineering posture behind an AccessOwl-style agentic integration: deterministic automation first, observable runs, safe write boundaries, and AI used only as a bounded fallback.

## Why Appsmith

Appsmith gives the demo a real SPA with login, workspaces, applications, modals, dynamic loading, API calls, and admin-like surfaces. Because it runs locally, the project can inspect browser traffic, create practice apps, break selectors, and replay same-origin requests without scraping a third-party SaaS account.

## AccessOwl Relevance

AccessOwl publicly frames provisioning around apps where SCIM/SAML or complete APIs are missing or expensive, using integration accounts, RPA, and private APIs. This project mirrors that technical shape:

- **Login state:** Playwright authenticates as a service/integration account and saves `storageState`.
- **Sync shape:** visible users/apps/access can be normalized into JSON.
- **Provisioning shape:** invite/deprovision commands expose dry-run and confirmation semantics.
- **Evidence shape:** screenshots, traces, redacted logs, and audit JSON are first-class outputs.
- **Recovery shape:** OpenAI proposes strict JSON actions only after deterministic selector failure.

## What To Demo

```bash
npm run appsmith:setup-check
npm run appsmith:login
npm run appsmith:auth-check
PRACTICE_HEADLESS=true npm run practice:03
PRACTICE_HEADLESS=true npm run practice:06
npm run appsmith:broken-selector-demo
```

This shows the local target is alive, auth state works, a practice app can be opened, network calls can be observed safely, and selector repair is schema-validated before execution.

## Engineering Judgment On Display

- Role/text/test-id locators before brittle CSS.
- Auth state stored locally and ignored by Git.
- No real third-party target.
- Write flows have `--dry-run` and destructive actions require `--confirm`.
- OpenAI output is untrusted until it passes Zod and safety validation.
- Prompt-injection-like page text is treated as hostile content.
- Evidence folders make failures inspectable through screenshots and Playwright traces.

## Final Pitch

I built a TypeScript/Playwright access automation lab against a self-hosted SaaS target. It demonstrates the core mechanics behind agentic SaaS integrations: service-account login, browser-driven sync, guarded write workflows, audit-grade evidence, authenticated API observation on an owned target, and bounded OpenAI selector repair.
