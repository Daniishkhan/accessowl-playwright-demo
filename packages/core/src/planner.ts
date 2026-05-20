import type { Locator, Page } from "playwright";
import { ActionPlanSchema, type ActionPlan } from "./schemas.js";

const UNSAFE_TEXT_RE =
  /(javascript:|page\.evaluate|eval\(|document\.|window\.|localStorage|sessionStorage|process\.env|readFile|fs\.|file:\/\/|\/etc\/|\.env)/i;
const DESTRUCTIVE_TEXT_RE = /(delete|remove|deactivate|disable|revoke|terminate|suspend|confirm)/i;

export type ActionPlanSafetyContext = {
  confirmed?: boolean;
  allowedHost?: string;
};

export type ActionPlanSafetyResult =
  | { ok: true; plan: ActionPlan; errors: [] }
  | { ok: false; plan?: ActionPlan; errors: string[] };

export function validateActionPlanSafety(
  rawPlan: unknown,
  context: ActionPlanSafetyContext = {}
): ActionPlanSafetyResult {
  const parsed = ActionPlanSchema.safeParse(rawPlan);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((issue) => issue.message) };
  }

  const plan = parsed.data;
  const errors: string[] = [];

  if (plan.confidence < 0.75) {
    errors.push("LLM plan confidence is below 0.75.");
  }
  if (plan.riskLevel === "high") {
    errors.push("High-risk LLM plans require a human review path and are rejected by this scaffold.");
  }
  if (plan.requiresHumanApproval && !context.confirmed) {
    errors.push("LLM plan requires human approval but --confirm was not provided.");
  }

  for (const action of plan.actions) {
    const actionText = JSON.stringify(action);
    if (UNSAFE_TEXT_RE.test(actionText)) {
      errors.push(`Unsafe instruction in ${action.type} action.`);
    }
    if (!context.confirmed && DESTRUCTIVE_TEXT_RE.test(actionText)) {
      errors.push(`Potentially destructive ${action.type} action requires --confirm.`);
    }
    if (action.type === "waitFor" && action.condition === "url") {
      const host = hostFromMaybeUrl(action.value);
      if (host && context.allowedHost && host !== context.allowedHost) {
        errors.push(`Off-domain URL wait rejected: ${host}.`);
      }
    }
    if ("valueRef" in action && /^(env|file|secret|process)\./i.test(action.valueRef)) {
      errors.push(`Unsafe value reference rejected: ${action.valueRef}.`);
    }
  }

  return errors.length > 0 ? { ok: false, plan, errors } : { ok: true, plan, errors: [] };
}

export async function capturePageSnapshot(page: Page): Promise<string> {
  const body = page.locator("body") as Locator & {
    ariaSnapshot?: (options?: { mode?: "ai" | "default" }) => Promise<string>;
  };

  if (typeof body.ariaSnapshot === "function") {
    const snapshot = await body.ariaSnapshot({ mode: "ai" }).catch(() => undefined);
    if (snapshot) return snapshot;
  }

  return page.locator("body").innerText({ timeout: 2_000 }).catch(() => "");
}

export async function executeActionPlan(
  page: Page,
  plan: ActionPlan,
  input: Record<string, string> = {}
): Promise<void> {
  for (const action of plan.actions) {
    if (action.type === "click") {
      await locatorForAction(page, action).click();
    }

    if (action.type === "fill") {
      await locatorForAction(page, action).fill(resolveInputRef(action.valueRef, input));
    }

    if (action.type === "select") {
      await locatorForAction(page, action).selectOption(resolveInputRef(action.valueRef, input));
    }

    if (action.type === "waitFor") {
      if (action.condition === "network_idle") {
        await page.waitForLoadState("networkidle");
      } else if (action.condition === "url") {
        await page.waitForURL(new RegExp(action.value));
      } else if (action.condition === "text") {
        await page.getByText(new RegExp(action.value, "i")).waitFor();
      } else {
        await waitForVisibleSelectorOrText(page, action.value);
      }
    }
  }
}

async function waitForVisibleSelectorOrText(page: Page, value: string): Promise<void> {
  await page
    .locator(value)
    .waitFor({ state: "visible", timeout: 2_000 })
    .catch(async () => {
      await page.getByText(new RegExp(escapeRegExp(value), "i")).waitFor({ state: "visible" });
    });
}

function locatorForAction(page: Page, action: { locator?: string; role?: string; nameRegex?: string; targetDescription: string }) {
  if (action.locator) {
    return page.locator(action.locator);
  }

  if (action.role) {
    const name = action.nameRegex ? regexFromPlanString(action.nameRegex) : undefined;
    return page.getByRole(action.role as never, name ? { name } : undefined);
  }

  return page.getByText(new RegExp(escapeRegExp(action.targetDescription), "i"));
}

function resolveInputRef(valueRef: string, input: Record<string, string>): string {
  if (!valueRef.startsWith("input.")) {
    throw new Error(`Only input.* value refs are allowed. Received ${valueRef}.`);
  }

  const key = valueRef.slice("input.".length);
  if (!(key in input)) {
    throw new Error(`Missing input value for ${valueRef}.`);
  }

  return input[key];
}

function hostFromMaybeUrl(value: string): string | undefined {
  try {
    return new URL(value).host;
  } catch {
    return undefined;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function regexFromPlanString(value: string): RegExp {
  const normalized = value.replace(/^\(\?i\)/, "");
  const match = normalized.match(/^\/(.+)\/([dgimsuvy]*)$/);
  if (match) {
    return new RegExp(match[1], match[2].includes("i") ? match[2] : `${match[2]}i`);
  }

  return new RegExp(normalized, "i");
}
