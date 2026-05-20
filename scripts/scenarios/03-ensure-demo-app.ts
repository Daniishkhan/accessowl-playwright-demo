import {
  closeScenarioSession,
  createScenarioRun,
  editorUrl,
  ensureDemoApp,
  goToApplications,
  launchScenarioSession,
  screenshot
} from "./_lib.js";

const run = await createScenarioRun("03-ensure-demo-app");
const session = await launchScenarioSession(run);

try {
  await goToApplications(session.page);
  await screenshot(session.page, run, "01-before-create.png");

  // Appsmith's UI creates an untitled app immediately. For a repeatable demo script,
  // use the authenticated API shape observed from the browser to ensure a named app.
  const app = await ensureDemoApp("Access Automation Demo");
  await session.page.goto(editorUrl(app), { waitUntil: "domcontentloaded" });
  await session.page.waitForLoadState("networkidle").catch(() => undefined);
  await session.page.getByText(/drag & drop ui elements/i).waitFor();

  const screenshotPath = await screenshot(session.page, run, "02-editor.png");
  console.log(`Demo app ready: ${app.name}`);
  console.log(`Editor URL: ${session.page.url()}`);

  await closeScenarioSession(run, session, {
    result: "success",
    app: { id: app.id, name: app.name, slug: app.slug },
    finalUrl: session.page.url(),
    screenshot: screenshotPath
  });
} catch (error) {
  await screenshot(session.page, run, "error.png").catch(() => undefined);
  await closeScenarioSession(run, session, {
    result: "failure",
    error: (error as Error).message,
    finalUrl: session.page.url()
  });
  throw error;
}
