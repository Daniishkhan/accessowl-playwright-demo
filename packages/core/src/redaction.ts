const SECRET_KEY_RE = /(authorization|cookie|set-cookie|password|passwd|csrf|session|token|secret|api[_-]?key)/i;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,}|demo\.local)\b/gi;
const DEMO_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "demo.local",
  "accessowl-demo.test"
]);

export function redactString(value: string): string {
  let redacted = value;

  redacted = redacted.replace(
    /\b(authorization)\s*:\s*Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
    "$1: Bearer [REDACTED]"
  );
  redacted = redacted.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]");
  redacted = redacted.replace(
    /\b(cookie|set-cookie|x-csrf-token|csrf-token|session|token|password)\s*[:=]\s*("[^"]*"|'[^']*'|[^\s,;}]+)/gi,
    "$1=[REDACTED]"
  );
  redacted = redacted.replace(
    /https?:\/\/[^\s"'<>]*(invite|reset|token|activation)[^\s"'<>]*/gi,
    "[REDACTED_LINK]"
  );
  redacted = redacted.replace(EMAIL_RE, (email: string, domain: string) => {
    return DEMO_DOMAINS.has(domain.toLowerCase()) ? email : "[REDACTED_EMAIL]";
  });

  return redacted;
}

export function redactHeaders(headers: Record<string, string | undefined>): Record<string, string> {
  const output: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    output[key] = SECRET_KEY_RE.test(key) ? "[REDACTED]" : redactString(String(value ?? ""));
  }

  return output;
}

export function redactJson<T>(value: T): T {
  return redactJsonInternal(value) as T;
}

function redactJsonInternal(value: unknown): unknown {
  if (typeof value === "string") {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map(redactJsonInternal);
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      output[key] = SECRET_KEY_RE.test(key) ? "[REDACTED]" : redactJsonInternal(child);
    }
    return output;
  }

  return value;
}
