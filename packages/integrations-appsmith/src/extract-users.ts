import type { Page } from "playwright";
import { NormalizedUserSchema, type NormalizedUser } from "../../core/src/index.js";

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const STATUS_RE = /\b(active|invited|inactive|removed)\b/i;
const ROLE_RE = /\b(admin|administrator|developer|editor|viewer|app viewer|member|owner)\b/gi;

export async function extractUsersFromPage(page: Page, source: NormalizedUser["source"] = "browser"): Promise<NormalizedUser[]> {
  const tableUsers = await extractUsersFromTables(page, source);
  if (tableUsers.length > 0) return tableUsers;

  const text = await page.locator("body").innerText({ timeout: 3_000 }).catch(() => "");
  return normalizeUsersFromText(text, source);
}

export function normalizeUsersFromText(text: string, source: NormalizedUser["source"]): NormalizedUser[] {
  const seen = new Map<string, NormalizedUser>();
  const emails = [...text.matchAll(EMAIL_RE)].map((match) => match[0].toLowerCase());

  for (const email of emails) {
    if (seen.has(email)) continue;

    const line = text
      .split(/\r?\n/)
      .find((candidate) => candidate.toLowerCase().includes(email.toLowerCase()));
    const status = line?.match(STATUS_RE)?.[1]?.toLowerCase() ?? "unknown";
    const roles = [...new Set([...(line?.matchAll(ROLE_RE) ?? [])].map((match) => match[0].toLowerCase()))];

    seen.set(
      email,
      NormalizedUserSchema.parse({
        email,
        status,
        roles,
        groups: [],
        source,
        raw: line
      })
    );
  }

  return [...seen.values()];
}

async function extractUsersFromTables(page: Page, source: NormalizedUser["source"]): Promise<NormalizedUser[]> {
  const rows = await page.locator("table tbody tr, [role='row']").all().catch(() => []);
  const users: NormalizedUser[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const text = await row.innerText().catch(() => "");
    const email = text.match(EMAIL_RE)?.[0]?.toLowerCase();
    if (!email || seen.has(email)) continue;

    const cells = await row.locator("td, [role='cell']").allTextContents().catch(() => []);
    const joined = cells.length > 0 ? cells.join(" ") : text;
    const status = joined.match(STATUS_RE)?.[1]?.toLowerCase() ?? "unknown";
    const roles = [...new Set([...joined.matchAll(ROLE_RE)].map((match) => match[0].toLowerCase()))];

    users.push(
      NormalizedUserSchema.parse({
        email,
        name: inferName(cells, email),
        status,
        roles,
        groups: [],
        source,
        raw: cells.length > 0 ? cells : text
      })
    );
    seen.add(email);
  }

  return users;
}

function inferName(cells: string[], email: string): string | undefined {
  const candidate = cells.find((cell) => cell && !cell.includes("@") && !STATUS_RE.test(cell) && !ROLE_RE.test(cell));
  return candidate?.trim() || email.split("@")[0];
}
