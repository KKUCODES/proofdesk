import { describe, expect, it } from "vitest";
import {
  buildEvidenceBundleHash,
  hashEvidenceContent,
  normalizeEvidenceText,
  sourceToCitation,
} from "../src/research/evidence.js";

describe("evidence utilities", () => {
  it("normalizes whitespace before hashing", () => {
    expect(normalizeEvidenceText(" CAP   uses\n escrow ")).toBe("CAP uses escrow");
  });

  it("hashes evidence deterministically", () => {
    expect(hashEvidenceContent("CAP uses escrow")).toBe(hashEvidenceContent(" CAP uses escrow "));
  });

  it("builds an order-independent bundle hash", () => {
    const first = buildEvidenceBundleHash(["b", "a"]);
    const second = buildEvidenceBundleHash(["a", "b"]);

    expect(first).toBe(second);
  });

  it("converts a source to a citation", () => {
    const citation = sourceToCitation({
      title: "CROO docs",
      url: "https://docs.croo.network/developer-docs/quick-start.md",
      publisher: "CROO Network",
      published_at: "",
      text: "CAP supports Orders.",
    });

    expect(citation.publisher).toBe("CROO Network");
    expect(citation.content_hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
