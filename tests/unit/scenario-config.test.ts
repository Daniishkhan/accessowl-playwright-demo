import { describe, expect, it } from "vitest";
import { demoPauseMs, scenarioHeadless } from "../../scripts/scenarios/_lib.js";

describe("scenario runtime config", () => {
  it("lets SCENARIO_HEADLESS=false override HEADLESS=true", () => {
    expect(scenarioHeadless({ HEADLESS: "true", SCENARIO_HEADLESS: "false" })).toBe(false);
  });

  it("lets SCENARIO_HEADLESS=true force headless mode", () => {
    expect(scenarioHeadless({ HEADLESS: "false", SCENARIO_HEADLESS: "true" })).toBe(true);
  });

  it("uses HEADLESS when the scenario override is not set", () => {
    expect(scenarioHeadless({ HEADLESS: "true" })).toBe(true);
    expect(scenarioHeadless({ HEADLESS: "false" })).toBe(false);
  });

  it("defaults the guided demo pause to three seconds", () => {
    expect(demoPauseMs({})).toBe(3_000);
  });

  it("allows a fast zero-pause demo run", () => {
    expect(demoPauseMs({ DEMO_PAUSE_MS: "0" })).toBe(0);
  });

  it("rejects invalid pause values", () => {
    expect(() => demoPauseMs({ DEMO_PAUSE_MS: "-1" })).toThrow(/DEMO_PAUSE_MS/);
    expect(() => demoPauseMs({ DEMO_PAUSE_MS: "soon" })).toThrow(/DEMO_PAUSE_MS/);
  });
});
