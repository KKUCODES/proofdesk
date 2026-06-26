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

function normalizeSourceUrl(url: string): string {
  const trimmedUrl = url.trim();
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    throw new Error("Invalid evidence source url");
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("Invalid evidence source url protocol");
  }

  return trimmedUrl;
}

export function sourceToCitation(source: EvidenceSource, accessedAt = new Date().toISOString()): Citation {
  const url = normalizeSourceUrl(source.url);
  const text = normalizeEvidenceText(source.text);

  if (text.length === 0) {
    throw new Error("Evidence source text must not be empty");
  }

  return {
    title: source.title.trim() || "Untitled source",
    url,
    publisher: source.publisher.trim() || "Unknown publisher",
    published_at: source.published_at.trim(),
    accessed_at: accessedAt,
    relevance: text.slice(0, 240),
    content_hash: hashEvidenceContent(text),
  };
}
