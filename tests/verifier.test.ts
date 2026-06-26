import { describe, expect, it } from "vitest";
import { verifyResearchReport } from "../src/verification/verifier.js";

const validReport = {
  verdict: "supported",
  confidence: 0.82,
  summary: "Available evidence supports CAP escrow.",
  key_findings: ["Order Lifecycle: Escrow is locked in CAPVault."],
  citations: [
    {
      title: "Order Lifecycle",
      url: "https://docs.croo.network/developer-docs/core-concepts/order-lifecycle.md",
      publisher: "CROO Network",
      published_at: "2026-04-07",
      accessed_at: "2026-06-26T00:00:00.000Z",
      relevance: "Escrow is locked in CAPVault and settlement is released after delivery.",
      content_hash: "a".repeat(64),
    },
  ],
  limitations: [],
  evidence_bundle_hash: "b".repeat(64),
};

describe("verification engine", () => {
  it("rejects malformed reports", () => {
    const result = verifyResearchReport({
      report: { nope: true },
      strictness: "medium",
    });

    expect(result.schema_valid).toBe(false);
    expect(result.verification_score).toBe(0);
    expect(result.recommended_action).toBe("reject");
  });

  it("accepts a valid report with strong citations", () => {
    const result = verifyResearchReport({
      report: validReport,
      strictness: "medium",
    });

    expect(result.schema_valid).toBe(true);
    expect(result.broken_links).toEqual([]);
    expect(result.citation_warnings).toEqual([]);
    expect(result.verification_score).toBeGreaterThanOrEqual(80);
    expect(result.recommended_action).toBe("accept");
  });

  it("flags high confidence reports without citations as unsupported", () => {
    const result = verifyResearchReport({
      report: { ...validReport, citations: [], confidence: 0.95 },
      strictness: "high",
    });

    expect(result.unsupported_claims).toContain("High confidence requires at least one citation.");
    expect(result.unsupported_claims).toContain("Supported verdict requires cited evidence.");
    expect(result.recommended_action).not.toBe("accept");
  });

  it("warns about weak citation quality without checking links over HTTP", () => {
    const result = verifyResearchReport({
      report: {
        ...validReport,
        citations: [
          {
            ...validReport.citations[0],
            url: "http://example.com/source",
            relevance: "Too short.",
            content_hash: "not-a-sha256",
          },
        ],
      },
      strictness: "medium",
    });

    expect(result.broken_links).toEqual([]);
    expect(result.citation_warnings).toEqual([
      "Citation 1 does not use an https URL.",
      "Citation 1 has an invalid content hash.",
      "Citation 1 has weak relevance text.",
    ]);
    expect(result.recommended_action).toBe("revise");
  });

  it("applies stronger penalties when strictness is high", () => {
    const weakReport = {
      ...validReport,
      citations: [
        {
          ...validReport.citations[0],
          url: "http://example.com/source",
          relevance: "Too short.",
        },
      ],
    };

    const low = verifyResearchReport({ report: weakReport, strictness: "low" });
    const high = verifyResearchReport({ report: weakReport, strictness: "high" });

    expect(high.verification_score).toBeLessThan(low.verification_score);
  });
});
