import { describe, expect, it } from "vitest";
import { buildResearchReport } from "../src/research/report.js";
import {
  buildEvidenceBundleHash,
  hashEvidenceContent,
  type EvidenceSource,
} from "../src/research/evidence.js";
import type { ResearchRequest } from "../src/domain/types.js";

const request: ResearchRequest = {
  question: "Does CROO CAP use escrow-backed paid Orders?",
  domain: "croo",
  required_source_count: 2,
  freshness_days: 30,
  output_style: "concise",
  source_urls: [],
};

const sources: EvidenceSource[] = [
  {
    title: "Order Lifecycle",
    url: "https://docs.croo.network/developer-docs/core-concepts/order-lifecycle.md",
    publisher: "CROO Network",
    published_at: "2026-04-07",
    text: "Requester pays. Escrow is locked in CAPVault. Provider delivers and settlement is released for paid Orders.",
  },
  {
    title: "CAP Concepts",
    url: "https://docs.croo.network/developer-docs/core-concepts/cap.md",
    publisher: "CROO Network",
    published_at: "2026-04-08",
    text: "CROO CAP coordinates paid agent Orders with escrow-backed settlement and provider delivery.",
  },
];

describe("research report builder", () => {
  it("returns a low-confidence inconclusive report with the empty bundle hash when there are no sources", () => {
    const report = buildResearchReport({
      request,
      sources: [],
      accessedAt: "2026-06-26T00:00:00.000Z",
    });

    expect(report.verdict).toBe("inconclusive");
    expect(report.confidence).toBeLessThanOrEqual(0.2);
    expect(report.citations).toEqual([]);
    expect(report.key_findings).toEqual([]);
    expect(report.limitations.join(" ")).toContain("No evidence sources");
    expect(report.evidence_bundle_hash).toBe(buildEvidenceBundleHash([]));
  });

  it("builds a supported report with citations, findings, and an evidence bundle hash for enough relevant sources", () => {
    const report = buildResearchReport({
      request,
      sources,
      accessedAt: "2026-06-26T00:00:00.000Z",
    });

    expect(report.verdict).toBe("supported");
    expect(report.confidence).toBeGreaterThan(0.7);
    expect(report.citations).toHaveLength(2);
    expect(report.key_findings).toHaveLength(2);
    expect(report.citations.map((citation) => citation.url)).toEqual(sources.map((source) => source.url));
    expect(report.citations.every((citation) => citation.accessed_at === "2026-06-26T00:00:00.000Z")).toBe(true);
    expect(report.evidence_bundle_hash).toBe(
      buildEvidenceBundleHash(sources.map((source) => hashEvidenceContent(source.text))),
    );
  });

  it("uses a deterministic default access time when accessedAt is omitted", () => {
    const first = buildResearchReport({ request, sources });
    const second = buildResearchReport({ request, sources });

    expect(first).toEqual(second);
    expect(first.citations.every((citation) => citation.accessed_at.length > 0)).toBe(true);
  });
});
