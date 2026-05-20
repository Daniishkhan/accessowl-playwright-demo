import { closeScenarioSession, createScenarioRun, goToApplications, launchScenarioSession, screenshot } from "./_lib.js";

const run = await createScenarioRun("01-auth-check");
const session = await launchScenarioSession(run);

try {
  await goToApplications(session.page);
  const screenshotPath = await screenshot(session.page, run, "01-auth-check.png");
  console.log(`Authenticated at ${session.page.url()}`);
  console.log(`Screenshot: ${screenshotPath}`);
  await closeScenarioSession(run, session, {
    result: "success",
    finalUrl: session.page.url(),
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
