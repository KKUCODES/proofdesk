import { describe, expect, it } from "vitest";
import { readProviderConfig } from "../src/croo/config.js";

describe("provider config", () => {
  it("uses CROO endpoint defaults and trims env values", () => {
    const config = readProviderConfig({
      CROO_SDK_KEY: "  sdk_test  ",
      CROO_RESEARCH_SERVICE_ID: "  svc_research  ",
      CROO_VERIFICATION_SERVICE_ID: "  svc_verify  ",
      BASE_RPC_URL: "  https://base.example/rpc  ",
    });

    expect(config).toEqual({
      apiUrl: "https://api.croo.network",
      wsUrl: "wss://api.croo.network/ws",
      sdkKey: "sdk_test",
      researchServiceId: "svc_research",
      verificationServiceId: "svc_verify",
      baseRpcUrl: "https://base.example/rpc",
    });
  });

  it("uses provided CROO endpoints after trimming", () => {
    const config = readProviderConfig({
      CROO_API_URL: "  https://croo.test/api  ",
      CROO_WS_URL: "  wss://croo.test/ws  ",
      CROO_SDK_KEY: "sdk_test",
      CROO_RESEARCH_SERVICE_ID: "svc_research",
      CROO_VERIFICATION_SERVICE_ID: "svc_verify",
    });

    expect(config.apiUrl).toBe("https://croo.test/api");
    expect(config.wsUrl).toBe("wss://croo.test/ws");
    expect(config.baseRpcUrl).toBeUndefined();
  });

  it("throws a clear error when required values are missing", () => {
    expect(() => readProviderConfig({ CROO_SDK_KEY: " " })).toThrow(
      "Missing required provider config: CROO_SDK_KEY, CROO_RESEARCH_SERVICE_ID, CROO_VERIFICATION_SERVICE_ID",
    );
  });
});
