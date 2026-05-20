import {
  closeScenarioSession,
  createScenarioRun,
  goToApplications,
  launchScenarioSession,
  listApplications,
  screenshot,
  visibleButtonNames
} from "./_lib.js";

const run = await createScenarioRun("02-applications-page");
const session = await launchScenarioSession(run);

try {
  await goToApplications(session.page);
  await session.page.getByRole("button", { name: /create new/i }).waitFor();

  const apps = await listApplications();
  const bodyText = await session.page.locator("body").innerText();
  const isEmpty = /no applications/i.test(bodyText);
  const buttons = await visibleButtonNames(session.page);
  const screenshotPath = await screenshot(session.page, run, "02-applications.png");

  if (apps.length === 0 && !isEmpty) {
    throw new Error("Expected empty-state text for a workspace with no applications.");
  }

  console.log(`Applications visible: ${apps.length}`);
  console.log(`Buttons: ${buttons.join(", ")}`);

  await closeScenarioSession(run, session, {
    result: "success",
    finalUrl: session.page.url(),
    applications: apps.map((app) => app.name),
    emptyStateVisible: isEmpty,
    buttons,
    screenshot: screenshotPath
  });
} catch (error) {
  await closeScenarioSession(run, session, {
    result: "failure",
    error: (error as Error).message,
    finalUrl: session.page.url()
  });
  throw error;
}
