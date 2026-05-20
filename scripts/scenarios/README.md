# Scenario Scripts

These scripts exercise the local Appsmith target as a SaaS-like integration surface. They are small on purpose: each one focuses on one browser automation behavior and writes evidence that can be inspected after the run.

Run one script directly:

```bash
npx tsx scripts/scenarios/01-auth-check.ts
```

Run through npm:

```bash
SCENARIO_HEADLESS=true npm run scenario:auth-check
SCENARIO_HEADLESS=true npm run scenario:ensure-demo-app
SCENARIO_HEADLESS=true npm run scenario:network-observation
```

Artifacts are written under `evidence/scenarios/`, which is ignored by Git.
