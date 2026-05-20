import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  closeScenarioSession,
  createScenarioRun,
  goToApplications,
  launchScenarioSession,
  screenshot
} from "./_lib.js";

const run = await createScenarioRun("05-traces-and-evidence");
const session = await launchScenarioSession(run);

try {
  const firstScreenshot = await screenshot(session.page, run, "01-start.png");
  await goToApplications(session.page);
  const secondScreenshot = await screenshot(session.page, run, "02-applications.png");

  await writeFile(
    path.join(run.dir, "notes.txt"),
    "This run intentionally captures screenshots before and after navigation so the trace has useful context.\n",
    "utf8"
  );

  console.log(`Evidence folder: ${run.dir}`);

  await closeScenarioSession(run, session, {
    result: "success",
    finalUrl: session.page.url(),
    screenshots: [firstScreenshot, secondScreenshot]
  });
} catch (error) {
  await closeScenarioSession(run, session, {
    result: "failure",
    error: (error as Error).message,
    finalUrl: session.page.url()
  });
  throw error;
}
