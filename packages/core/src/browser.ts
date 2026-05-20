import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export type BrowserSessionOptions = {
  headless?: boolean;
  storageStatePath?: string;
  viewport?: { width: number; height: number };
};

export type BrowserSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  close: (tracePath?: string) => Promise<void>;
};

export async function createBrowserSession(options: BrowserSessionOptions = {}): Promise<BrowserSession> {
  const browser = await chromium.launch({
    headless: options.headless ?? true,
    chromiumSandbox: true,
    args: ["--disable-extensions"]
  });

  const storageState =
    options.storageStatePath && existsSync(options.storageStatePath) ? options.storageStatePath : undefined;

  const context = await browser.newContext({
    storageState,
    viewport: options.viewport ?? { width: 1440, height: 900 }
  });

  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const page = await context.newPage();

  return {
    browser,
    context,
    page,
    close: async (tracePath?: string) => {
      try {
        if (tracePath) {
          await mkdir(path.dirname(tracePath), { recursive: true });
          await stopTracing(context, tracePath);
        } else {
          await stopTracing(context);
        }
      } finally {
        await context.close().catch(() => undefined);
        await browser.close().catch(() => undefined);
      }
    }
  };
}

async function stopTracing(context: BrowserContext, tracePath?: string): Promise<void> {
  try {
    if (tracePath) {
      await context.tracing.stop({ path: tracePath });
    } else {
      await context.tracing.stop();
    }
  } catch {
    console.warn("Warning: Playwright trace could not be saved; continuing without trace.zip.");
  }
}

export async function saveStorageState(context: BrowserContext, storageStatePath: string): Promise<void> {
  await mkdir(path.dirname(storageStatePath), { recursive: true });
  await context.storageState({ path: storageStatePath });
}
