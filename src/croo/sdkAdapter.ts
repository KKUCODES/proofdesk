import { AgentClient, DeliverableType } from "@croo-network/sdk";
import type {
  Config as CrooSdkConfig,
  DeliverOrderRequest,
  Event,
  EventTypeName,
} from "@croo-network/sdk";
import type { ProviderConfig } from "./config.js";

export type CrooProviderEvent = Event | Record<string, unknown>;
export type CrooProviderEventHandler = (event: CrooProviderEvent) => void | Promise<void>;

export interface CrooProviderAdapter {
  connectWebSocket(
    handlers: Record<string, CrooProviderEventHandler>,
    onAny?: CrooProviderEventHandler,
  ): Promise<void>;
  acceptNegotiation(negotiationId: string): Promise<unknown>;
  rejectNegotiation(negotiationId: string, reason: string): Promise<void>;
  deliverOrder(orderId: string, deliverable: unknown): Promise<unknown>;
  getOrder(orderId: string): Promise<unknown>;
  getNegotiation(negotiationId: string): Promise<unknown>;
}

export function createCrooSdkAdapter(config: ProviderConfig): CrooProviderAdapter {
  const sdkConfig: CrooSdkConfig = {
    baseURL: config.apiUrl,
    wsURL: config.wsUrl,
    rpcURL: config.baseRpcUrl,
  };
  const client = new AgentClient(sdkConfig, config.sdkKey);

  return {
    async connectWebSocket(handlers, onAny) {
      const stream = await client.connectWebSocket();

      for (const [eventName, handler] of Object.entries(handlers)) {
        stream.on(eventName as EventTypeName, (event) => {
          void handler(event);
        });
      }

      if (onAny !== undefined) {
        stream.onAny((event) => {
          void onAny(event);
        });
      }
    },
    acceptNegotiation(negotiationId) {
      return client.acceptNegotiation(negotiationId);
    },
    rejectNegotiation(negotiationId, reason) {
      return client.rejectNegotiation(negotiationId, reason);
    },
    deliverOrder(orderId, deliverable) {
      const request: DeliverOrderRequest = {
        deliverableType: DeliverableType.Schema,
        deliverableSchema: JSON.stringify(deliverable),
      };

      return client.deliverOrder(orderId, request);
    },
    getOrder(orderId) {
      return client.getOrder(orderId);
    },
    getNegotiation(negotiationId) {
      return client.getNegotiation(negotiationId);
    },
  };
}
