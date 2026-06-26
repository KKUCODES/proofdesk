import { describe, expect, it } from "vitest";
import { handleServiceRequest, resolveServiceKind } from "../src/services/router.js";

const config = {
  researchServiceId: "svc_research",
  verificationServiceId: "svc_verify",
};

describe("service router", () => {
  it("resolves configured research service id", () => {
    expect(resolveServiceKind("svc_research", config)).toBe("research");
  });

  it("resolves configured verification service id", () => {
    expect(resolveServiceKind("svc_verify", config)).toBe("verification");
  });

  it("throws a clear error for an unknown service id", () => {
    expect(() => resolveServiceKind("svc_unknown", config)).toThrow(
      "Unsupported service id: svc_unknown",
    );
  });

  it("routes a research payload with provided sources", async () => {
    const result = await handleServiceRequest({
      serviceId: "svc_research",
      payload: {
        question: "Does CROO CAP use escrow-backed paid Orders?",
        domain: "croo",
        required_source_count: 1,
        source_urls: [],
      },
      config,
      sources: [
        {
          title: "Order Lifecycle",
          url: "https://docs.croo.network/developer-docs/core-concepts/order-lifecycle.md",
          publisher: "CROO Network",
          published_at: "2026-04-07",
          text: "Requester pays. Escrow is locked in CAPVault. Provider delivers and settlement is released.",
        },
      ],
    });

    expect(result.kind).toBe("research");
    expect(result.deliverable.verdict).toBe("supported");
  });

  it("routes a research payload with empty sources by default", async () => {
    const result = await handleServiceRequest({
      serviceId: "svc_research",
      payload: {
        question: "Does CAP use escrow?",
        domain: "croo",
        source_urls: [],
      },
      config,
    });

    expect(result.kind).toBe("research");
    expect(result.deliverable.verdict).toBe("inconclusive");
  });

  it("routes a malformed verification payload to the verifier schema result", async () => {
    const result = await handleServiceRequest({
      serviceId: "svc_verify",
      payload: {
        report: { invalid: true },
        strictness: "medium",
      },
      config,
    });

    expect(result.kind).toBe("verification");
    expect(result.deliverable).toEqual({
      verification_score: 0,
      schema_valid: false,
      broken_links: [],
      unsupported_claims: ["Report does not match the ProofDesk research schema."],
      citation_warnings: [],
      audit_notes: ["Schema validation failed before evidence checks."],
      recommended_action: "reject",
    });
  });
});
