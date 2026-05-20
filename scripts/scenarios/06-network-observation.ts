import path from "node:path";
import type { Request } from "playwright";
import {
  closeScenarioSession,
  createScenarioRun,
  goToApplications,
  launchScenarioSession,
  safeHeaders,
  screenshot,
  writeJson
} from "./_lib.js";

const run = await createScenarioRun("06-network-observation");
const session = await launchScenarioSession(run);
const observed: Array<Record<string, unknown>> = [];

session.page.on("requestfinished", async (request: Request) => {
  if (!/api|application|workspace|user/i.test(request.url())) return;

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
  await goToApplications(session.page);
  await session.page.waitForLoadState("networkidle").catch(() => undefined);
  const screenshotPath = await screenshot(session.page, run, "01-applications.png");
  const networkPath = path.join(run.dir, "network-observed.json");
  await writeJson(networkPath, observed);

  console.log(`Observed ${observed.length} relevant request(s).`);
  console.log(`Network summary: ${networkPath}`);

  await closeScenarioSession(run, session, {
    result: "success",
    observedRequests: observed.length,
    networkSummary: networkPath,
    screenshot: screenshotPath
  });
} catch (error) {
  await closeScenarioSession(run, session, {
    result: "failure",
    error: (error as Error).message,
    observedRequests: observed.length,
    finalUrl: session.page.url()
  });
  throw error;
}
