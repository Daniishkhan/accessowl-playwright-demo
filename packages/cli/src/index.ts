import "dotenv/config";
import { Command } from "commander";
import {
  apiReplaySync,
  authCheck,
  brokenSelectorDemo,
  deprovisionUser,
  inviteUser,
  loadAppsmithConfig,
  login,
  setupCheck,
  signupAdmin,
  syncUsers
} from "../../integrations-appsmith/src/index.js";

const program = new Command();

program.name("appsmith-access-agent").description("AccessOwl-style Appsmith automation scaffold");

const appsmith = program.command("appsmith").description("Appsmith integration commands");

appsmith.command("setup-check").description("Check whether the configured Appsmith URL is reachable").action(async () => {
  await run(async () => {
    const result = await setupCheck(loadAppsmithConfig());
    console.log(`Appsmith setup check: ${result.ok ? "ok" : "failed"} (${result.status ?? "no status"})`);
  });
});

appsmith.command("login").description("Log in and persist Playwright storage state").action(async () => {
  await run(async () => {
    const result = await login(loadAppsmithConfig());
    console.log(`Saved storage state: ${result.storageStatePath}`);
    console.log(`Evidence: ${result.evidenceDir}`);
  });
});

appsmith.command("signup-admin").description("Create the first local Appsmith admin from .env").action(async () => {
  await run(async () => {
    const result = await signupAdmin(loadAppsmithConfig());
    console.log(`Signed up local admin and saved storage state: ${result.storageStatePath}`);
    console.log(`Evidence: ${result.evidenceDir}`);
  });
});

appsmith.command("auth-check").description("Verify saved Playwright auth state still works").action(async () => {
  await run(async () => {
    const result = await authCheck(loadAppsmithConfig());
    console.log(`Auth check: ${result.ok ? "ok" : "failed"} (${result.url})`);
    console.log(`Evidence: ${result.evidenceDir}`);
  });
});

appsmith.command("sync-users").description("Sync visible users from Appsmith").action(async () => {
  await run(async () => {
    const result = await syncUsers(loadAppsmithConfig());
    console.log(`Synced ${result.users.length} user(s).`);
    console.log(`Evidence: ${result.evidenceDir}`);
  });
});

appsmith
  .command("invite")
  .description("Invite or add a user")
  .requiredOption("--email <email>", "Email to invite")
  .option("--role <role>", "Role or permission label")
  .option("--dry-run", "Write evidence without changing Appsmith")
  .action(async (options: { email: string; role?: string; dryRun?: boolean }) => {
    await run(async () => {
      const result = await inviteUser(loadAppsmithConfig(), options);
      console.log(`Invite result: ${result.result}`);
      console.log(`Evidence: ${result.evidenceDir}`);
    });
  });

appsmith
  .command("deprovision")
  .description("Deactivate or remove a user")
  .requiredOption("--email <email>", "Email to deprovision")
  .option("--confirm", "Required for non-dry-run deprovisioning")
  .option("--dry-run", "Write evidence without changing Appsmith")
  .action(async (options: { email: string; confirm?: boolean; dryRun?: boolean }) => {
    await run(async () => {
      const result = await deprovisionUser(loadAppsmithConfig(), options);
      console.log(`Deprovision result: ${result.result}`);
      console.log(`Evidence: ${result.evidenceDir}`);
    });
  });

appsmith.command("api-replay-sync").description("Observe Appsmith network calls on the owned target").action(async () => {
  await run(async () => {
    const result = await apiReplaySync(loadAppsmithConfig());
    console.log(`Observed ${result.observed} candidate request(s).`);
    console.log(`Evidence: ${result.evidenceDir}`);
  });
});

appsmith.command("broken-selector-demo").description("Run the local selector-repair fixture").action(async () => {
  await run(async () => {
    const result = await brokenSelectorDemo(loadAppsmithConfig());
    console.log(`Broken selector recovered: ${result.recovered}`);
    console.log(`Evidence: ${result.evidenceDir}`);
  });
});

program.parseAsync(process.argv);

async function run(work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}
