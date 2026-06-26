import type { ResearchReport, VerificationResult } from "../domain/types.js";
import { parseResearchRequest, parseVerificationRequest } from "../domain/validation.js";
import type { EvidenceSource } from "../research/evidence.js";
import { buildResearchReport } from "../research/report.js";
import { verifyResearchReport } from "../verification/verifier.js";

export type ServiceKind = "research" | "verification";

export interface ProofDeskServiceConfig {
  researchServiceId: string;
  verificationServiceId: string;
}

export interface HandleServiceRequestOptions {
  serviceId: string;
  payload: unknown;
  config: ProofDeskServiceConfig;
  sources?: EvidenceSource[];
}

export type ServiceHandlerResult =
  | { kind: "research"; deliverable: ResearchReport }
  | { kind: "verification"; deliverable: VerificationResult };

export function resolveServiceKind(
  serviceId: string,
  config: ProofDeskServiceConfig,
): ServiceKind {
  if (serviceId === config.researchServiceId) return "research";
  if (serviceId === config.verificationServiceId) return "verification";

  throw new Error(`Unsupported service id: ${serviceId}`);
}

export async function handleServiceRequest(
  options: HandleServiceRequestOptions,
): Promise<ServiceHandlerResult> {
  const kind = resolveServiceKind(options.serviceId, options.config);

  if (kind === "research") {
    const request = parseResearchRequest(options.payload);
    return {
      kind,
      deliverable: buildResearchReport({
        request,
        sources: options.sources ?? [],
      }),
    };
  }

  const request = parseVerificationRequest(options.payload);
  return {
    kind,
    deliverable: verifyResearchReport(request),
  };
}
