import { mkdir, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { EvidenceBundleSchema, type AuditEvent, type EvidenceBundle } from "./schemas.js";
import { redactJson, redactString } from "./redaction.js";

export type EvidenceWriterOptions = {
  evidenceDir?: string;
  targetApp?: "appsmith";
  action: EvidenceBundle["action"];
  input?: Record<string, unknown>;
};

export class EvidenceWriter {
  readonly bundle: EvidenceBundle;

  private constructor(bundle: EvidenceBundle) {
    this.bundle = bundle;
  }

  static async create(options: EvidenceWriterOptions): Promise<EvidenceWriter> {
    const runId = makeRunId();
    const rootDir = path.resolve(options.evidenceDir ?? "evidence/runs", runId);
    const bundle = EvidenceBundleSchema.parse({
      runId,
      rootDir,
      targetApp: options.targetApp ?? "appsmith",
      action: options.action,
      createdAt: new Date().toISOString(),
      files: [],
      screenshots: [],
      logs: [],
      traces: []
    });

    const writer = new EvidenceWriter(bundle);
    await writer.ensureLayout();
    await writer.writeJson("run.json", bundle, { redact: false });
    await writer.writeJson("inputs.redacted.json", options.input ?? {});
    return writer;
  }

  async ensureLayout(): Promise<void> {
    await Promise.all([
      mkdir(this.bundle.rootDir, { recursive: true }),
      mkdir(path.join(this.bundle.rootDir, "screenshots"), { recursive: true }),
      mkdir(path.join(this.bundle.rootDir, "logs"), { recursive: true }),
      mkdir(path.join(this.bundle.rootDir, "network"), { recursive: true }),
      mkdir(path.join(this.bundle.rootDir, "llm"), { recursive: true })
    ]);
  }

  async writeJson(relativePath: string, data: unknown, options: { redact?: boolean } = {}): Promise<string> {
    const absolutePath = this.resolve(relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    const payload = options.redact === false ? data : redactJson(data);
    await writeFile(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    this.track(relativePath);
    return absolutePath;
  }

  async writeText(relativePath: string, text: string, options: { redact?: boolean } = {}): Promise<string> {
    const absolutePath = this.resolve(relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, options.redact === false ? text : redactString(text), "utf8");
    this.track(relativePath);
    return absolutePath;
  }

  async appendLog(message: string): Promise<string> {
    const relativePath = "logs/runner.log";
    const absolutePath = this.resolve(relativePath);
    await appendFile(absolutePath, `${new Date().toISOString()} ${redactString(message)}\n`, "utf8");
    this.track(relativePath);
    return absolutePath;
  }

  screenshotPath(name: string): string {
    const safeName = name.endsWith(".png") ? name : `${name}.png`;
    const relativePath = `screenshots/${safeName}`;
    this.track(relativePath);
    return this.resolve(relativePath);
  }

  tracePath(name = "trace.zip"): string {
    const relativePath = name.endsWith(".zip") ? name : `${name}.zip`;
    this.bundle.traces.push(relativePath);
    this.track(relativePath);
    return this.resolve(relativePath);
  }

  async writeAuditEvent(event: AuditEvent): Promise<string> {
    return this.writeJson("audit-event.json", event);
  }

  resolve(relativePath: string): string {
    return path.join(this.bundle.rootDir, relativePath);
  }

  private track(relativePath: string): void {
    if (!this.bundle.files.includes(relativePath)) {
      this.bundle.files.push(relativePath);
    }
    if (relativePath.startsWith("screenshots/") && !this.bundle.screenshots.includes(relativePath)) {
      this.bundle.screenshots.push(relativePath);
    }
    if (relativePath.startsWith("logs/") && !this.bundle.logs.includes(relativePath)) {
      this.bundle.logs.push(relativePath);
    }
  }
}

function makeRunId(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "").replace("T", "T").replace("Z", "Z");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${suffix}`;
}
