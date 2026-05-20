import { describe, expect, it } from "vitest";
import { redactHeaders, redactJson, redactString } from "../../packages/core/src/index.js";

describe("redaction", () => {
  it("redacts secrets and non-demo emails from strings", () => {
    const value =
      "Authorization: Bearer abc123 password=supersecret user jane@company.com invite https://app.test/invite?token=abc demo demo-user@example.com";

    expect(redactString(value)).toContain("Bearer [REDACTED]");
    expect(redactString(value)).toContain("password=[REDACTED]");
    expect(redactString(value)).toContain("[REDACTED_EMAIL]");
    expect(redactString(value)).toContain("[REDACTED_LINK]");
    expect(redactString(value)).toContain("demo-user@example.com");
  });

  it("redacts secret header values", () => {
    const redacted = redactHeaders({
      authorization: "Bearer abc123",
      cookie: "sid=abc",
      "x-request-id": "req_123"
    });

    expect(redacted.authorization).toBe("[REDACTED]");
    expect(redacted.cookie).toBe("[REDACTED]");
    expect(redacted["x-request-id"]).toBe("req_123");
  });

  it("redacts nested json", () => {
    const redacted = redactJson({
      password: "secret",
      user: { email: "person@company.com" },
      demo: { email: "demo@example.com" }
    });

    expect(redacted.password).toBe("[REDACTED]");
    expect(redacted.user.email).toBe("[REDACTED_EMAIL]");
    expect(redacted.demo.email).toBe("demo@example.com");
  });
});
