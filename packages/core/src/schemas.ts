import { z } from "zod";

export const AppsmithConfigSchema = z.object({
  baseUrl: z.string().url(),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(1).optional(),
  storageStatePath: z.string().min(1).default("playwright/.auth/appsmith-admin.json"),
  evidenceDir: z.string().min(1).default("evidence/runs"),
  headless: z.boolean().default(true),
  openaiApiKey: z.string().min(1).optional(),
  openaiModel: z.string().min(1).default("gpt-5-mini")
});

export type AppsmithConfig = z.infer<typeof AppsmithConfigSchema>;

export const NormalizedUserSchema = z.object({
  id: z.string().optional(),
  email: z.string().email(),
  name: z.string().optional(),
  status: z.enum(["active", "invited", "inactive", "removed", "unknown"]).default("unknown"),
  roles: z.array(z.string()).default([]),
  groups: z.array(z.string()).default([]),
  source: z.enum(["browser", "internal_api", "fixture"]),
  raw: z.unknown().optional()
});

export type NormalizedUser = z.infer<typeof NormalizedUserSchema>;

export const AuditEventSchema = z.object({
  runId: z.string().min(1),
  targetApp: z.literal("appsmith"),
  action: z.enum([
    "setup_check",
    "login",
    "sync_users",
    "structure_sync",
    "invite_user",
    "change_access",
    "deprovision_user",
    "api_replay_sync",
    "broken_selector_demo"
  ]),
  actor: z.object({
    type: z.literal("service_account"),
    email: z.string()
  }),
  input: z.record(z.string(), z.unknown()).default({}),
  result: z.enum(["success", "failure", "dry_run", "needs_human"]),
  before: z.array(NormalizedUserSchema).optional(),
  after: z.array(NormalizedUserSchema).optional(),
  artifacts: z.object({
    screenshots: z.array(z.string()).default([]),
    traceZip: z.string().optional(),
    logs: z.array(z.string()).default([]),
    llmPlan: z.string().optional()
  }),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  error: z
    .object({
      message: z.string(),
      stepId: z.string().optional(),
      screenshot: z.string().optional()
    })
    .optional()
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

export const EvidenceBundleSchema = z.object({
  runId: z.string().min(1),
  rootDir: z.string().min(1),
  targetApp: z.literal("appsmith"),
  action: AuditEventSchema.shape.action,
  createdAt: z.string().datetime(),
  files: z.array(z.string()).default([]),
  screenshots: z.array(z.string()).default([]),
  logs: z.array(z.string()).default([]),
  traces: z.array(z.string()).default([])
});

export type EvidenceBundle = z.infer<typeof EvidenceBundleSchema>;

const ClickActionSchema = z.object({
  type: z.literal("click"),
  targetDescription: z.string().min(1),
  locator: z.string().optional(),
  role: z.string().optional(),
  nameRegex: z.string().optional()
});

const FillActionSchema = z.object({
  type: z.literal("fill"),
  targetDescription: z.string().min(1),
  valueRef: z.string().min(1),
  locator: z.string().optional(),
  role: z.string().optional(),
  nameRegex: z.string().optional()
});

const SelectActionSchema = z.object({
  type: z.literal("select"),
  targetDescription: z.string().min(1),
  valueRef: z.string().min(1),
  locator: z.string().optional(),
  role: z.string().optional(),
  nameRegex: z.string().optional()
});

const WaitForActionSchema = z.object({
  type: z.literal("waitFor"),
  condition: z.enum(["url", "text", "network_idle", "visible"]),
  value: z.string().min(1)
});

export const ActionPlanSchema = z.object({
  confidence: z.number().min(0).max(1),
  reasonSummary: z.string().max(800),
  riskLevel: z.enum(["low", "medium", "high"]),
  requiresHumanApproval: z.boolean(),
  actions: z
    .array(
      z.discriminatedUnion("type", [
        ClickActionSchema,
        FillActionSchema,
        SelectActionSchema,
        WaitForActionSchema
      ])
    )
    .max(8)
});

export type ActionPlan = z.infer<typeof ActionPlanSchema>;
export type ActionPlanAction = ActionPlan["actions"][number];
