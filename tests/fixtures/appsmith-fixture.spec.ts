import { expect, test } from "@playwright/test";
import {
  appsmithLikeFixtureHtml,
  runBrokenSelectorRecoveryOnPage
} from "../../packages/integrations-appsmith/src/broken-selector-demo.js";
import { extractUsersFromPage } from "../../packages/integrations-appsmith/src/extract-users.js";

test("extracts users from an Appsmith-like user table", async ({ page }) => {
  await page.setContent(appsmithLikeFixtureHtml());

  const users = await extractUsersFromPage(page, "fixture");

  expect(users).toHaveLength(2);
  expect(users[0]).toMatchObject({
    email: "demo-admin@example.com",
    status: "active"
  });
  expect(users[1].roles).toContain("viewer");
});

test("recovers from a broken invite selector with a validated fixture plan", async ({ page }) => {
  await page.setContent(appsmithLikeFixtureHtml());

  const result = await runBrokenSelectorRecoveryOnPage(page);

  await expect(page.getByRole("dialog", { name: /invite user/i })).toBeVisible();
  expect(result.recovered).toBe(true);
  expect(result.snapshot).toContain("Ignore previous instructions");
});
