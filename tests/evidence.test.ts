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

  it("hashes an empty evidence bundle as the empty canonical string", () => {
    expect(buildEvidenceBundleHash([])).toBe(hashEvidenceContent(""));
  });

  it("converts a source to a citation", () => {
    const citation = sourceToCitation(
      {
        title: " CROO docs ",
        url: "https://docs.croo.network/developer-docs/quick-start.md",
        publisher: " CROO Network ",
        published_at: "2026-04-07",
        text: " CAP   supports\n Orders. ",
      },
      "2026-06-26T00:00:00.000Z",
    );

    expect(citation.title).toBe("CROO docs");
    expect(citation.url).toBe("https://docs.croo.network/developer-docs/quick-start.md");
    expect(citation.publisher).toBe("CROO Network");
    expect(citation.published_at).toBe("2026-04-07");
    expect(citation.accessed_at).toBe("2026-06-26T00:00:00.000Z");
    expect(citation.relevance).toBe("CAP supports Orders.");
    expect(citation.content_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("uses neutral citation defaults when title or publisher are blank", () => {
    const citation = sourceToCitation({
      title: " ",
      url: "https://docs.croo.network/developer-docs/quick-start.md",
      publisher: " ",
      published_at: "",
      text: "CAP supports Orders.",
    });

    expect(citation.title).toBe("Untitled source");
    expect(citation.publisher).toBe("Unknown publisher");
  });

  it("rejects empty source text", () => {
    expect(() =>
      sourceToCitation({
        title: "CROO docs",
        url: "https://docs.croo.network/developer-docs/quick-start.md",
        publisher: "CROO Network",
        published_at: "",
        text: " \n\t ",
      }),
    ).toThrow(/text/);
  });

  it("rejects invalid source URLs", () => {
    expect(() =>
      sourceToCitation({
        title: "CROO docs",
        url: "ftp://docs.croo.network/developer-docs/quick-start.md",
        publisher: "CROO Network",
        published_at: "",
        text: "CAP supports Orders.",
      }),
    ).toThrow(/url/);
  });
});
