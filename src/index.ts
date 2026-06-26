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

if (isDirectRun) {
  runProviderFromEnv().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`ProofDesk provider failed: ${message}`);
    process.exitCode = 1;
  });
}
