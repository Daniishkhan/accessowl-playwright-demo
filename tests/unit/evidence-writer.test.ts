import { mkdtemp, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EvidenceWriter } from "../../packages/core/src/index.js";

describe("EvidenceWriter", () => {
  it("creates the expected evidence directory structure", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "access-agent-"));
    const writer = await EvidenceWriter.create({
      evidenceDir: tmp,
      action: "sync_users",
      input: { email: "person@company.com" }
    });

    await writer.writeJson("users.json", [{ email: "demo@example.com", source: "fixture" }]);
    await writer.appendLog("Authorization: Bearer abc123");

    await expect(stat(writer.resolve("screenshots"))).resolves.toBeTruthy();
    await expect(stat(writer.resolve("logs"))).resolves.toBeTruthy();
    await expect(stat(writer.resolve("network"))).resolves.toBeTruthy();
    await expect(stat(writer.resolve("llm"))).resolves.toBeTruthy();

    const inputs = await readFile(writer.resolve("inputs.redacted.json"), "utf8");
    expect(inputs).toContain("[REDACTED_EMAIL]");

    const log = await readFile(writer.resolve("logs/runner.log"), "utf8");
    expect(log).toContain("Bearer [REDACTED]");
  });
});
