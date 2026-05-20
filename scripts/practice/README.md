# Practice Scripts

Small Playwright scripts used to exercise the Appsmith target like a real SaaS integration surface.

Run them with:

```bash
npx tsx scripts/practice/01-auth-check.ts
```

For non-visual verification:

```bash
PRACTICE_HEADLESS=true npx tsx scripts/practice/01-auth-check.ts
```

The scripts write screenshots, traces, and small JSON summaries under `evidence/practice/`, which is ignored by Git.
