# AccessOwl Notion Workflow Recorder

This is a small Manifest V3 extension that records a Notion-style admin workflow as Playwright automation hints.

The useful idea is simple: an admin clicks through a SaaS workflow once, and the extension captures enough safe browser context to help build or repair a browser automation integration.

## What It Records

- Click events.
- Input and select changes.
- Form submissions.
- Visible target labels, text, roles, placeholders, and test ids.
- Playwright-style selector candidates.
- Redacted field values and URLs.

## What It Avoids

- No cookies.
- No localStorage, sessionStorage, or IndexedDB reads.
- No hidden input values.
- No backend calls.
- No automated Notion login, Gmail access, or OTP handling.

## Manual Real-Notion Smoke

Use a Notion workspace you own and dummy data only:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select `extensions/notion-workflow-recorder`.
5. Open Notion and sign in manually.
6. Open a safe workspace/settings page.
7. Start recording from the popup.
8. Click through a small admin workflow.
9. Stop before sending a real invite unless it is a safe test address.
10. Export the recording from the popup.
11. Use `Copy JSON` or `Download JSON` to save the output outside the repo.

## Manual Loading

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select `extensions/notion-workflow-recorder`.
5. Open a supported page.
6. Use the popup to start and stop recording.

The extension cannot write directly to `evidence/runs/`; Chrome extensions do not have repo filesystem access. Do not commit real Notion screenshots, auth state, or exported recordings.
