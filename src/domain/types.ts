export type Verdict = "supported" | "contradicted" | "mixed" | "inconclusive";
export type VerificationStrictness = "low" | "medium" | "high";
export type RecommendedAction = "accept" | "revise" | "reject";

export interface ResearchRequest {
  question: string;
  domain: string;
  required_source_count: number;
  freshness_days: number;
  output_style: string;
  source_urls: string[];
}

export interface Citation {
  title: string;
  url: string;
  publisher: string;
  published_at: string;
  accessed_at: string;
  relevance: string;
  content_hash: string;
}

export interface ResearchReport {
  verdict: Verdict;
  confidence: number;
  summary: string;
  key_findings: string[];
  citations: Citation[];
  limitations: string[];
  evidence_bundle_hash: string;
}

export interface VerificationRequest {
  report: unknown;
  strictness: VerificationStrictness;
}

export interface VerificationResult {
  verification_score: number;
  schema_valid: boolean;
  broken_links: string[];
  unsupported_claims: string[];
  citation_warnings: string[];
  audit_notes: string[];
  recommended_action: RecommendedAction;
}
