# Interview Talk Track

## 60-Second Version

I set up a self-hosted Appsmith instance as a safe SaaS admin target and built a TypeScript/Playwright automation scaffold around it. The project demonstrates service-account auth state, semantic locators, traces, screenshots, evidence bundles, network observation, dry-run/confirmation guards, and a constrained OpenAI fallback for selector repair.

The important part is the engineering posture: deterministic browser automation first, evidence for every run, and AI only as bounded recovery after a selector fails.

## Questions I Can Answer

- Why Appsmith instead of a mock app?
- How I choose Playwright locators.
- Why `storageState` is useful and sensitive.
- How traces help debug flaky SaaS automation.
- How network observation can inform an integration without bypassing auth.
- How the OpenAI fallback is constrained with Zod and an action allowlist.

## Demo Flow

```bash
npm run appsmith:setup-check
npm run appsmith:login
npm run appsmith:auth-check
PRACTICE_HEADLESS=true npx tsx scripts/practice/01-auth-check.ts
PRACTICE_HEADLESS=true npx tsx scripts/practice/03-create-practice-app.ts
npm run appsmith:broken-selector-demo
```
