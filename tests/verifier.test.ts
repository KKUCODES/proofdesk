import { describe, expect, it } from "vitest";
import { buildEvidenceBundleHash } from "../src/research/evidence.js";
import { verifyResearchReport } from "../src/verification/verifier.js";

const validContentHash = "a".repeat(64);

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
      content_hash: validContentHash,
    },
  ],
  limitations: [],
  evidence_bundle_hash: buildEvidenceBundleHash([validContentHash]),
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
    const invalidContentHash = "not-a-sha256";
    const result = verifyResearchReport({
      report: {
        ...validReport,
        evidence_bundle_hash: buildEvidenceBundleHash([invalidContentHash]),
        citations: [
          {
            ...validReport.citations[0],
            url: "http://example.com/source",
            relevance: "Too short.",
            content_hash: invalidContentHash,
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

  it("does not accept reports with a mismatched evidence bundle hash", () => {
    const result = verifyResearchReport({
      report: { ...validReport, evidence_bundle_hash: "b".repeat(64) },
      strictness: "medium",
    });

    expect(result.citation_warnings).toContain(
      "Evidence bundle hash does not match citation content hashes.",
    );
    expect(result.recommended_action).not.toBe("accept");
  });

  it("does not accept reports with an invalid evidence bundle hash", () => {
    const result = verifyResearchReport({
      report: { ...validReport, evidence_bundle_hash: "not-a-sha256" },
      strictness: "medium",
    });

    expect(result.citation_warnings).toContain("Evidence bundle hash is missing or invalid.");
    expect(result.recommended_action).not.toBe("accept");
  });

  it("does not accept low strictness reports that still have citation warnings", () => {
    const result = verifyResearchReport({
      report: {
        ...validReport,
        citations: [
          {
            ...validReport.citations[0],
            url: "http://example.com/source",
            relevance: "Too short.",
          },
        ],
      },
      strictness: "low",
    });

    expect(result.citation_warnings.length).toBeGreaterThanOrEqual(2);
    expect(result.verification_score).toBeGreaterThanOrEqual(80);
    expect(result.recommended_action).not.toBe("accept");
  });

  it("penalizes reports with limitations", () => {
    const clean = verifyResearchReport({ report: validReport, strictness: "medium" });
    const limited = verifyResearchReport({
      report: {
        ...validReport,
        limitations: ["Only one source was available."],
      },
      strictness: "medium",
    });

    expect(limited.verification_score).toBeLessThan(clean.verification_score);
  });
});
