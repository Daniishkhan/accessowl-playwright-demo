# Safety Model

## Target Boundary

Only run this project against an Appsmith instance you own. The scaffold is designed for local or VPS-hosted Appsmith, not unapproved third-party SaaS automation.

## Credentials

- Use a dedicated test service account.
- Store credentials in `.env`.
- Never commit `.env` or `playwright/.auth/*.json`.
- Never send passwords, cookies, session IDs, CSRF tokens, invite links, or reset links to an LLM.

## Write Actions

- `invite` and `deprovision` both support `--dry-run`.
- Deprovisioning requires `--confirm`.
- LLM fallback cannot provide confirmation.
- High-risk or destructive LLM plans fail closed.

## Redaction

The redactor removes:

- Authorization headers.
- Cookie and Set-Cookie values.
- Passwords and API keys.
- CSRF, session, token, and secret fields.
- Invite and password-reset links.
- Non-demo emails.

Demo-safe email domains are `example.com`, `example.org`, `example.net`, `demo.local`, and `accessowl-demo.test`.

## OpenAI Fallback

OpenAI is the only real LLM provider in this scaffold. The model is only a selector-repair assistant. It receives a bounded goal, failed step metadata, current URL, allowed domain, and a redacted ARIA/DOM snapshot.

Allowed actions:

- `click`
- `fill`
- `select`
- `waitFor`

Forbidden actions:

- Raw JavaScript.
- File or environment access.
- Off-domain navigation.
- Reading secrets.
- Changing the task goal.
- Confirming destructive actions unless the CLI already has confirmation.

## Sandbox Direction

The first scaffold runs locally. Future sandbox execution should isolate:

- Browser process.
- Auth state.
- Evidence files.
- Environment variables.
- Network allowlist.

E2B or Daytona can be added after the local Playwright worker is stable.
