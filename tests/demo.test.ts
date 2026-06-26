import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runLocalDemo } from "../src/cli/demo.js";
import { buildEvidenceBundleHash } from "../src/research/evidence.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("local demo runner", () => {
  it("builds a supported report and accepts its verification", () => {
    const { report, verification } = runLocalDemo();

    expect(report.verdict).toBe("supported");
    expect(report.confidence).toBeGreaterThan(0.7);
    expect(report.limitations).toEqual([]);
    expect(report.citations).toHaveLength(2);
    expect(report.evidence_bundle_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(report.evidence_bundle_hash).toBe(
      buildEvidenceBundleHash(report.citations.map((citation) => citation.content_hash)),
    );

    expect(verification.schema_valid).toBe(true);
    expect(verification.recommended_action).toBe("accept");
    expect(verification.verification_score).toBeGreaterThanOrEqual(80);
    expect(verification.citation_warnings).toEqual([]);
  });

  it("keeps the checked-in claim input aligned with the demo scenario", async () => {
    const input = JSON.parse(
      await readFile(resolve(projectRoot, "examples", "claim-input.json"), "utf8"),
    );

    expect(input).toEqual({
      question: "Does CROO CAP support escrow-backed paid agent Orders on Base?",
      domain: "croo",
      required_source_count: 2,
      freshness_days: 90,
      output_style: "concise",
      source_urls: [
        "https://docs.croo.network/developer-docs/core-concepts/order-lifecycle.md",
        "https://docs.croo.network/developer-docs/core-concepts/cap.md",
      ],
    });
  });
});
