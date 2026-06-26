import { afterEach, describe, expect, it, vi } from "vitest";
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

afterEach(() => {
  vi.useRealTimers();
});

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

  it("uses the current ISO timestamp when accessedAt is omitted", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T12:34:56.789Z"));

    const report = buildResearchReport({ request, sources });

    expect(report.citations.every((citation) => citation.accessed_at === "2026-07-01T12:34:56.789Z")).toBe(true);
  });

  it("supports the Task 8 demo source when support signals are present", () => {
    const report = buildResearchReport({
      request: {
        question: "Does CROO CAP support escrow-backed paid agent Orders on Base?",
        domain: "croo",
        required_source_count: 1,
        freshness_days: 90,
        output_style: "concise",
        source_urls: ["https://docs.croo.network/developer-docs/core-concepts/order-lifecycle.md"],
      },
      sources: [
        {
          title: "Order Lifecycle",
          url: "https://docs.croo.network/developer-docs/core-concepts/order-lifecycle.md",
          publisher: "CROO Network",
          published_at: "2026-04-07",
          text: "Requester pays. USDC Escrow is locked in CAPVault. Provider delivers. Settlement is released after delivery.",
        },
      ],
      accessedAt: "2026-06-26T00:00:00.000Z",
    });

    expect(report.verdict).toBe("supported");
    expect(report.confidence).toBeGreaterThan(0.7);
  });

  it("keeps confidence conservative and records limitations when source count is insufficient", () => {
    const report = buildResearchReport({
      request,
      sources: [sources[0]],
      accessedAt: "2026-06-26T00:00:00.000Z",
    });

    expect(report.verdict).not.toBe("supported");
    expect(report.confidence).toBeLessThanOrEqual(0.65);
    expect(report.limitations.join(" ")).toContain("requested 2");
  });

  it("does not support irrelevant evidence even when substring terms appear", () => {
    const report = buildResearchReport({
      request: {
        question: "Does CAP use status?",
        domain: "croo",
        required_source_count: 1,
        freshness_days: 30,
        output_style: "concise",
        source_urls: [],
      },
      sources: [
        {
          title: "Capacity dashboard",
          url: "https://example.com/capacity-dashboard",
          publisher: "Example",
          published_at: "2026-04-07",
          text: "The capacity user status dashboard tracks queue health and billing metadata.",
        },
      ],
      accessedAt: "2026-06-26T00:00:00.000Z",
    });

    expect(report.verdict).not.toBe("supported");
  });

  it("does not return supported for relevant negative evidence", () => {
    const report = buildResearchReport({
      request: {
        ...request,
        required_source_count: 1,
      },
      sources: [
        {
          title: "Order Lifecycle",
          url: "https://docs.croo.network/developer-docs/core-concepts/order-lifecycle.md",
          publisher: "CROO Network",
          published_at: "2026-04-07",
          text: "CROO CAP does not use escrow-backed paid Orders.",
        },
      ],
      accessedAt: "2026-06-26T00:00:00.000Z",
    });

    expect(report.verdict).not.toBe("supported");
    expect(report.confidence).toBeLessThanOrEqual(0.65);
  });

  it("fails fast when a source has an invalid URL or empty text", () => {
    expect(() =>
      buildResearchReport({
        request,
        sources: [{ ...sources[0], url: "not-a-url" }],
        accessedAt: "2026-06-26T00:00:00.000Z",
      }),
    ).toThrow("url");

    expect(() =>
      buildResearchReport({
        request,
        sources: [{ ...sources[0], text: "   " }],
        accessedAt: "2026-06-26T00:00:00.000Z",
      }),
    ).toThrow("text");
  });
});
