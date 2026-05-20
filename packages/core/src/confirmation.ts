export class ConfirmationRequiredError extends Error {
  constructor(action: string) {
    super(`${action} requires --confirm unless --dry-run is used.`);
    this.name = "ConfirmationRequiredError";
  }
}

export function ensureConfirmed(action: string, options: { confirm?: boolean; dryRun?: boolean }): void {
  if (options.dryRun) return;
  if (!options.confirm) {
    throw new ConfirmationRequiredError(action);
  }
}
