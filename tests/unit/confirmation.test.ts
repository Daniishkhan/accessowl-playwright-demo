import { describe, expect, it } from "vitest";
import { ConfirmationRequiredError, ensureConfirmed } from "../../packages/core/src/index.js";

describe("confirmation guard", () => {
  it("blocks destructive actions without confirmation", () => {
    expect(() => ensureConfirmed("deprovision_user", {})).toThrow(ConfirmationRequiredError);
  });

  it("allows dry-run without confirmation", () => {
    expect(() => ensureConfirmed("deprovision_user", { dryRun: true })).not.toThrow();
  });

  it("allows confirmed destructive actions", () => {
    expect(() => ensureConfirmed("deprovision_user", { confirm: true })).not.toThrow();
  });
});
