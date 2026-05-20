import path from "node:path";
import { request, type Request } from "playwright";
import {
  baseUrl,
  closeScenarioSession,
  createScenarioRun,
  demoPauseMs,
  editorUrl,
  ensureDemoApp,
  launchScenarioSession,
  pauseForDemo,
  safeHeaders,
  screenshot,
  storageStatePath,
  writeJson,
  type AppsmithApplication
} from "./_lib.js";

const DEMO_APP_NAME = "Access Review Demo";
const DEMO_ROWS = [
  { employee: "Maya Chen", app: "Notion", role: "Editor", status: "Needs review" },
  { employee: "Omar Khan", app: "Figma", role: "Viewer", status: "Keep access" },
  { employee: "Lena Ortiz", app: "Jira", role: "Admin", status: "Remove access" }
];

type PageLayout = {
  pageId: string;
  applicationId: string;
  layoutId: string;
  dsl: Record<string, any>;
};

const run = await createScenarioRun("08-guided-appsmith-demo");
const session = await launchScenarioSession(run, {
  headless: shouldRunGuidedDemoHeadless(),
  slowMo: shouldRunGuidedDemoHeadless() ? undefined : 75
});
const pauseMs = demoPauseMs();
const observed: Array<Record<string, unknown>> = [];

session.page.on("requestfinished", async (request: Request) => {
  if (!/api\/v1\/(applications|layouts|pages|publish|usage-pulse)/i.test(request.url())) return;

  const response = await request.response();
  observed.push({
    method: request.method(),
    url: request.url(),
    status: response?.status(),
    resourceType: request.resourceType(),
    headers: safeHeaders(request.headers())
  });
});

try {
  console.log("Step 1/6: prepare the local Appsmith demo app.");
  const app = await ensureDemoApp(DEMO_APP_NAME);
  await resetDemoCanvas(app);

  console.log("Step 2/6: open the Appsmith editor with saved Playwright auth.");
  await session.page.goto(editorUrl(app), { waitUntil: "domcontentloaded" });
  await session.page.waitForLoadState("networkidle").catch(() => undefined);
  await waitForWidgetPalette();
  await screenshot(session.page, run, "01-empty-editor.png");
  await pauseForDemo("Empty Appsmith editor is ready", pauseMs);

  console.log("Step 3/6: drag real Appsmith widgets onto the canvas.");
  await dragWidget(".t--widget-card-draggable-textwidget", { x: 500, y: 180 });
  await openWidgetPalette();
  await dragWidget(".t--widget-card-draggable-tablewidgetv2", { x: 620, y: 340 });
  await openWidgetPalette();
  await dragWidget(".t--widget-card-draggable-inputwidgetv2", { x: 520, y: 560 });
  await openWidgetPalette();
  await dragWidget(".t--widget-card-draggable-buttonwidget", { x: 760, y: 560 });
  await screenshot(session.page, run, "02-widgets-dropped.png");
  await pauseForDemo("Widgets have been dragged onto the canvas", pauseMs);

  console.log("Step 4/6: label and arrange the widgets for an access-review demo.");
  const layout = await loadPageLayout(app);
  const checks = configureAccessReviewWidgets(layout.dsl);
  await savePageLayout(layout);
  await session.page.reload({ waitUntil: "domcontentloaded" });
  await session.page.waitForLoadState("networkidle").catch(() => undefined);
  await session.page.getByText(/access review queue/i).waitFor();
  await screenshot(session.page, run, "03-configured-editor.png");
  await pauseForDemo("Configured Appsmith editor is visible", pauseMs);

  console.log("Step 5/6: deploy the Appsmith app from the UI.");
  await session.page.getByRole("button", { name: /deploy/i }).click();
  await session.page.waitForTimeout(8_000);
  await screenshot(session.page, run, "04-after-deploy.png");
  await pauseForDemo("Deploy action completed", pauseMs);

  console.log("Step 6/6: open and verify the deployed app.");
  const deployedUrl = editorUrl(app).replace(/\/edit(?:\?.*)?$/, "");
  await session.page.goto(deployedUrl, { waitUntil: "domcontentloaded" });
  await session.page.waitForLoadState("networkidle").catch(() => undefined);
  await session.page.getByText(/access review queue/i).waitFor();
  await session.page.getByText(/review access/i).waitFor();
  const deployedScreenshot = await screenshot(session.page, run, "05-deployed-app.png");
  const networkPath = path.join(run.dir, "network-observed.redacted.json");
  await writeJson(networkPath, observed);
  await writeJson(path.join(run.dir, "dummy-access-rows.json"), DEMO_ROWS);
  await pauseForDemo("Deployed app is open", pauseMs);

  console.log("");
  console.log("Guided Appsmith demo complete.");
  console.log(`App: ${app.name}`);
  console.log(`Editor URL: ${editorUrl(app)}`);
  console.log(`Deployed URL: ${deployedUrl}`);
  console.log(`Evidence: ${run.dir}`);

  await closeScenarioSession(run, session, {
    result: "success",
    app: { id: app.id, name: app.name, slug: app.slug },
    editorUrl: editorUrl(app),
    deployedUrl,
    widgetChecks: checks,
    observedRequests: observed.length,
    networkSummary: networkPath,
    screenshot: deployedScreenshot
  });
} catch (error) {
  await screenshot(session.page, run, "error.png").catch(() => undefined);
  await writeJson(path.join(run.dir, "network-observed.redacted.json"), observed).catch(() => undefined);
  await closeScenarioSession(run, session, {
    result: "failure",
    error: (error as Error).message,
    finalUrl: session.page.url(),
    observedRequests: observed.length
  });
  throw error;
}

function shouldRunGuidedDemoHeadless(): boolean {
  if (process.env.SCENARIO_HEADLESS !== undefined) {
    return process.env.SCENARIO_HEADLESS === "true";
  }

  return false;
}

async function waitForWidgetPalette(): Promise<void> {
  await session.page.getByText(/drag & drop ui elements/i).waitFor({ timeout: 20_000 });
}

async function openWidgetPalette(): Promise<void> {
  const newUiButton = session.page.getByRole("button", { name: /new ui element/i }).first();
  if (await newUiButton.isVisible().catch(() => false)) {
    await newUiButton.click();
  }

  await waitForWidgetPalette();
}

async function dragWidget(selector: string, target: { x: number; y: number }): Promise<void> {
  const source = await session.page.locator(selector).first().boundingBox();
  if (!source) {
    throw new Error(`Could not find draggable widget source: ${selector}`);
  }

  await session.page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await session.page.mouse.down();
  await session.page.mouse.move(305, target.y, { steps: 8 });
  await session.page.mouse.move(target.x, target.y, { steps: 20 });
  await session.page.mouse.up();
  await session.page.waitForTimeout(4_000);
}

async function loadPageLayout(app: AppsmithApplication): Promise<PageLayout> {
  const pageId = defaultPageId(app);
  const api = await request.newContext({ baseURL: baseUrl(), storageState: storageStatePath() });
  try {
    const response = await api.get(`/api/v1/pages/${pageId}`);
    if (!response.ok()) {
      throw new Error(`Failed to load Appsmith page layout: ${response.status()} ${response.statusText()}`);
    }

    const json = (await response.json()) as {
      data: { id: string; applicationId: string; layouts: Array<{ id: string; dsl: Record<string, any> }> };
    };
    const layout = json.data.layouts[0];
    if (!layout) throw new Error(`Page ${pageId} has no layout.`);

    return {
      pageId: json.data.id,
      applicationId: json.data.applicationId,
      layoutId: layout.id,
      dsl: layout.dsl
    };
  } finally {
    await api.dispose();
  }
}

async function savePageLayout(layout: PageLayout): Promise<void> {
  const api = await request.newContext({ baseURL: baseUrl(), storageState: storageStatePath() });
  try {
    const response = await api.put(`/api/v1/layouts/${layout.layoutId}/pages/${layout.pageId}`, {
      params: { applicationId: layout.applicationId },
      data: { dsl: layout.dsl }
    });
    if (!response.ok()) {
      throw new Error(`Failed to save Appsmith page layout: ${response.status()} ${response.statusText()}`);
    }
  } finally {
    await api.dispose();
  }
}

async function resetDemoCanvas(app: AppsmithApplication): Promise<void> {
  const layout = await loadPageLayout(app);
  layout.dsl.children = [];
  await savePageLayout(layout);
}

function configureAccessReviewWidgets(dsl: Record<string, any>): Record<string, unknown> {
  const children = Array.isArray(dsl.children) ? dsl.children : [];
  const title = findWidget(children, "TEXT_WIDGET");
  const table = findWidget(children, "TABLE_WIDGET_V2");
  const input = findWidget(children, "INPUT_WIDGET_V2");
  const button = findWidget(children, "BUTTON_WIDGET");

  Object.assign(title, {
    text: "Access Review Queue",
    leftColumn: 1,
    rightColumn: 44,
    topRow: 4,
    bottomRow: 9,
    fontStyle: "BOLD",
    fontSize: "1.25rem"
  });
  title.dynamicBindingPathList = withoutDynamicPath(title.dynamicBindingPathList, "text");

  Object.assign(table, {
    label: "Access requests",
    leftColumn: 1,
    rightColumn: 48,
    topRow: 13,
    bottomRow: 42
  });

  Object.assign(input, {
    label: "Reviewer email",
    placeholderText: "reviewer@example.com",
    leftColumn: 1,
    rightColumn: 24,
    topRow: 46,
    bottomRow: 53
  });

  Object.assign(button, {
    text: "Review access",
    leftColumn: 27,
    rightColumn: 43,
    topRow: 47,
    bottomRow: 51
  });

  return {
    title: title.widgetName,
    table: table.widgetName,
    input: input.widgetName,
    button: button.widgetName,
    dummyRows: DEMO_ROWS.length
  };
}

function findWidget(children: Array<Record<string, any>>, type: string): Record<string, any> {
  const widget = children.find((child) => child.type === type);
  if (!widget) throw new Error(`Expected dragged widget type ${type} to be present.`);
  return widget;
}

function withoutDynamicPath(paths: unknown, key: string): unknown[] {
  if (!Array.isArray(paths)) return [];
  return paths.filter((pathValue) => !pathValue || pathValue.key !== key);
}

function defaultPageId(app: AppsmithApplication): string {
  const page = app.pages.find((candidate) => candidate.isDefault) ?? app.pages[0];
  if (!page) throw new Error(`Application ${app.name} has no page.`);
  return page.id;
}
