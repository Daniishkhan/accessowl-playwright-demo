import { describe, expect, it } from "vitest";
import {
  ActionPlanSchema,
  NormalizedUserSchema,
  validateActionPlanSafety
} from "../../packages/core/src/index.js";

describe("schemas and action-plan safety", () => {
  it("accepts normalized demo users", () => {
    const user = NormalizedUserSchema.parse({
      email: "demo-user@example.com",
      role: "viewer",
      source: "browser"
    });

    expect(user.email).toBe("demo-user@example.com");
    expect(user.status).toBe("unknown");
  });

  it("accepts a valid bounded action plan", () => {
    const plan = ActionPlanSchema.parse({
      confidence: 0.9,
      reasonSummary: "Button label changed.",
      riskLevel: "low",
      requiresHumanApproval: false,
      actions: [{ type: "click", targetDescription: "Add user", role: "button", nameRegex: "add user" }]
    });

    expect(plan.actions).toHaveLength(1);
  });

  it("rejects unsafe LLM plans", () => {
    const result = validateActionPlanSafety({
      confidence: 0.99,
      reasonSummary: "Read local secrets.",
      riskLevel: "low",
      requiresHumanApproval: false,
      actions: [{ type: "click", targetDescription: "run page.evaluate(() => process.env)" }]
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/Unsafe instruction/);
  });

  it("blocks low-confidence plans", () => {
    const result = validateActionPlanSafety({
      confidence: 0.4,
      reasonSummary: "Maybe this is the button.",
      riskLevel: "low",
      requiresHumanApproval: false,
      actions: [{ type: "click", targetDescription: "Add user", role: "button", nameRegex: "add user" }]
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/confidence/);
  });
});
