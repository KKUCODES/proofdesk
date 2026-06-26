import { describe, expect, it, vi } from "vitest";
import type { CrooProviderAdapter } from "../src/croo/sdkAdapter.js";
import { CROO_PROVIDER_EVENTS, runProvider } from "../src/provider/runProvider.js";

const config = {
  apiUrl: "https://api.croo.network",
  wsUrl: "wss://api.croo.network/ws",
  sdkKey: "sdk_test",
  researchServiceId: "svc_research",
  verificationServiceId: "svc_verify",
};

function createAdapter(overrides: Partial<CrooProviderAdapter> = {}) {
  const handlers = new Map<string, (event: unknown) => Promise<void> | void>();
  const adapter: CrooProviderAdapter = {
    connectWebSocket: vi.fn(async (events) => {
      for (const [eventName, handler] of Object.entries(events)) {
        handlers.set(eventName, handler);
      }
    }),
    acceptNegotiation: vi.fn(async () => undefined),
    rejectNegotiation: vi.fn(async () => undefined),
    deliverOrder: vi.fn(async () => undefined),
    getOrder: vi.fn(async () => ({ negotiationId: "negotiation_1" })),
    getNegotiation: vi.fn(async () => ({
      serviceId: "svc_research",
      requirements: {
        question: "Does CROO CAP use escrow-backed paid Orders?",
        domain: "croo",
        required_source_count: 1,
        source_urls: [],
      },
    })),
    ...overrides,
  };

  return { adapter, handlers };
}

const logger = {
  info: vi.fn(),
  error: vi.fn(),
};

describe("provider runtime", () => {
  it("registers exact CROO event names", async () => {
    const { adapter, handlers } = createAdapter();

    await runProvider({ adapter, config, logger });

    expect(adapter.connectWebSocket).toHaveBeenCalledOnce();
    expect([...handlers.keys()].sort()).toEqual(
      [CROO_PROVIDER_EVENTS.negotiationCreated, CROO_PROVIDER_EVENTS.orderPaid].sort(),
    );
    expect(CROO_PROVIDER_EVENTS).toEqual({
      negotiationCreated: "order_negotiation_created",
      orderPaid: "order_paid",
    });
  });

  it("handles a paid order by fetching order and negotiation before delivering", async () => {
    const { adapter, handlers } = createAdapter();
    await runProvider({ adapter, config, logger });

    await handlers.get(CROO_PROVIDER_EVENTS.orderPaid)?.({ order_id: "order_1" });

    expect(adapter.getOrder).toHaveBeenCalledWith("order_1");
    expect(adapter.getNegotiation).toHaveBeenCalledWith("negotiation_1");
    expect(adapter.deliverOrder).toHaveBeenCalledOnce();
    expect(adapter.deliverOrder).toHaveBeenCalledWith(
      "order_1",
      expect.objectContaining({
        verdict: "inconclusive",
        evidence_bundle_hash: expect.any(String),
      }),
    );
  });

  it("rejects unsupported negotiations", async () => {
    const { adapter, handlers } = createAdapter({
      getNegotiation: vi.fn(async () => ({
        serviceId: "svc_unknown",
        requirements: { question: "Can this run?", domain: "general" },
      })),
    });
    await runProvider({ adapter, config, logger });

    await handlers.get(CROO_PROVIDER_EVENTS.negotiationCreated)?.({
      negotiationId: "negotiation_unsupported",
    });

    expect(adapter.rejectNegotiation).toHaveBeenCalledWith(
      "negotiation_unsupported",
      expect.stringContaining("Unsupported service id"),
    );
    expect(adapter.acceptNegotiation).not.toHaveBeenCalled();
  });

  it("logs malformed paid payloads and does not deliver", async () => {
    const localLogger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const { adapter, handlers } = createAdapter({
      getNegotiation: vi.fn(async () => ({
        serviceId: "svc_research",
        requirements: "{bad json",
      })),
    });
    await runProvider({ adapter, config, logger: localLogger });

    await handlers.get(CROO_PROVIDER_EVENTS.orderPaid)?.({ id: "order_bad" });

    expect(adapter.deliverOrder).not.toHaveBeenCalled();
    expect(localLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to handle CROO order_paid event"),
      expect.any(Error),
    );
  });
});
