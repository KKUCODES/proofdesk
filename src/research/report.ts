import type { ResearchReport, ResearchRequest, Verdict } from "../domain/types.js";
import {
  buildEvidenceBundleHash,
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
  score: number;
}

const DETERMINISTIC_ACCESSED_AT = "not-recorded";
const RELEVANCE_THRESHOLD = 0.45;

const STOP_WORDS = new Set([
  "about",
  "after",
  "does",
  "from",
  "have",
  "into",
  "that",
  "the",
  "this",
  "what",
  "when",
  "where",
  "with",
]);

function canonicalTerm(term: string): string {
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

function sourceContainsTerm(sourceTerms: string[], term: string): boolean {
  return sourceTerms.some((sourceTerm) => sourceTerm === term || sourceTerm.includes(term));
}

function scoreSource(question: string, text: string): number {
  const questionTerms = extractTerms(question);
  if (questionTerms.length === 0) return 0;

  const sourceTerms = extractTerms(text);
  const matches = questionTerms.filter((term) => sourceContainsTerm(sourceTerms, term));
  return matches.length / questionTerms.length;
}

function chooseVerdict(relevantSourceCount: number, requiredSourceCount: number, averageScore: number): Verdict {
  if (relevantSourceCount === 0) return "inconclusive";
  if (relevantSourceCount >= requiredSourceCount) return "supported";
  return averageScore >= RELEVANCE_THRESHOLD ? "mixed" : "inconclusive";
}

function calculateConfidence(verdict: Verdict, relevantSourceCount: number, requiredSourceCount: number, averageScore: number): number {
  if (verdict === "inconclusive") return relevantSourceCount === 0 ? 0.1 : 0.2;
  if (verdict === "supported") {
    const coverage = Math.min(1, relevantSourceCount / requiredSourceCount);
    return Math.min(0.95, 0.55 + averageScore * 0.35 + coverage * 0.05);
  }
  return Math.min(0.65, 0.35 + averageScore * 0.25);
}

function buildLimitations(sourceCount: number, relevantSourceCount: number, requiredSourceCount: number): string[] {
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

  return limitations;
}

export function buildResearchReport(options: BuildResearchReportOptions): ResearchReport {
  const accessedAt = options.accessedAt ?? DETERMINISTIC_ACCESSED_AT;
  const requiredSourceCount = Math.max(1, options.request.required_source_count);
  const citations = options.sources.map((source) => sourceToCitation(source, accessedAt));
  const scoredSources: ScoredSource[] = options.sources.map((source, citationIndex) => ({
    source,
    citationIndex,
    score: scoreSource(options.request.question, source.text),
  }));
  const relevantSources = scoredSources.filter((scoredSource) => scoredSource.score >= RELEVANCE_THRESHOLD);
  const averageScore =
    scoredSources.length === 0
      ? 0
      : scoredSources.reduce((sum, scoredSource) => sum + scoredSource.score, 0) / scoredSources.length;
  const verdict = chooseVerdict(relevantSources.length, requiredSourceCount, averageScore);
  const confidence = calculateConfidence(verdict, relevantSources.length, requiredSourceCount, averageScore);

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
    limitations: buildLimitations(options.sources.length, relevantSources.length, requiredSourceCount),
    evidence_bundle_hash: buildEvidenceBundleHash(citations.map((citation) => citation.content_hash)),
  };
}
