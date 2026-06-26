import { runProviderFromEnv } from "./provider/runProvider.js";

runProviderFromEnv().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ProofDesk provider failed: ${message}`);
  process.exitCode = 1;
});
