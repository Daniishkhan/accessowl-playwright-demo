import { closePracticeSession, createPracticeRun, goToApplications, launchPracticeSession, screenshot } from "./_lib.js";

const run = await createPracticeRun("01-auth-check");
const session = await launchPracticeSession(run);

try {
  await goToApplications(session.page);
  const screenshotPath = await screenshot(session.page, run, "01-auth-check.png");
  console.log(`Authenticated at ${session.page.url()}`);
  console.log(`Screenshot: ${screenshotPath}`);
  await closePracticeSession(run, session, {
    result: "success",
    finalUrl: session.page.url(),
    screenshot: screenshotPath
  });
} catch (error) {
  await closePracticeSession(run, session, {
    result: "failure",
    error: (error as Error).message,
    finalUrl: session.page.url()
  });
  throw error;
}
