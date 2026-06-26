import type {
  Citation,
  ResearchReport,
  ResearchRequest,
  VerificationRequest,
  VerificationStrictness,
  Verdict,
} from "./types.js";

const verdicts = ["supported", "contradicted", "mixed", "inconclusive"] as const;
const verificationStrictnesses = ["low", "medium", "high"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Expected non-empty string field: ${field}`);
  }
  return value.trim();
}

function readNumber(value: unknown, field: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Expected numeric field: ${field}`);
  }
  return value;
}

function readStringArray(value: unknown, field: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`Expected string array field: ${field}`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isCitation(value: unknown): value is Citation {
  if (!isRecord(value)) return false;

  return (
    typeof value.title === "string" &&
    typeof value.url === "string" &&
    typeof value.publisher === "string" &&
    typeof value.published_at === "string" &&
    typeof value.accessed_at === "string" &&
    typeof value.relevance === "string" &&
    typeof value.content_hash === "string"
  );
}

export function parseResearchRequest(input: unknown): ResearchRequest {
  if (!isRecord(input)) {
    throw new Error("Expected research request object");
  }

  return {
    question: readString(input.question, "question"),
    domain: readString(input.domain ?? "general", "domain"),
    required_source_count: Math.max(
      1,
      readNumber(input.required_source_count, "required_source_count", 3),
    ),
    freshness_days: Math.max(1, readNumber(input.freshness_days, "freshness_days", 30)),
    output_style:
      typeof input.output_style === "string"
        ? input.output_style.trim() || "concise"
        : "concise",
    source_urls: readStringArray(input.source_urls, "source_urls"),
  };
}

export function parseVerificationRequest(input: unknown): VerificationRequest {
  if (!isRecord(input)) {
    throw new Error("Expected verification request object");
  }

  if (!Object.hasOwn(input, "report")) {
    throw new Error("Expected required field: report");
  }

  const strictness = input.strictness ?? "medium";
  if (!verificationStrictnesses.includes(strictness as VerificationStrictness)) {
    throw new Error("Expected strictness to be low, medium, or high");
  }

  return {
    report: input.report,
    strictness: strictness as VerificationStrictness,
  };
}

export function isVerdict(value: unknown): value is Verdict {
  return verdicts.includes(value as Verdict);
}

export function isResearchReport(value: unknown): value is ResearchReport {
  if (!isRecord(value)) return false;

  return (
    isVerdict(value.verdict) &&
    typeof value.confidence === "number" &&
    Number.isFinite(value.confidence) &&
    value.confidence >= 0 &&
    value.confidence <= 1 &&
    typeof value.summary === "string" &&
    isStringArray(value.key_findings) &&
    Array.isArray(value.citations) &&
    value.citations.every(isCitation) &&
    isStringArray(value.limitations) &&
    typeof value.evidence_bundle_hash === "string"
  );
}
