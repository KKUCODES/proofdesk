import { createHash } from "node:crypto";
import type { Citation } from "../domain/types.js";

export interface EvidenceSource {
  title: string;
  url: string;
  publisher: string;
  published_at: string;
  text: string;
}

export function normalizeEvidenceText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function hashEvidenceContent(text: string): string {
  return createHash("sha256").update(normalizeEvidenceText(text), "utf8").digest("hex");
}

export function buildEvidenceBundleHash(contentHashes: string[]): string {
  const canonical = [...contentHashes].sort().join("\n");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function sourceToCitation(source: EvidenceSource, accessedAt = new Date().toISOString()): Citation {
  return {
    title: source.title,
    url: source.url,
    publisher: source.publisher,
    published_at: source.published_at,
    accessed_at: accessedAt,
    relevance: normalizeEvidenceText(source.text).slice(0, 240),
    content_hash: hashEvidenceContent(source.text),
  };
}
