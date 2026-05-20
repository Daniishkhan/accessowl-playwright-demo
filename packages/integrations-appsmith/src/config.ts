import { AppsmithConfigSchema, type AppsmithConfig } from "../../core/src/index.js";

export function loadAppsmithConfig(env: NodeJS.ProcessEnv = process.env): AppsmithConfig {
  return AppsmithConfigSchema.parse({
    baseUrl: env.APPSMITH_BASE_URL ?? "http://localhost:8080",
    adminEmail: env.APPSMITH_ADMIN_EMAIL,
    adminPassword: env.APPSMITH_ADMIN_PASSWORD,
    storageStatePath: env.STORAGE_STATE_PATH ?? "playwright/.auth/appsmith-admin.json",
    evidenceDir: env.EVIDENCE_DIR ?? "evidence/runs",
    headless: env.HEADLESS !== "false",
    openaiApiKey: env.OPENAI_API_KEY || undefined,
    openaiModel: env.OPENAI_MODEL || "gpt-5-mini"
  });
}

export function requireAppsmithCredentials(config: AppsmithConfig): void {
  if (!config.adminEmail || !config.adminPassword || config.adminPassword === "replace_me") {
    throw new Error("APPSMITH_ADMIN_EMAIL and APPSMITH_ADMIN_PASSWORD must be set in .env for this command.");
  }
}
