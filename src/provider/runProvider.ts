import { readProviderConfig, type ProviderConfig } from "../croo/config.js";
import {
  createCrooSdkAdapter,
  type CrooProviderAdapter,
  type CrooProviderEvent,
  type CrooProviderEventHandler,
} from "../croo/sdkAdapter.js";
import { parseResearchRequest, parseVerificationRequest } from "../domain/validation.js";
import type { EvidenceSource } from "../research/evidence.js";
import { handleServiceRequest, resolveServiceKind } from "../services/router.js";

export const CROO_PROVIDER_EVENTS = {
  negotiationCreated: "order_negotiation_created",
  orderPaid: "order_paid",
} as const;

export interface ProviderLogger {
  info(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export interface RunProviderOptions {
  adapter?: CrooProviderAdapter;
  config?: ProviderConfig;
  logger?: ProviderLogger;
  sources?: EvidenceSource[];
}

type EntityRecord = Record<string, unknown>;

function isRecord(value: unknown): value is EntityRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function readStringField(value: unknown, fields: string[]): string | undefined {
  if (!isRecord(value)) return undefined;

  for (const field of fields) {
    const fieldValue = value[field];
    if (typeof fieldValue === "string" && fieldValue.trim().length > 0) {
      return fieldValue.trim();
    }
  }

  return undefined;
}

function readPayloadFromNegotiation(negotiation: unknown): unknown {
  if (!isRecord(negotiation)) {
    throw new Error("Expected negotiation object");
  }

  const payload =
    negotiation.requirements ?? negotiation.payload ?? negotiation.input;

  if (typeof payload === "string") {
    const trimmedPayload = payload.trim();
    if (trimmedPayload.length === 0) {
      throw new Error("Negotiation payload is empty");
    }

    return JSON.parse(trimmedPayload) as unknown;
  }

  if (payload === undefined) {
    throw new Error("Negotiation payload is missing");
  }

  return payload;
}

function validateNegotiationPayload(
  serviceId: string,
  negotiation: unknown,
  config: ProviderConfig,
): void {
  const serviceKind = resolveServiceKind(serviceId, config);
  const payload = readPayloadFromNegotiation(negotiation);

  if (serviceKind === "research") {
    parseResearchRequest(payload);
    return;
  }

  parseVerificationRequest(payload);
}

function wrapEventHandler(
  eventName: string,
  logger: ProviderLogger,
  handler: CrooProviderEventHandler,
): CrooProviderEventHandler {
  return async (event) => {
    try {
      await handler(event);
    } catch (error) {
      logger.error(`Failed to handle CROO ${eventName} event`, asError(error));
    }
  };
}

async function handleNegotiationCreated(
  event: CrooProviderEvent,
  adapter: CrooProviderAdapter,
  config: ProviderConfig,
  logger: ProviderLogger,
): Promise<void> {
  const negotiationId = readStringField(event, ["negotiation_id", "negotiationId", "id"]);

  if (negotiationId === undefined) {
    throw new Error("Missing negotiation id in CROO event");
  }

  const negotiation = await adapter.getNegotiation(negotiationId);
  const serviceId = readStringField(negotiation, ["serviceId", "service_id"]);

  if (serviceId === undefined) {
    await adapter.rejectNegotiation(negotiationId, "Negotiation service id is missing");
    return;
  }

  try {
    validateNegotiationPayload(serviceId, negotiation, config);
  } catch (error) {
    await adapter.rejectNegotiation(negotiationId, asError(error).message);
    return;
  }

  await adapter.acceptNegotiation(negotiationId);
  logger.info(`Accepted CROO negotiation ${negotiationId} for service ${serviceId}`);
}

async function handleOrderPaid(
  event: CrooProviderEvent,
  adapter: CrooProviderAdapter,
  config: ProviderConfig,
  sources: EvidenceSource[],
): Promise<void> {
  const orderId = readStringField(event, ["order_id", "orderId", "id"]);

  if (orderId === undefined) {
    throw new Error("Missing order id in CROO event");
  }

  const order = await adapter.getOrder(orderId);
  const negotiationId = readStringField(order, ["negotiationId", "negotiation_id"]);

  if (negotiationId === undefined) {
    throw new Error(`Order ${orderId} is missing negotiation id`);
  }

  const negotiation = await adapter.getNegotiation(negotiationId);
  const serviceId = readStringField(order, ["serviceId", "service_id"]) ??
    readStringField(negotiation, ["serviceId", "service_id"]);

  if (serviceId === undefined) {
    throw new Error(`Order ${orderId} is missing service id`);
  }

  const payload = readPayloadFromNegotiation(negotiation);
  const result = await handleServiceRequest({
    serviceId,
    payload,
    config,
    sources,
  });

  await adapter.deliverOrder(orderId, result.deliverable);
}

export async function runProvider(options: RunProviderOptions = {}): Promise<void> {
  const config = options.config ?? readProviderConfig();
  const adapter = options.adapter ?? createCrooSdkAdapter(config);
  const logger = options.logger ?? console;
  const sources = options.sources ?? [];

  await adapter.connectWebSocket(
    {
      [CROO_PROVIDER_EVENTS.negotiationCreated]: wrapEventHandler(
        CROO_PROVIDER_EVENTS.negotiationCreated,
        logger,
        (event) => handleNegotiationCreated(event, adapter, config, logger),
      ),
      [CROO_PROVIDER_EVENTS.orderPaid]: wrapEventHandler(
        CROO_PROVIDER_EVENTS.orderPaid,
        logger,
        (event) => handleOrderPaid(event, adapter, config, sources),
      ),
    },
    (event) => {
      logger.info("Received CROO event", event);
    },
  );

  logger.info("ProofDesk CROO provider runtime connected.");
}

export async function runProviderFromEnv(): Promise<void> {
  await runProvider();
}
