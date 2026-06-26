import { pathToFileURL } from "node:url";
import { runProviderFromEnv } from "./provider/runProvider.js";

export { readProviderConfig } from "./croo/config.js";
export type { ProviderConfig } from "./croo/config.js";
export { createCrooSdkAdapter } from "./croo/sdkAdapter.js";
export type {
  CrooProviderAdapter,
  CrooProviderEvent,
  CrooProviderEventHandler,
} from "./croo/sdkAdapter.js";
export {
  CROO_PROVIDER_EVENTS,
  runProvider,
  runProviderFromEnv,
} from "./provider/runProvider.js";
export type { ProviderLogger, RunProviderOptions } from "./provider/runProvider.js";

const isDirectRun =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

type ConsoleMethod = "debug" | "error" | "info" | "log" | "warn";

function redactText(value: string): string {
  return value.replace(/croo_sk_[A-Za-z0-9]+/g, (match) => {
    if (match.length <= 12) return "croo_sk_****";
    return `${match.slice(0, 8)}****${match.slice(-4)}`;
  });
}

function redactConsoleArg(value: unknown): unknown {
  if (typeof value === "string") return redactText(value);

  if (value instanceof Error) {
    const error = new Error(redactText(value.message));
    error.name = value.name;
    error.stack = value.stack ? redactText(value.stack) : undefined;
    return error;
  }

  if (typeof value !== "object" || value === null) return value;

  try {
    return JSON.parse(redactText(JSON.stringify(value))) as unknown;
  } catch {
    return redactText(String(value));
  }
}

function installConsoleRedaction(): void {
  const methods: ConsoleMethod[] = ["debug", "error", "info", "log", "warn"];
  const redactedConsole = console as unknown as Record<
    ConsoleMethod,
    (...args: unknown[]) => void
  >;

  for (const method of methods) {
    const original = redactedConsole[method].bind(console);
    redactedConsole[method] = (...args: unknown[]) => {
      original(...args.map(redactConsoleArg));
    };
  }
}

if (isDirectRun) {
  installConsoleRedaction();

  runProviderFromEnv().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`ProofDesk provider failed: ${message}`);
    process.exitCode = 1;
  });
}
