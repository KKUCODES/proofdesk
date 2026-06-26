import type { ResearchReport, ResearchRequest, Verdict } from "../domain/types.js";
import {
  buildEvidenceBundleHash,
  normalizeEvidenceText,
  sourceToCitation,
  type EvidenceSource,
} from "./evidence.js";

export interface BuildResearchReportOptions {
  request: ResearchRequest;
  sources: EvidenceSource[];
  accessedAt?: string;
}

interface ScoredSource {
  source: EvidenceSource;
  citationIndex: number;
  tokenScore: number;
  hasSupportSignal: boolean;
  hasDenialSignal: boolean;
}

const RELEVANCE_THRESHOLD = 0.2;

const STOP_WORDS = new Set([
  "about",
  "after",
  "and",
  "are",
  "does",
  "do",
  "from",
  "have",
  "in",
  "is",
  "into",
  "of",
  "on",
  "support",
  "supported",
  "supports",
  "that",
  "the",
  "this",
  "to",
  "use",
  "used",
  "uses",
  "using",
  "what",
  "when",
  "where",
  "with",
]);

const SUPPORT_PATTERNS = [
  /\bescrow\s+is\s+locked\b/i,
  /\bescrow-backed\b/i,
  /\bsettlement\s+is\s+released\b/i,
  /\bsupports\s+paid\s+orders\b/i,
  /\bpaid\s+agent\s+orders\b/i,
];

const DENIAL_PATTERNS = [
  /\bdoes\s+not\s+use\b/i,
  /\bdo\s+not\s+use\b/i,
  /\bnot\s+support(?:s|ed)?\b/i,
  /\bdoes\s+not\s+support\b/i,
  /\bwithout\s+escrow\b/i,
];

function canonicalTerm(term: string): string {
  if (term === "paid" || term === "pays" || term === "paying") return "pay";
  if (term.length > 4 && term.endsWith("ies")) return `${term.slice(0, -3)}y`;
  if (term.length > 4 && term.endsWith("ed")) return term.slice(0, -2);
  if (term.length > 3 && term.endsWith("s")) return term.slice(0, -1);
  return term;
}

function extractTerms(text: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];

  for (const rawTerm of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (rawTerm.length < 3 || STOP_WORDS.has(rawTerm)) continue;

    const term = canonicalTerm(rawTerm);
    if (!seen.has(term)) {
      seen.add(term);
      terms.push(term);
    }
  }

  return terms;
}

function hasPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function scoreTokenOverlap(question: string, text: string): number {
  const questionTerms = extractTerms(question);
  if (questionTerms.length === 0) return 0;

  const sourceTerms = new Set(extractTerms(text));
  const matches = questionTerms.filter((term) => sourceTerms.has(term));
  return matches.length / questionTerms.length;
}

function chooseVerdict(
  relevantSourceCount: number,
  supportiveSourceCount: number,
  denialSourceCount: number,
  requiredSourceCount: number,
): Verdict {
  if (relevantSourceCount === 0) return "inconclusive";
  if (denialSourceCount > 0) return supportiveSourceCount > 0 ? "mixed" : "inconclusive";
  if (supportiveSourceCount >= requiredSourceCount) return "supported";
  return supportiveSourceCount > 0 ? "mixed" : "inconclusive";
}

function calculateConfidence(
  verdict: Verdict,
  relevantSourceCount: number,
  supportiveSourceCount: number,
  requiredSourceCount: number,
  averageScore: number,
): number {
  if (verdict === "inconclusive") return relevantSourceCount === 0 ? 0.1 : 0.2;
  if (verdict === "supported") {
    const coverage = Math.min(1, supportiveSourceCount / requiredSourceCount);
    return Math.min(0.95, 0.72 + averageScore * 0.15 + coverage * 0.08);
  }
  return Math.min(0.65, 0.3 + averageScore * 0.2);
}

function buildLimitations(
  sourceCount: number,
  relevantSourceCount: number,
  supportiveSourceCount: number,
  denialSourceCount: number,
  requiredSourceCount: number,
): string[] {
  const limitations: string[] = [];

  if (sourceCount === 0) {
    limitations.push("No evidence sources were available, so the report cannot support the claim.");
    return limitations;
  }

  if (sourceCount < requiredSourceCount) {
    limitations.push(`Only ${sourceCount} source(s) were available; requested ${requiredSourceCount}.`);
  }

  if (relevantSourceCount < requiredSourceCount) {
    limitations.push(
      `Only ${relevantSourceCount} source(s) were relevant enough to support the claim; requested ${requiredSourceCount}.`,
    );
  }

  if (supportiveSourceCount < requiredSourceCount && sourceCount > 0) {
    limitations.push(
      `Only ${supportiveSourceCount} source(s) contained support signals; requested ${requiredSourceCount}.`,
    );
  }

  if (denialSourceCount > 0) {
    limitations.push(`${denialSourceCount} relevant source(s) contained denial signals.`);
  }

  return limitations;
}

export function buildResearchReport(options: BuildResearchReportOptions): ResearchReport {
  const accessedAt = options.accessedAt ?? new Date().toISOString();
  const requiredSourceCount = Math.max(1, options.request.required_source_count);
  const citations = options.sources.map((source) => sourceToCitation(source, accessedAt));
  const scoredSources: ScoredSource[] = options.sources.map((source, citationIndex) => ({
    source,
    citationIndex,
    tokenScore: scoreTokenOverlap(options.request.question, source.text),
    hasSupportSignal: hasPattern(normalizeEvidenceText(source.text), SUPPORT_PATTERNS),
    hasDenialSignal: hasPattern(normalizeEvidenceText(source.text), DENIAL_PATTERNS),
  }));
  const relevantSources = scoredSources.filter((scoredSource) => scoredSource.tokenScore >= RELEVANCE_THRESHOLD);
  const supportiveSources = relevantSources.filter(
    (scoredSource) => scoredSource.hasSupportSignal && !scoredSource.hasDenialSignal,
  );
  const denialSources = relevantSources.filter((scoredSource) => scoredSource.hasDenialSignal);
  const averageScore =
    scoredSources.length === 0
      ? 0
      : scoredSources.reduce((sum, scoredSource) => sum + scoredSource.tokenScore, 0) / scoredSources.length;
  const verdict = chooseVerdict(
    relevantSources.length,
    supportiveSources.length,
    denialSources.length,
    requiredSourceCount,
  );
  const confidence = calculateConfidence(
    verdict,
    relevantSources.length,
    supportiveSources.length,
    requiredSourceCount,
    averageScore,
  );

  return {
    verdict,
    confidence: Number(confidence.toFixed(2)),
    summary:
      verdict === "supported"
        ? `Available evidence supports: ${options.request.question}`
        : `Available evidence is insufficient to fully support: ${options.request.question}`,
    key_findings: relevantSources.map(({ citationIndex }) => {
      const citation = citations[citationIndex];
      return `${citation.title}: ${citation.relevance}`;
    }),
    citations,
    limitations: buildLimitations(
      options.sources.length,
      relevantSources.length,
      supportiveSources.length,
      denialSources.length,
      requiredSourceCount,
    ),
    evidence_bundle_hash: buildEvidenceBundleHash(citations.map((citation) => citation.content_hash)),
  };
}
