import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

type RecorderApi = {
  redactText: (value: string) => string;
};

describe("Notion workflow recorder redaction", () => {
  it("redacts emails and invite links", async () => {
    const { redactText } = await loadRecorderApi();

    const redacted = redactText(
      "Invite jane@company.com with https://notion.so/invite?token=abc123&email=jane@company.com"
    );

    expect(redacted).toContain("[redacted-email]");
    expect(redacted).toContain("[redacted-link]");
    expect(redacted).not.toContain("jane@company.com");
    expect(redacted).not.toContain("abc123");
  });

  it("redacts token and password-like values", async () => {
    const { redactText } = await loadRecorderApi();

    const redacted = redactText("password=secret-value Authorization: Bearer sk-test-123456789");

    expect(redacted).toContain("password=[redacted-secret]");
    expect(redacted).toContain("Authorization=[redacted-secret]");
    expect(redacted).toContain("[redacted-token]");
    expect(redacted).not.toContain("secret-value");
    expect(redacted).not.toContain("sk-test-123456789");
  });
});

async function loadRecorderApi(): Promise<RecorderApi> {
  const source = await readFile(path.resolve("extensions/notion-workflow-recorder/recorder-utils.js"), "utf8");
  const sandbox = vm.createContext({});
  vm.runInContext(source, sandbox);
  return (sandbox as { AccessOwlRecorder: RecorderApi }).AccessOwlRecorder;
}
