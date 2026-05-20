import { describe, expect, it } from "vitest";
import {
  isAuthenticatedAppsmithUrl,
  isExistingAppsmithAccountSignupError
} from "../../packages/integrations-appsmith/src/index.js";

describe("Appsmith authentication route detection", () => {
  it("accepts authenticated Appsmith surfaces", () => {
    expect(isAuthenticatedAppsmithUrl("http://localhost:8080/applications")).toBe(true);
    expect(isAuthenticatedAppsmithUrl("http://localhost:8080/app/demo/page1-123/edit")).toBe(true);
    expect(isAuthenticatedAppsmithUrl("http://localhost:8080/settings/user-management")).toBe(true);
  });

  it("rejects root, login, and onboarding routes", () => {
    expect(isAuthenticatedAppsmithUrl("http://localhost:8080/")).toBe(false);
    expect(isAuthenticatedAppsmithUrl("http://localhost:8080/user/login")).toBe(false);
    expect(isAuthenticatedAppsmithUrl("http://localhost:8080/user/signup")).toBe(false);
    expect(isAuthenticatedAppsmithUrl("http://localhost:8080/setup/welcome")).toBe(false);
  });

  it("detects Appsmith's existing-admin signup error", () => {
    expect(
      isExistingAppsmithAccountSignupError(
        "http://localhost:8080/user/signup?error=There%20is%20already%20an%20account%20registered%20with%20this%20email.%20Please%20sign%20in%20instead."
      )
    ).toBe(true);
    expect(isExistingAppsmithAccountSignupError("http://localhost:8080/user/signup")).toBe(false);
  });
});
