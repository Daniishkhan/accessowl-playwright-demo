import {
  clickFirstVisible,
  closeScenarioSession,
  createScenarioRun,
  goToApplications,
  launchScenarioSession,
  screenshot
} from "./_lib.js";

const run = await createScenarioRun("04-locator-resilience");
const session = await launchScenarioSession(run);

try {
  await goToApplications(session.page);

  const clickedWith = await clickFirstVisible([
    ["role:create-new", () => session.page.getByRole("button", { name: /create new/i })],
    ["role:new", () => session.page.getByRole("button", { name: /^new$/i })],
    ["text:create", () => session.page.getByText(/create/i)]
  ]);

  await session.page.getByText(/^Application$/).waitFor();
  const screenshotPath = await screenshot(session.page, run, "01-create-menu.png");
  console.log(`Clicked Create New via ${clickedWith}`);

  await closeScenarioSession(run, session, {
    result: "success",
    clickedWith,
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
