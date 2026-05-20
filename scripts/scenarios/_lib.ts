import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, request, type Browser, type BrowserContext, type Locator, type Page } from "playwright";
import { redactHeaders } from "../../packages/core/src/index.js";

export type ScenarioRun = {
  id: string;
  name: string;
  dir: string;
  screenshotsDir: string;
  startedAt: string;
};

export type ScenarioSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
};

export type LaunchScenarioSessionOptions = {
  headless?: boolean;
  slowMo?: number;
};

export type AppsmithApplication = {
  id: string;
  name: string;
  slug: string;
  pages: Array<{ id: string; isDefault?: boolean; baseId?: string }>;
  workspaceId: string;
};

export function baseUrl(): string {
  return process.env.APPSMITH_BASE_URL ?? "http://localhost:8080";
}

export function storageStatePath(): string {
  return process.env.STORAGE_STATE_PATH ?? "playwright/.auth/appsmith-admin.json";
}

export function shouldRunHeadless(): boolean {
  return scenarioHeadless(process.env);
}

export function scenarioHeadless(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.SCENARIO_HEADLESS !== undefined) {
    return env.SCENARIO_HEADLESS === "true";
  }

  return env.HEADLESS === "true";
}

export function demoPauseMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.DEMO_PAUSE_MS;
  if (raw === undefined || raw.trim() === "") return 3_000;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("DEMO_PAUSE_MS must be a non-negative number of milliseconds.");
  }

  return parsed;
}

export async function pauseForDemo(label: string, ms = demoPauseMs()): Promise<void> {
  if (ms <= 0) return;
  console.log(`${label} - pausing ${ms}ms so the browser is easy to follow.`);
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createScenarioRun(name: string): Promise<ScenarioRun> {
  const id = `${new Date().toISOString().replace(/[:.]/g, "")}-${name}`;
  const dir = path.resolve("evidence/scenarios", id);
  const screenshotsDir = path.join(dir, "screenshots");
  await mkdir(screenshotsDir, { recursive: true });
  return {
    id,
    name,
    dir,
    screenshotsDir,
    startedAt: new Date().toISOString()
  };
}

export async function launchScenarioSession(
  run: ScenarioRun,
  options: LaunchScenarioSessionOptions = {}
): Promise<ScenarioSession> {
  const browser = await chromium.launch({
    headless: options.headless ?? shouldRunHeadless(),
    slowMo: options.slowMo
  });
  const context = await browser.newContext({
    storageState: storageStatePath(),
    viewport: { width: 1440, height: 900 }
  });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  return { browser, context, page };
}

export async function closeScenarioSession(
  run: ScenarioRun,
  session: ScenarioSession,
  result: Record<string, unknown>
): Promise<void> {
  const completedAt = new Date().toISOString();
  await writeJson(path.join(run.dir, "run.json"), {
    runId: run.id,
    name: run.name,
    startedAt: run.startedAt,
    completedAt,
    ...result
  });

  try {
    await session.context.tracing.stop({ path: path.join(run.dir, "trace.zip") });
  } finally {
    await session.context.close().catch(() => undefined);
    await session.browser.close().catch(() => undefined);
  }
}

export async function goToApplications(page: Page): Promise<void> {
  await page.goto(new URL("/applications", baseUrl()).toString(), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  assertAuthenticated(page);
}

export function assertAuthenticated(page: Page): void {
  if (/\/user\/login/i.test(page.url())) {
    throw new Error("Not authenticated. Run npm run appsmith:login first.");
  }
}

export async function visibleButtonNames(page: Page): Promise<string[]> {
  const names = await page.locator("button").allTextContents();
  return names.map((name) => name.trim()).filter(Boolean);
}

export async function screenshot(page: Page, run: ScenarioRun, name: string): Promise<string> {
  const filePath = path.join(run.screenshotsDir, name.endsWith(".png") ? name : `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function clickFirstVisible(candidates: Array<[string, () => Locator]>): Promise<string> {
  for (const [name, makeLocator] of candidates) {
    const locator = makeLocator().first();
    if ((await locator.count()) > 0 && (await locator.isVisible().catch(() => false))) {
      await locator.click();
      return name;
    }
  }

  throw new Error("No candidate locator was visible.");
}

export async function listApplications(): Promise<AppsmithApplication[]> {
  const api = await request.newContext({ baseURL: baseUrl(), storageState: storageStatePath() });
  try {
    const workspaceId = await getDefaultWorkspaceId(api);
    const response = await api.get(`/api/v1/applications/home?workspaceId=${workspaceId}`);
    if (!response.ok()) {
      throw new Error(`Failed to list applications: ${response.status()} ${response.statusText()}`);
    }
    const json = (await response.json()) as { data?: AppsmithApplication[] };
    return json.data ?? [];
  } finally {
    await api.dispose();
  }
}

export async function ensureDemoApp(name = "Access Automation Demo"): Promise<AppsmithApplication> {
  const api = await request.newContext({ baseURL: baseUrl(), storageState: storageStatePath() });
  try {
    const workspaceId = await getDefaultWorkspaceId(api);
    const existing = await listApplications();
    const match = existing.find((app) => app.name.toLowerCase() === name.toLowerCase());
    if (match) return match;

    const response = await api.post("/api/v1/applications", {
      data: {
        workspaceId,
        name,
        color: "#ECECEC",
        icon: "rocket",
        positioningType: "FIXED",
        showNavbar: null
      }
    });
    if (!response.ok()) {
      throw new Error(`Failed to create demo app: ${response.status()} ${response.statusText()}`);
    }

    const json = (await response.json()) as { data: AppsmithApplication };
    return json.data;
  } finally {
    await api.dispose();
  }
}

export function editorUrl(app: AppsmithApplication): string {
  const defaultPage = app.pages.find((page) => page.isDefault) ?? app.pages[0];
  if (!defaultPage) {
    throw new Error(`Application ${app.name} has no pages.`);
  }
  return new URL(`/app/${app.slug}/page1-${defaultPage.id}/edit`, baseUrl()).toString();
}

export function safeHeaders(headers: Record<string, string>): Record<string, string> {
  return redactHeaders(headers);
}

async function getDefaultWorkspaceId(api: Awaited<ReturnType<typeof request.newContext>>): Promise<string> {
  const response = await api.get("/api/v1/workspaces/home");
  if (!response.ok()) {
    throw new Error(`Failed to load workspaces: ${response.status()} ${response.statusText()}`);
  }

  const json = (await response.json()) as { data?: Array<{ id: string }> };
  const workspaceId = json.data?.[0]?.id;
  if (!workspaceId) {
    throw new Error("No Appsmith workspace found.");
  }

  return workspaceId;
}
