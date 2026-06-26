import { describe, expect, it } from "vitest";
import {
  isResearchReport,
  isVerdict,
  parseResearchRequest,
  parseVerificationRequest,
} from "../src/domain/validation.js";

describe("domain validation", () => {
  it("parses a valid research request with defaults", () => {
    const parsed = parseResearchRequest({
      question: "Does CAP use escrow-backed orders?",
      domain: "croo",
    });

    expect(parsed).toEqual({
      question: "Does CAP use escrow-backed orders?",
      domain: "croo",
      required_source_count: 3,
      freshness_days: 30,
      output_style: "concise",
      source_urls: [],
    });
  });

  it("trims source urls and drops empty entries", () => {
    const parsed = parseResearchRequest({
      question: "What supports the claim?",
      source_urls: [" https://example.com/source ", ""],
    });

    expect(parsed.source_urls).toEqual(["https://example.com/source"]);
    expect(parsed.domain).toBe("general");
  });

  it("rejects a research request without a question", () => {
    expect(() => parseResearchRequest({ domain: "croo" })).toThrow("question");
  });

  it("rejects non-string source urls", () => {
    expect(() =>
      parseResearchRequest({
        question: "What supports the claim?",
        source_urls: ["https://example.com/source", 1],
      }),
    ).toThrow("source_urls");
  });

  it("parses a verification request", () => {
    const parsed = parseVerificationRequest({
      report: { verdict: "inconclusive" },
      strictness: "high",
    });

    expect(parsed).toEqual({
      report: { verdict: "inconclusive" },
      strictness: "high",
    });
  });

  it("defaults verification strictness to medium", () => {
    const parsed = parseVerificationRequest({
      report: { verdict: "inconclusive" },
    });

    expect(parsed.strictness).toBe("medium");
  });

  it("rejects a verification request without a report", () => {
    expect(() => parseVerificationRequest({ strictness: "medium" })).toThrow("report");
  });

  it("rejects invalid verification strictness", () => {
    expect(() =>
      parseVerificationRequest({
        report: { verdict: "inconclusive" },
        strictness: "maximum",
      }),
    ).toThrow("strictness");
  });

  it("recognizes valid verdict values", () => {
    expect(isVerdict("supported")).toBe(true);
    expect(isVerdict("contradicted")).toBe(true);
    expect(isVerdict("mixed")).toBe(true);
    expect(isVerdict("inconclusive")).toBe(true);
    expect(isVerdict("unknown")).toBe(false);
  });

  it("recognizes the minimum valid report shape", () => {
    expect(
      isResearchReport({
        verdict: "supported",
        confidence: 0.7,
        summary: "CAP supports paid Orders.",
        key_findings: [],
        citations: [],
        limitations: [],
        evidence_bundle_hash: "abc",
      }),
    ).toBe(true);
  });

  it("rejects reports with confidence outside 0..1", () => {
    expect(
      isResearchReport({
        verdict: "supported",
        confidence: 1.1,
        summary: "CAP supports paid Orders.",
        key_findings: [],
        citations: [],
        limitations: [],
        evidence_bundle_hash: "abc",
      }),
    ).toBe(false);
  });

  it("rejects reports with malformed citations", () => {
    expect(
      isResearchReport({
        verdict: "supported",
        confidence: 0.7,
        summary: "CAP supports paid Orders.",
        key_findings: [],
        citations: [{ title: "Missing citation fields" }],
        limitations: [],
        evidence_bundle_hash: "abc",
      }),
    ).toBe(false);
  });
});
