import type { ProofDeskServiceConfig } from "../services/router.js";

const DEFAULT_CROO_API_URL = "https://api.croo.network";
const DEFAULT_CROO_WS_URL = "wss://api.croo.network/ws";

export interface ProviderConfig extends ProofDeskServiceConfig {
  apiUrl: string;
  wsUrl: string;
  sdkKey: string;
  baseRpcUrl?: string;
}

type ProviderEnv = Record<string, string | undefined>;

function readOptional(env: ProviderEnv, name: string): string | undefined {
  const value = env[name]?.trim();
  return value === "" ? undefined : value;
}

function readRequired(env: ProviderEnv, name: string, missing: string[]): string {
  const value = readOptional(env, name);
  if (value === undefined) {
    missing.push(name);
    return "";
  }

  return value;
}

export function readProviderConfig(env: ProviderEnv = process.env): ProviderConfig {
  const missing: string[] = [];
  const sdkKey = readRequired(env, "CROO_SDK_KEY", missing);
  const researchServiceId = readRequired(env, "CROO_RESEARCH_SERVICE_ID", missing);
  const verificationServiceId = readRequired(env, "CROO_VERIFICATION_SERVICE_ID", missing);

  if (missing.length > 0) {
    throw new Error(`Missing required provider config: ${missing.join(", ")}`);
  }

  return {
    apiUrl: readOptional(env, "CROO_API_URL") ?? DEFAULT_CROO_API_URL,
    wsUrl: readOptional(env, "CROO_WS_URL") ?? DEFAULT_CROO_WS_URL,
    sdkKey,
    researchServiceId,
    verificationServiceId,
    baseRpcUrl: readOptional(env, "BASE_RPC_URL"),
  };
}
