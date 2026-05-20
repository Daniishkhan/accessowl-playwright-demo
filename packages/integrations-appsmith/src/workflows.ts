import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Page } from "playwright";
import {
  AuditEventSchema,
  EvidenceWriter,
  createBrowserSession,
  ensureConfirmed,
  planSelectorRepairWithOpenAI,
  redactHeaders,
  saveStorageState,
  type AppsmithConfig,
  type NormalizedUser
} from "../../core/src/index.js";
import { appsmithLikeFixtureHtml, runBrokenSelectorRecoveryOnPage } from "./broken-selector-demo.js";
import { extractUsersFromPage } from "./extract-users.js";
import { requireAppsmithCredentials } from "./config.js";

const APPSMITH_READY_TIMEOUT_MS = 120_000;
const APPSMITH_READY_POLL_MS = 2_000;

export async function setupCheck(config: AppsmithConfig): Promise<{ ok: boolean; status?: number; url: string }> {
  const writer = await EvidenceWriter.create({
    evidenceDir: config.evidenceDir,
    action: "setup_check",
    input: { baseUrl: config.baseUrl }
  });

  try {
    const response = await waitForAppsmithHttp(config.baseUrl);
    const result = { ok: response.status < 500, status: response.status, url: config.baseUrl };
    await writer.writeJson("setup-check.json", result);
    await writer.writeAuditEvent(
      AuditEventSchema.parse({
        runId: writer.bundle.runId,
        targetApp: "appsmith",
        action: "setup_check",
        actor: { type: "service_account", email: config.adminEmail ?? "not-configured" },
        input: { baseUrl: config.baseUrl },
        result: result.ok ? "success" : "failure",
        artifacts: { screenshots: [], logs: ["logs/runner.log"] },
        startedAt: writer.bundle.createdAt,
        completedAt: new Date().toISOString()
      })
    );
    await writer.appendLog(`Setup check ${result.ok ? "succeeded" : "failed"} with status ${response.status}.`);
    return result;
  } catch (error) {
    await writer.appendLog(`Setup check failed: ${(error as Error).message}`);
    throw error;
  }
}

export async function login(config: AppsmithConfig): Promise<{ storageStatePath: string; evidenceDir: string }> {
  requireAppsmithCredentials(config);
  const writer = await EvidenceWriter.create({
    evidenceDir: config.evidenceDir,
    action: "login",
    input: { baseUrl: config.baseUrl, adminEmail: config.adminEmail }
  });

  const session = await createBrowserSession({
    headless: config.headless,
    storageStatePath: config.storageStatePath
  });

  try {
    await waitForAppsmithHttp(config.baseUrl);
    await gotoAppsmithPath(session.page, config.baseUrl, "/user/login");
    await session.page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    await waitForLoginPageOrKnownState(session.page);
    await session.page.screenshot({ path: writer.screenshotPath("01-login-page") });
    if (await isAuthenticated(session.page)) {
      await session.page.screenshot({ path: writer.screenshotPath("02-authenticated") });
      await saveStorageState(session.context, config.storageStatePath);
      await writer.appendLog(`Existing storage state is already authenticated; refreshed ${config.storageStatePath}.`);
      await writer.writeAuditEvent(
        AuditEventSchema.parse({
          runId: writer.bundle.runId,
          targetApp: "appsmith",
          action: "login",
          actor: { type: "service_account", email: config.adminEmail! },
          input: { baseUrl: config.baseUrl, reusedExistingSession: true },
          result: "success",
          artifacts: { screenshots: writer.bundle.screenshots, logs: writer.bundle.logs },
          startedAt: writer.bundle.createdAt,
          completedAt: new Date().toISOString()
        })
      );
      return { storageStatePath: config.storageStatePath, evidenceDir: writer.bundle.rootDir };
    }
    await assertLoginFormAvailable(session.page);
    await fillFirstAvailable(session.page, [
      () => session.page.getByLabel(/email/i),
      () => session.page.getByPlaceholder(/email/i),
      () => session.page.getByRole("textbox", { name: /email/i }),
      () => session.page.locator("input[type='email'], input[name*='email' i]").first()
    ], config.adminEmail!);
    await fillFirstAvailable(session.page, [
      () => session.page.getByLabel(/password/i),
      () => session.page.getByPlaceholder(/password/i),
      () => session.page.locator("input[type='password']").first()
    ], config.adminPassword!);
    await session.page.getByRole("button", { name: /sign in|log in/i }).click();
    await session.page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
    await assertAuthenticated(session.page);
    await session.page.screenshot({ path: writer.screenshotPath("02-authenticated") });
    await saveStorageState(session.context, config.storageStatePath);
    await writer.appendLog(`Saved storage state to ${config.storageStatePath}.`);
    await writer.writeAuditEvent(
      AuditEventSchema.parse({
        runId: writer.bundle.runId,
        targetApp: "appsmith",
        action: "login",
        actor: { type: "service_account", email: config.adminEmail! },
        input: { baseUrl: config.baseUrl },
        result: "success",
        artifacts: { screenshots: writer.bundle.screenshots, logs: writer.bundle.logs },
        startedAt: writer.bundle.createdAt,
        completedAt: new Date().toISOString()
      })
    );
    return { storageStatePath: config.storageStatePath, evidenceDir: writer.bundle.rootDir };
  } finally {
    await session.close(writer.tracePath("trace.zip"));
  }
}

export async function signupAdmin(config: AppsmithConfig): Promise<{ storageStatePath: string; evidenceDir: string }> {
  requireAppsmithCredentials(config);
  const writer = await EvidenceWriter.create({
    evidenceDir: config.evidenceDir,
    action: "login",
    input: { baseUrl: config.baseUrl, adminEmail: config.adminEmail, firstLocalAdmin: true }
  });

  const session = await createBrowserSession({ headless: config.headless });

  try {
    await waitForAppsmithHttp(config.baseUrl);
    await gotoAppsmithPath(session.page, config.baseUrl, "/user/signup");
    await session.page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    await waitForSignupPageOrKnownState(session.page);
    await session.page.screenshot({ path: writer.screenshotPath("01-signup-page") });
    await assertNoExistingAccountSignupError(session.page);
    await assertSignupFormAvailable(session.page);
    await completeFirstAdminSignup(session.page, config);
    await session.page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
    await assertNoExistingAccountSignupError(session.page);
    await assertAuthenticated(session.page);
    await session.page.screenshot({ path: writer.screenshotPath("02-authenticated") });
    await saveStorageState(session.context, config.storageStatePath);
    await writer.appendLog(`Signed up local admin and saved storage state to ${config.storageStatePath}.`);
    await writer.writeAuditEvent(
      AuditEventSchema.parse({
        runId: writer.bundle.runId,
        targetApp: "appsmith",
        action: "login",
        actor: { type: "service_account", email: config.adminEmail! },
        input: { baseUrl: config.baseUrl, firstLocalAdmin: true },
        result: "success",
        artifacts: { screenshots: writer.bundle.screenshots, logs: writer.bundle.logs },
        startedAt: writer.bundle.createdAt,
        completedAt: new Date().toISOString()
      })
    );
    return { storageStatePath: config.storageStatePath, evidenceDir: writer.bundle.rootDir };
  } finally {
    await session.close(writer.tracePath("trace.zip"));
  }
}

export async function authCheck(config: AppsmithConfig): Promise<{ ok: boolean; url: string; evidenceDir: string }> {
  const writer = await EvidenceWriter.create({
    evidenceDir: config.evidenceDir,
    action: "setup_check",
    input: { baseUrl: config.baseUrl, storageStatePath: config.storageStatePath }
  });

  if (!existsSync(config.storageStatePath)) {
    const result = { ok: false, reason: "missing_storage_state", storageStatePath: config.storageStatePath };
    await writer.writeJson("auth-check.json", result);
    throw new Error(
      `No Playwright auth state found at ${config.storageStatePath}. Set APPSMITH_ADMIN_EMAIL and APPSMITH_ADMIN_PASSWORD in .env, then run npm run appsmith:signup-admin for a fresh local Appsmith instance or npm run appsmith:login for an existing admin.`
    );
  }

  const session = await createBrowserSession({ headless: config.headless, storageStatePath: config.storageStatePath });

  try {
    await waitForAppsmithHttp(config.baseUrl);
    await gotoAppsmithPath(session.page, config.baseUrl, "/applications");
    await session.page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    await session.page.screenshot({ path: writer.screenshotPath("auth-check") });
    await assertAuthenticated(session.page);
    await writer.writeJson("auth-check.json", { ok: true, url: session.page.url() });
    return { ok: true, url: session.page.url(), evidenceDir: writer.bundle.rootDir };
  } finally {
    await session.close(writer.tracePath("trace.zip"));
  }
}

export async function syncUsers(config: AppsmithConfig): Promise<{ users: NormalizedUser[]; evidenceDir: string }> {
  requireAppsmithCredentials(config);
  const writer = await EvidenceWriter.create({
    evidenceDir: config.evidenceDir,
    action: "sync_users",
    input: { baseUrl: config.baseUrl }
  });
  const session = await createBrowserSession({ headless: config.headless, storageStatePath: config.storageStatePath });

  try {
    await gotoUserManagement(session.page, config.baseUrl);
    await session.page.screenshot({ path: writer.screenshotPath("02-users") });
    const users = await extractUsersFromPage(session.page);
    await writer.writeJson("users.json", users);
    await writer.writeAuditEvent(
      AuditEventSchema.parse({
        runId: writer.bundle.runId,
        targetApp: "appsmith",
        action: "sync_users",
        actor: { type: "service_account", email: config.adminEmail! },
        input: { baseUrl: config.baseUrl },
        result: "success",
        after: users,
        artifacts: { screenshots: writer.bundle.screenshots, logs: writer.bundle.logs },
        startedAt: writer.bundle.createdAt,
        completedAt: new Date().toISOString()
      })
    );
    return { users, evidenceDir: writer.bundle.rootDir };
  } finally {
    await session.close(writer.tracePath("trace.zip"));
  }
}

export async function inviteUser(
  config: AppsmithConfig,
  options: { email: string; role?: string; dryRun?: boolean }
): Promise<{ result: "dry_run" | "success"; evidenceDir: string }> {
  requireAppsmithCredentials(config);
  const writer = await EvidenceWriter.create({
    evidenceDir: config.evidenceDir,
    action: "invite_user",
    input: options
  });

  if (options.dryRun) {
    await writer.writeJson("dry-run.json", {
      action: "invite_user",
      wouldInvite: options.email,
      role: options.role ?? "unspecified"
    });
    await writer.writeAuditEvent(makeDryRunEvent(writer, config.adminEmail!, "invite_user", options));
    return { result: "dry_run", evidenceDir: writer.bundle.rootDir };
  }

  const session = await createBrowserSession({ headless: config.headless, storageStatePath: config.storageStatePath });
  try {
    await gotoUserManagement(session.page, config.baseUrl);
    await clickByRoleNames(session.page, ["invite user", "add user", "invite", "add"]);
    await session.page.getByLabel(/email/i).fill(options.email);
    if (options.role) {
      const roleControl = session.page.getByLabel(/role|permission/i).first();
      if (await roleControl.count()) {
        await roleControl.fill(options.role).catch(() => undefined);
      }
    }
    await clickByRoleNames(session.page, ["send invite", "invite", "add"]);
    await session.page.screenshot({ path: writer.screenshotPath("03-invite") });
    await writer.writeAuditEvent(makeSuccessEvent(writer, config.adminEmail!, "invite_user", options));
    return { result: "success", evidenceDir: writer.bundle.rootDir };
  } finally {
    await session.close(writer.tracePath("trace.zip"));
  }
}

export async function deprovisionUser(
  config: AppsmithConfig,
  options: { email: string; confirm?: boolean; dryRun?: boolean }
): Promise<{ result: "dry_run" | "success"; evidenceDir: string }> {
  requireAppsmithCredentials(config);
  ensureConfirmed("deprovision_user", options);
  const writer = await EvidenceWriter.create({
    evidenceDir: config.evidenceDir,
    action: "deprovision_user",
    input: { email: options.email, confirm: options.confirm, dryRun: options.dryRun }
  });

  if (options.dryRun) {
    await writer.writeJson("dry-run.json", {
      action: "deprovision_user",
      wouldDeprovision: options.email,
      confirmed: Boolean(options.confirm)
    });
    await writer.writeAuditEvent(makeDryRunEvent(writer, config.adminEmail!, "deprovision_user", options));
    return { result: "dry_run", evidenceDir: writer.bundle.rootDir };
  }

  const session = await createBrowserSession({ headless: config.headless, storageStatePath: config.storageStatePath });
  try {
    await gotoUserManagement(session.page, config.baseUrl);
    const row = session.page.getByRole("row").filter({ hasText: options.email }).first();
    await row.getByRole("button").click();
    await clickByRoleNames(session.page, ["deactivate", "remove", "delete"]);
    await clickByRoleNames(session.page, ["confirm", "deactivate", "remove", "delete"]);
    await session.page.screenshot({ path: writer.screenshotPath("04-deprovision") });
    await writer.writeAuditEvent(makeSuccessEvent(writer, config.adminEmail!, "deprovision_user", options));
    return { result: "success", evidenceDir: writer.bundle.rootDir };
  } finally {
    await session.close(writer.tracePath("trace.zip"));
  }
}

export async function apiReplaySync(config: AppsmithConfig): Promise<{ observed: number; evidenceDir: string }> {
  requireAppsmithCredentials(config);
  const writer = await EvidenceWriter.create({
    evidenceDir: config.evidenceDir,
    action: "api_replay_sync",
    input: { baseUrl: config.baseUrl }
  });
  const session = await createBrowserSession({ headless: config.headless, storageStatePath: config.storageStatePath });
  const observed: Array<Record<string, unknown>> = [];

  session.page.on("requestfinished", async (request) => {
    const url = request.url();
    if (!/api|user|permission|group/i.test(url)) return;
    const response = await request.response();
    observed.push({
      method: request.method(),
      url,
      status: response?.status(),
      resourceType: request.resourceType(),
      headers: redactHeaders(request.headers())
    });
  });

  try {
    await gotoUserManagement(session.page, config.baseUrl);
    await session.page.waitForLoadState("networkidle").catch(() => undefined);
    await writer.writeJson("network/observed-requests.redacted.json", observed);
    await writer.writeAuditEvent(makeSuccessEvent(writer, config.adminEmail!, "api_replay_sync", { observed: observed.length }));
    return { observed: observed.length, evidenceDir: writer.bundle.rootDir };
  } finally {
    await session.close(writer.tracePath("trace.zip"));
  }
}

export async function brokenSelectorDemo(config: AppsmithConfig): Promise<{ recovered: boolean; evidenceDir: string }> {
  const writer = await EvidenceWriter.create({
    evidenceDir: config.evidenceDir,
    action: "broken_selector_demo",
    input: { fixture: true }
  });
  const session = await createBrowserSession({ headless: config.headless });

  try {
    await session.page.setContent(appsmithLikeFixtureHtml());
    const result = await runBrokenSelectorRecoveryOnPage(session.page, {
      planner: config.openaiApiKey
        ? (request) =>
            planSelectorRepairWithOpenAI({
              apiKey: config.openaiApiKey!,
              model: config.openaiModel,
              ...request
            })
        : undefined
    });
    await writer.writeText("llm/snapshot.redacted.txt", result.snapshot);
    await writer.writeJson("llm/plan.json", result.plan);
    await writer.writeJson("llm/validation.json", {
      source: result.planSource,
      model: result.planSource === "openai" ? config.openaiModel : "fixture"
    });
    await session.page.screenshot({ path: writer.screenshotPath("broken-selector-recovered") });
    await writer.writeAuditEvent(makeSuccessEvent(writer, config.adminEmail ?? "fixture", "broken_selector_demo", result));
    return { recovered: result.recovered, evidenceDir: writer.bundle.rootDir };
  } finally {
    await session.close(writer.tracePath("trace.zip"));
  }
}

export async function gotoUserManagement(page: Page, baseUrl: string): Promise<void> {
  const candidates = ["/settings/user-management", "/settings/users", "/admin/users", "/applications"];
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      await page.goto(joinUrl(baseUrl, candidate), { waitUntil: "domcontentloaded", timeout: 15_000 });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
      const bodyText = await page.locator("body").innerText({ timeout: 3_000 }).catch(() => "");
      if (/user|member|admin|application/i.test(bodyText)) return;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Could not open an Appsmith user-management page. Last error: ${(lastError as Error)?.message ?? "none"}`);
}

async function clickByRoleNames(page: Page, names: string[]): Promise<void> {
  for (const name of names) {
    const button = page.getByRole("button", { name: new RegExp(name, "i") }).first();
    if ((await button.count()) > 0) {
      await button.click({ noWaitAfter: true });
      return;
    }
  }
  throw new Error(`Could not find any button matching: ${names.join(", ")}`);
}

async function fillFirstAvailable(page: Page, locators: Array<() => ReturnType<Page["locator"]>>, value: string): Promise<void> {
  let lastError: unknown;

  for (const makeLocator of locators) {
    try {
      const locator = makeLocator().first();
      await locator.waitFor({ state: "visible", timeout: 5_000 });
      await locator.fill(value, { timeout: 5_000 });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Could not fill login field. Last error: ${(lastError as Error)?.message ?? "none"}`);
}

async function fillFirstVisibleIfPresent(
  page: Page,
  locators: Array<() => ReturnType<Page["locator"]>>,
  value: string
): Promise<boolean> {
  for (const makeLocator of locators) {
    try {
      const locator = makeLocator().first();
      await locator.waitFor({ state: "visible", timeout: 1_000 });
      await locator.fill(value, { timeout: 5_000 });
      return true;
    } catch {
      // Optional onboarding fields differ across Appsmith versions.
    }
  }

  return false;
}

async function completeFirstAdminSignup(page: Page, config: AppsmithConfig): Promise<void> {
  await fillFirstVisibleIfPresent(page, [
    () => page.getByLabel(/first name/i),
    () => page.getByPlaceholder(/john/i),
    () => page.locator("input[name*='first' i]").first()
  ], "Access");
  await fillFirstVisibleIfPresent(page, [
    () => page.getByLabel(/last name/i),
    () => page.getByPlaceholder(/doe/i),
    () => page.locator("input[name*='last' i]").first()
  ], "Admin");
  await fillFirstAvailable(page, [
    () => page.getByLabel(/^email$/i),
    () => page.getByPlaceholder(/email|reach/i),
    () => page.getByRole("textbox", { name: /email/i }),
    () => page.locator("input[type='email'], input[name*='email' i]").first()
  ], config.adminEmail!);

  const passwordFields = page.locator("input[type='password']");
  const passwordCount = await passwordFields.count();
  if (passwordCount > 0) {
    for (let index = 0; index < passwordCount; index += 1) {
      await passwordFields.nth(index).fill(config.adminPassword!, { timeout: 5_000 });
    }
  } else {
    await fillFirstAvailable(page, [
      () => page.getByLabel(/password/i),
      () => page.getByPlaceholder(/password|strong/i)
    ], config.adminPassword!);
  }

  await clickByRoleNames(page, ["continue", "sign up", "create account"]);
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
  await advanceOptionalOnboarding(page);
}

async function waitForLoginPageOrKnownState(page: Page): Promise<void> {
  await waitForPageCondition(page, isLoginPageKnownState);
}

async function waitForSignupPageOrKnownState(page: Page): Promise<void> {
  await waitForPageCondition(page, isSignupPageKnownState);
}

async function waitForPageCondition(page: Page, condition: () => boolean): Promise<void> {
  const deadline = Date.now() + APPSMITH_READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const ready = await page.evaluate(condition).catch(() => false);
    if (ready) return;

    await page.reload({ waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => undefined);
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await sleep(APPSMITH_READY_POLL_MS);
  }
}

function isLoginPageKnownState(): boolean {
  const bodyText = document.body?.innerText ?? "";
  const pathname = window.location.pathname;
  const hasLoginInput = Boolean(document.querySelector("input[type='email'], input[type='password']"));

  return (
    hasLoginInput ||
    pathname === "/applications" ||
    pathname.startsWith("/app/") ||
    pathname.startsWith("/settings/") ||
    pathname.startsWith("/setup/") ||
    /sign in to your account|create your account|almost there/i.test(bodyText)
  );
}

function isSignupPageKnownState(): boolean {
  const bodyText = document.body?.innerText ?? "";
  const pathname = window.location.pathname;
  const hasSignupInput = Boolean(
    document.querySelector(
      "input[type='email'], input[type='password'], input[placeholder*='John'], input[placeholder*='reach' i]"
    )
  );

  return (
    hasSignupInput ||
    pathname === "/applications" ||
    pathname.startsWith("/app/") ||
    pathname.startsWith("/settings/") ||
    /already\s+(an?\s+)?account\s+registered|please\s+sign\s+in\s+instead|create your account|almost there/i.test(
      bodyText
    ) ||
    window.location.search.includes("error=")
  );
}

async function assertSignupFormAvailable(page: Page): Promise<void> {
  const hasInput = (await page.locator("input[type='email'], input[type='password']").count()) > 0;
  if (hasInput || (await isAuthenticated(page))) return;

  throw new Error(
    "Appsmith signup is not available on this instance. If an admin account already exists, run npm run appsmith:login instead of npm run appsmith:signup-admin."
  );
}

async function assertLoginFormAvailable(page: Page): Promise<void> {
  const hasInput = (await page.locator("input[type='email'], input[type='password']").count()) > 0;
  if (hasInput || (await isAuthenticated(page))) return;

  const url = page.url();
  if (/\/setup\//i.test(url)) {
    throw new Error(
      "Appsmith onboarding is not complete on this instance. For a fresh local volume, run npm run appsmith:signup-admin first."
    );
  }

  throw new Error(
    "Appsmith login did not render a login form. Check that Appsmith has finished booting, then run npm run appsmith:login again."
  );
}

async function advanceOptionalOnboarding(page: Page): Promise<void> {
  for (let step = 0; step < 4; step += 1) {
    if (await isAuthenticated(page)) return;

    await selectOptionalOnboardingChoices(page);
    const advanced = await clickFirstOptionalButton(page, ["skip", "continue", "get started", "start building", "finish"]);
    if (!advanced) return;
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  }
}

async function selectOptionalOnboardingChoices(page: Page): Promise<void> {
  await clickOptionalChoice(page, ["Intermediate", "Advanced", "Novice"]);
  await clickOptionalChoice(page, ["Work Project", "Personal Project"]);
}

async function clickOptionalChoice(page: Page, names: string[]): Promise<boolean> {
  for (const name of names) {
    const button = buttonByText(page, name).first();
    if ((await button.count()) > 0 && (await button.isVisible().catch(() => false))) {
      await button.click({ timeout: 5_000 });
      await page.waitForTimeout(250);
      return true;
    }
  }

  return false;
}

async function clickFirstOptionalButton(page: Page, names: string[]): Promise<boolean> {
  for (const name of names) {
    const button = buttonByText(page, name).first();
    if ((await button.count()) > 0 && (await button.isVisible().catch(() => false))) {
      await button.click({ timeout: 5_000 });
      return true;
    }
  }

  return false;
}

function buttonByText(page: Page, name: string) {
  const exactText = new RegExp(`^\\s*${escapeRegExp(name)}\\s*$`, "i");
  return page.locator("button").filter({ hasText: exactText });
}

async function assertAuthenticated(page: Page): Promise<void> {
  if (await isAuthenticated(page)) return;

  const url = page.url();
  const bodyText = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
  if (isExistingAppsmithAccountSignupError(url, bodyText)) {
    throw new Error(
      "An Appsmith admin account already exists for the configured email. Run npm run appsmith:login instead of npm run appsmith:signup-admin."
    );
  }

  throw new Error(
    `Appsmith did not authenticate with the configured credentials. Current URL: ${url}. If this is a fresh local instance, run npm run appsmith:signup-admin first.`
  );
}

async function isAuthenticated(page: Page): Promise<boolean> {
  const url = page.url();
  const bodyText = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
  return (
    isAuthenticatedAppsmithUrl(url) &&
    !/sign in to your account|create your account|let's setup your account first/i.test(bodyText)
  );
}

export function isAuthenticatedAppsmithUrl(url: string): boolean {
  const pathname = new URL(url).pathname;
  return pathname === "/applications" || pathname.startsWith("/app/") || pathname.startsWith("/settings/");
}

async function assertNoExistingAccountSignupError(page: Page): Promise<void> {
  const bodyText = await page.locator("body").innerText({ timeout: 3_000 }).catch(() => "");
  if (isExistingAppsmithAccountSignupError(page.url(), bodyText)) {
    throw new Error(
      "An Appsmith admin account already exists for the configured email. Run npm run appsmith:login instead of npm run appsmith:signup-admin."
    );
  }
}

export function isExistingAppsmithAccountSignupError(url: string, bodyText = ""): boolean {
  let errorText = "";
  try {
    errorText = new URL(url).searchParams.get("error") ?? "";
  } catch {
    errorText = "";
  }

  const text = `${errorText} ${bodyText}`;
  return /already\s+(an?\s+)?account\s+registered|already\s+registered|please\s+sign\s+in\s+instead/i.test(text);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function joinUrl(baseUrl: string, pathname: string): string {
  return new URL(pathname, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

function makeDryRunEvent(
  writer: EvidenceWriter,
  email: string,
  action: "invite_user" | "deprovision_user",
  input: Record<string, unknown>
) {
  return AuditEventSchema.parse({
    runId: writer.bundle.runId,
    targetApp: "appsmith",
    action,
    actor: { type: "service_account", email },
    input,
    result: "dry_run",
    artifacts: { screenshots: writer.bundle.screenshots, logs: writer.bundle.logs },
    startedAt: writer.bundle.createdAt,
    completedAt: new Date().toISOString()
  });
}

function makeSuccessEvent(
  writer: EvidenceWriter,
  email: string,
  action: "invite_user" | "deprovision_user" | "api_replay_sync" | "broken_selector_demo",
  input: Record<string, unknown>
) {
  return AuditEventSchema.parse({
    runId: writer.bundle.runId,
    targetApp: "appsmith",
    action,
    actor: { type: "service_account", email },
    input,
    result: "success",
    artifacts: { screenshots: writer.bundle.screenshots, logs: writer.bundle.logs },
    startedAt: writer.bundle.createdAt,
    completedAt: new Date().toISOString()
  });
}

export async function ensureStorageDir(config: AppsmithConfig): Promise<void> {
  await mkdir(path.dirname(config.storageStatePath), { recursive: true });
}

async function waitForAppsmithHttp(baseUrl: string, timeoutMs = APPSMITH_READY_TIMEOUT_MS): Promise<Response> {
  const deadline = Date.now() + timeoutMs;
  let lastError = "no response yet";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, {
        method: "GET",
        signal: AbortSignal.timeout(5_000)
      });

      if (response.status < 500) return response;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = (error as Error).message;
    }

    await sleep(APPSMITH_READY_POLL_MS);
  }

  throw new Error(
    `Appsmith is not ready at ${baseUrl} after ${Math.round(timeoutMs / 1000)}s. Last error: ${lastError}`
  );
}

async function gotoAppsmithPath(page: Page, baseUrl: string, pathname: string): Promise<void> {
  const url = joinUrl(baseUrl, pathname);
  const deadline = Date.now() + APPSMITH_READY_TIMEOUT_MS;
  let lastError = "navigation did not start";

  while (Date.now() < deadline) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
      return;
    } catch (error) {
      lastError = (error as Error).message;
      await sleep(APPSMITH_READY_POLL_MS);
    }
  }

  throw new Error(`Could not open ${url} after ${Math.round(APPSMITH_READY_TIMEOUT_MS / 1000)}s. Last error: ${lastError}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
