import type {
  Citation,
  RecommendedAction,
  VerificationRequest,
  VerificationResult,
  VerificationStrictness,
} from "../domain/types.js";
import { isResearchReport } from "../domain/validation.js";

const HASH_PATTERN = /^[a-f0-9]{64}$/i;
const WEAK_RELEVANCE_LENGTH = 20;

function isValidHash(value: string): boolean {
  return HASH_PATTERN.test(value);
}

function strictnessPenalty(strictness: VerificationStrictness): number {
  if (strictness === "high") return 15;
  if (strictness === "medium") return 10;
  return 5;
}

function collectCitationWarnings(citations: Citation[]): string[] {
  const warnings: string[] = [];

  citations.forEach((citation, index) => {
    const label = `Citation ${index + 1}`;

    if (!citation.url.trim().startsWith("https://")) {
      warnings.push(`${label} does not use an https URL.`);
    }

    if (!isValidHash(citation.content_hash)) {
      warnings.push(`${label} has an invalid content hash.`);
    }

    if (citation.relevance.trim().length < WEAK_RELEVANCE_LENGTH) {
      warnings.push(`${label} has weak relevance text.`);
    }
  });

  return warnings;
}

function collectUnsupportedClaims(report: {
  confidence: number;
  citations: Citation[];
  verdict: string;
}): string[] {
  const unsupportedClaims: string[] = [];

  if (report.confidence > 0.7 && report.citations.length === 0) {
    unsupportedClaims.push("High confidence requires at least one citation.");
  }

  if (report.verdict === "supported" && report.citations.length === 0) {
    unsupportedClaims.push("Supported verdict requires cited evidence.");
  }

  return unsupportedClaims;
}

function chooseAction(score: number, unsupportedClaimCount: number): RecommendedAction {
  if (unsupportedClaimCount > 0) {
    return score >= 40 ? "revise" : "reject";
  }

  if (score >= 80) return "accept";
  if (score >= 40) return "revise";
  return "reject";
}

export function verifyResearchReport(request: VerificationRequest): VerificationResult {
  if (!isResearchReport(request.report)) {
    return {
      verification_score: 0,
      schema_valid: false,
      broken_links: [],
      unsupported_claims: ["Report does not match the ProofDesk research schema."],
      citation_warnings: [],
      audit_notes: ["Schema validation failed before evidence checks."],
      recommended_action: "reject",
    };
  }

  const report = request.report;
  const citationWarnings = collectCitationWarnings(report.citations);
  const unsupportedClaims = collectUnsupportedClaims(report);
  const auditNotes: string[] = [];
  const penalty = strictnessPenalty(request.strictness);

  if (!isValidHash(report.evidence_bundle_hash)) {
    citationWarnings.push("Evidence bundle hash is missing or invalid.");
  }

  let score = 100;
  score -= citationWarnings.length * penalty;
  score -= unsupportedClaims.length * 30;
  score -= report.limitations.length * 5;
  score = Math.max(0, Math.min(100, score));

  if (citationWarnings.length === 0 && unsupportedClaims.length === 0) {
    auditNotes.push("Report has a valid schema and no citation quality warnings.");
  } else {
    auditNotes.push("Report needs revision before it should be trusted as a final answer.");
  }

  return {
    verification_score: score,
    schema_valid: true,
    broken_links: [],
    unsupported_claims: unsupportedClaims,
    citation_warnings: citationWarnings,
    audit_notes: auditNotes,
    recommended_action: chooseAction(score, unsupportedClaims.length),
  };
}
