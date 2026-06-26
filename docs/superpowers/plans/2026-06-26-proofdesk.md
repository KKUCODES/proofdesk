# ProofDesk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build ProofDesk, a CROO Agent Store provider that returns structured source-grounded research reports and independent evidence verification results.

**Architecture:** The project is a small TypeScript Node.js service. Pure domain logic lives in `src/domain`, `src/research`, `src/verification`, and `src/services`; CROO SDK usage is isolated in `src/croo` and `src/provider`; CLI/demo code is isolated in `src/cli`. This keeps tests deterministic and lets the live CROO adapter be verified manually after Agent Store keys exist.

**Tech Stack:** Node.js 18+, TypeScript, Vitest, `tsx`, `@croo-network/sdk`, built-in `crypto` and `fetch`.

---

## File Structure

- `package.json` - npm scripts and dependencies.
- `tsconfig.json` - TypeScript compiler settings.
- `vitest.config.ts` - Vitest config for TypeScript tests.
- `.gitignore` - ignore dependencies, build output, local env files.
- `.env.example` - CROO and optional runtime variables without secrets.
- `src/domain/types.ts` - shared service input/output and evidence types.
- `src/domain/validation.ts` - handwritten runtime guards for unsafe payloads.
- `src/research/evidence.ts` - source normalization and deterministic SHA-256 hashing.
- `src/research/report.ts` - deterministic research report assembly.
- `src/verification/verifier.ts` - report schema and evidence-quality verification.
- `src/services/router.ts` - maps service names/ids to local handlers.
- `src/croo/config.ts` - reads CROO environment variables and fails fast.
- `src/croo/sdkAdapter.ts` - narrow wrapper around `@croo-network/sdk`; this is the only file that imports the CROO package.
- `src/provider/runProvider.ts` - provider lifecycle: websocket events, fetch negotiation/order details, accept, deliver.
- `src/index.ts` - provider entrypoint.
- `src/cli/demo.ts` - local demo runner independent of live CROO Orders.
- `examples/claim-input.json` - sample claim research request.
- `examples/report-output.json` - sample report output.
- `examples/verification-output.json` - sample verification output.
- `tests/*.test.ts` - focused tests for each pure module and provider routing.
- `README.md` - project overview, setup, demo, CROO listing schemas.
- `docs/agent-store-setup.md` - exact CROO Agent Store fields.
- `docs/demo-script.md` - 5-minute demo script.
- `LICENSE` - MIT license.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/index.ts`
- Create: `tests/smoke.test.ts`

- [ ] **Step 1: Create package and TypeScript config**

Create `package.json`:

```json
{
  "name": "proofdesk",
  "version": "0.1.0",
  "description": "CROO Agent Store provider for source-grounded research and evidence verification.",
  "type": "module",
  "private": true,
  "license": "MIT",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "demo": "tsx src/cli/demo.ts",
    "provider": "tsx src/index.ts"
  },
  "dependencies": {
    "@croo-network/sdk": "latest"
  },
  "devDependencies": {
    "@types/node": "^20.14.10",
    "tsx": "^4.16.2",
    "typescript": "^5.5.3",
    "vitest": "^1.6.0"
  },
  "engines": {
    "node": ">=18"
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Create local environment files**

Create `.gitignore`:

```text
node_modules/
dist/
coverage/
.env
.env.*
!.env.example
npm-debug.log*
```

Create `.env.example`:

```text
CROO_API_URL=https://api.croo.network
CROO_WS_URL=wss://api.croo.network/ws
CROO_SDK_KEY=croo_sk_replace_me
CROO_RESEARCH_SERVICE_ID=
CROO_VERIFICATION_SERVICE_ID=
BASE_RPC_URL=
```

- [ ] **Step 3: Add smoke entrypoint and smoke test**

Create `src/index.ts`:

```ts
import { runProviderFromEnv } from "./provider/runProvider.js";

runProviderFromEnv().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ProofDesk provider failed: ${message}`);
  process.exitCode = 1;
});
```

Create `tests/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("ProofDesk scaffold", () => {
  it("runs tests", () => {
    expect("ProofDesk").toBe("ProofDesk");
  });
});
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` is created and npm exits with status 0.

- [ ] **Step 5: Run scaffold tests**

Run: `npm test`

Expected: PASS for `tests/smoke.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore .env.example src/index.ts tests/smoke.test.ts
git commit -m "chore: scaffold ProofDesk TypeScript project"
```

---

### Task 2: Domain Types And Payload Validation

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/validation.ts`
- Create: `tests/validation.test.ts`

- [ ] **Step 1: Write failing validation tests**

Create `tests/validation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  parseResearchRequest,
  parseVerificationRequest,
  isResearchReport,
} from "../src/domain/validation.js";

describe("domain validation", () => {
  it("parses a valid research request with defaults", () => {
    const parsed = parseResearchRequest({
      question: "Does CAP use escrow-backed orders?",
      domain: "croo",
    });

    expect(parsed).toEqual({
      question: "Does CAP use escrow-backed orders?",
      domain: "croo",
      required_source_count: 3,
      freshness_days: 30,
      output_style: "concise",
      source_urls: [],
    });
  });

  it("rejects a research request without a question", () => {
    expect(() => parseResearchRequest({ domain: "croo" })).toThrow("question");
  });

  it("parses a verification request", () => {
    const parsed = parseVerificationRequest({
      report: { verdict: "inconclusive" },
      strictness: "high",
    });

    expect(parsed.strictness).toBe("high");
  });

  it("recognizes the minimum valid report shape", () => {
    expect(
      isResearchReport({
        verdict: "supported",
        confidence: 0.7,
        summary: "CAP supports paid Orders.",
        key_findings: [],
        citations: [],
        limitations: [],
        evidence_bundle_hash: "abc",
      }),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/validation.test.ts`

Expected: FAIL because `src/domain/validation.ts` does not exist.

- [ ] **Step 3: Add shared domain types**

Create `src/domain/types.ts`:

```ts
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
```

- [ ] **Step 4: Add runtime parsers**

Create `src/domain/validation.ts`:

```ts
import type {
  ResearchReport,
  ResearchRequest,
  VerificationRequest,
  VerificationStrictness,
  Verdict,
} from "./types.js";

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

export function parseResearchRequest(input: unknown): ResearchRequest {
  if (!isRecord(input)) {
    throw new Error("Expected research request object");
  }

  return {
    question: readString(input.question, "question"),
    domain: readString(input.domain ?? "general", "domain"),
    required_source_count: Math.max(1, readNumber(input.required_source_count, "required_source_count", 3)),
    freshness_days: Math.max(1, readNumber(input.freshness_days, "freshness_days", 30)),
    output_style: typeof input.output_style === "string" ? input.output_style.trim() || "concise" : "concise",
    source_urls: readStringArray(input.source_urls, "source_urls"),
  };
}

export function parseVerificationRequest(input: unknown): VerificationRequest {
  if (!isRecord(input)) {
    throw new Error("Expected verification request object");
  }

  const strictness = input.strictness ?? "medium";
  if (!["low", "medium", "high"].includes(String(strictness))) {
    throw new Error("Expected strictness to be low, medium, or high");
  }

  return {
    report: input.report,
    strictness: strictness as VerificationStrictness,
  };
}

export function isVerdict(value: unknown): value is Verdict {
  return ["supported", "contradicted", "mixed", "inconclusive"].includes(String(value));
}

export function isResearchReport(value: unknown): value is ResearchReport {
  if (!isRecord(value)) return false;
  return (
    isVerdict(value.verdict) &&
    typeof value.confidence === "number" &&
    Number.isFinite(value.confidence) &&
    typeof value.summary === "string" &&
    Array.isArray(value.key_findings) &&
    Array.isArray(value.citations) &&
    Array.isArray(value.limitations) &&
    typeof value.evidence_bundle_hash === "string"
  );
}
```

- [ ] **Step 5: Run validation tests**

Run: `npm test -- tests/validation.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/types.ts src/domain/validation.ts tests/validation.test.ts
git commit -m "feat: add ProofDesk domain validation"
```

---

### Task 3: Evidence Hashing And Source Normalization

**Files:**
- Create: `src/research/evidence.ts`
- Create: `tests/evidence.test.ts`

- [ ] **Step 1: Write failing evidence tests**

Create `tests/evidence.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildEvidenceBundleHash,
  hashEvidenceContent,
  normalizeEvidenceText,
  sourceToCitation,
} from "../src/research/evidence.js";

describe("evidence utilities", () => {
  it("normalizes whitespace before hashing", () => {
    expect(normalizeEvidenceText(" CAP   uses\\n escrow ")).toBe("CAP uses escrow");
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/evidence.test.ts`

Expected: FAIL because `src/research/evidence.ts` does not exist.

- [ ] **Step 3: Implement evidence utilities**

Create `src/research/evidence.ts`:

```ts
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
  return text.replace(/\\s+/g, " ").trim();
}

export function hashEvidenceContent(text: string): string {
  return createHash("sha256").update(normalizeEvidenceText(text), "utf8").digest("hex");
}

export function buildEvidenceBundleHash(contentHashes: string[]): string {
  const canonical = [...contentHashes].sort().join("\\n");
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
```

- [ ] **Step 4: Run evidence tests**

Run: `npm test -- tests/evidence.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/research/evidence.ts tests/evidence.test.ts
git commit -m "feat: add evidence hashing utilities"
```

---

### Task 4: Deterministic Research Report Builder

**Files:**
- Create: `src/research/report.ts`
- Create: `tests/report.test.ts`

- [ ] **Step 1: Write failing report tests**

Create `tests/report.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildResearchReport } from "../src/research/report.js";

describe("research report builder", () => {
  it("returns inconclusive when there are no sources", () => {
    const report = buildResearchReport({
      request: {
        question: "Does CAP support escrow?",
        domain: "croo",
        required_source_count: 2,
        freshness_days: 30,
        output_style: "concise",
        source_urls: [],
      },
      sources: [],
      accessedAt: "2026-06-26T00:00:00.000Z",
    });

    expect(report.verdict).toBe("inconclusive");
    expect(report.confidence).toBe(0.1);
    expect(report.limitations[0]).toContain("No evidence sources");
  });

  it("builds a supported report when enough sources mention the claim terms", () => {
    const report = buildResearchReport({
      request: {
        question: "Does CROO CAP use escrow-backed paid Orders?",
        domain: "croo",
        required_source_count: 1,
        freshness_days: 30,
        output_style: "concise",
        source_urls: [],
      },
      sources: [
        {
          title: "Order Lifecycle",
          url: "https://docs.croo.network/developer-docs/core-concepts/order-lifecycle.md",
          publisher: "CROO Network",
          published_at: "2026-04-07",
          text: "Requester pays. Escrow is locked in CAPVault. Provider delivers and settlement is released.",
        },
      ],
      accessedAt: "2026-06-26T00:00:00.000Z",
    });

    expect(report.verdict).toBe("supported");
    expect(report.citations).toHaveLength(1);
    expect(report.evidence_bundle_hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/report.test.ts`

Expected: FAIL because `src/research/report.ts` does not exist.

- [ ] **Step 3: Implement report builder**

Create `src/research/report.ts`:

```ts
import type { ResearchReport, ResearchRequest, Verdict } from "../domain/types.js";
import {
  type EvidenceSource,
  buildEvidenceBundleHash,
  sourceToCitation,
} from "./evidence.js";

interface BuildResearchReportOptions {
  request: ResearchRequest;
  sources: EvidenceSource[];
  accessedAt?: string;
}

function scoreSource(question: string, text: string): number {
  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 3);
  const haystack = text.toLowerCase();
  const matches = terms.filter((term) => haystack.includes(term));
  return terms.length === 0 ? 0 : matches.length / terms.length;
}

function chooseVerdict(sourceCount: number, requiredSourceCount: number, averageScore: number): Verdict {
  if (sourceCount === 0) return "inconclusive";
  if (sourceCount < requiredSourceCount) return averageScore >= 0.45 ? "mixed" : "inconclusive";
  if (averageScore >= 0.45) return "supported";
  return "mixed";
}

export function buildResearchReport(options: BuildResearchReportOptions): ResearchReport {
  const accessedAt = options.accessedAt ?? new Date().toISOString();
  const citations = options.sources.map((source) => sourceToCitation(source, accessedAt));
  const scores = options.sources.map((source) => scoreSource(options.request.question, source.text));
  const averageScore = scores.length === 0 ? 0 : scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const verdict = chooseVerdict(options.sources.length, options.request.required_source_count, averageScore);

  const limitations: string[] = [];
  if (options.sources.length === 0) {
    limitations.push("No evidence sources were available, so the report cannot support the claim.");
  }
  if (options.sources.length < options.request.required_source_count) {
    limitations.push(
      `Only ${options.sources.length} source(s) were available; requested ${options.request.required_source_count}.`,
    );
  }

  const confidence = verdict === "inconclusive" ? 0.1 : Math.min(0.9, 0.35 + averageScore * 0.5);
  const evidenceBundleHash = buildEvidenceBundleHash(citations.map((citation) => citation.content_hash));

  return {
    verdict,
    confidence: Number(confidence.toFixed(2)),
    summary:
      verdict === "supported"
        ? `Available evidence supports: ${options.request.question}`
        : `Available evidence is insufficient to fully support: ${options.request.question}`,
    key_findings: citations.map((citation) => `${citation.title}: ${citation.relevance}`),
    citations,
    limitations,
    evidence_bundle_hash: evidenceBundleHash,
  };
}
```

- [ ] **Step 4: Run report tests**

Run: `npm test -- tests/report.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/research/report.ts tests/report.test.ts
git commit -m "feat: build deterministic research reports"
```

---

### Task 5: Evidence Verification Engine

**Files:**
- Create: `src/verification/verifier.ts`
- Create: `tests/verifier.test.ts`

- [ ] **Step 1: Write failing verifier tests**

Create `tests/verifier.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { verifyResearchReport } from "../src/verification/verifier.js";

const validReport = {
  verdict: "supported",
  confidence: 0.8,
  summary: "Available evidence supports CAP escrow.",
  key_findings: ["Order Lifecycle: Escrow is locked in CAPVault."],
  citations: [
    {
      title: "Order Lifecycle",
      url: "https://docs.croo.network/developer-docs/core-concepts/order-lifecycle.md",
      publisher: "CROO Network",
      published_at: "2026-04-07",
      accessed_at: "2026-06-26T00:00:00.000Z",
      relevance: "Escrow is locked in CAPVault.",
      content_hash: "a".repeat(64),
    },
  ],
  limitations: [],
  evidence_bundle_hash: "b".repeat(64),
};

describe("verification engine", () => {
  it("rejects malformed reports", () => {
    const result = verifyResearchReport({ report: { nope: true }, strictness: "medium" });
    expect(result.schema_valid).toBe(false);
    expect(result.recommended_action).toBe("reject");
  });

  it("accepts a valid report with citations", () => {
    const result = verifyResearchReport({ report: validReport, strictness: "medium" });
    expect(result.schema_valid).toBe(true);
    expect(result.verification_score).toBeGreaterThanOrEqual(80);
    expect(result.recommended_action).toBe("accept");
  });

  it("flags unsupported confidence", () => {
    const result = verifyResearchReport({
      report: { ...validReport, citations: [], confidence: 0.95 },
      strictness: "high",
    });
    expect(result.unsupported_claims[0]).toContain("confidence");
    expect(result.recommended_action).toBe("revise");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/verifier.test.ts`

Expected: FAIL because `src/verification/verifier.ts` does not exist.

- [ ] **Step 3: Implement verifier**

Create `src/verification/verifier.ts`:

```ts
import type { Citation, VerificationRequest, VerificationResult } from "../domain/types.js";
import { isResearchReport } from "../domain/validation.js";

function isValidHash(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

function citationWarnings(citations: Citation[]): string[] {
  const warnings: string[] = [];
  citations.forEach((citation, index) => {
    if (!citation.url.startsWith("https://")) {
      warnings.push(`Citation ${index + 1} does not use an https URL.`);
    }
    if (!isValidHash(citation.content_hash)) {
      warnings.push(`Citation ${index + 1} has an invalid content hash.`);
    }
    if (citation.relevance.trim().length < 20) {
      warnings.push(`Citation ${index + 1} has weak relevance text.`);
    }
  });
  return warnings;
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
  const warnings = citationWarnings(report.citations);
  const unsupportedClaims: string[] = [];
  const auditNotes: string[] = [];

  if (report.confidence > 0.7 && report.citations.length === 0) {
    unsupportedClaims.push("High confidence requires at least one citation.");
  }
  if (report.verdict === "supported" && report.citations.length === 0) {
    unsupportedClaims.push("Supported verdict requires cited evidence.");
  }
  if (!isValidHash(report.evidence_bundle_hash)) {
    warnings.push("Evidence bundle hash is missing or invalid.");
  }

  const strictnessPenalty = request.strictness === "high" ? 15 : request.strictness === "medium" ? 10 : 5;
  let score = 100;
  score -= warnings.length * strictnessPenalty;
  score -= unsupportedClaims.length * 30;
  score -= report.limitations.length * 5;
  score = Math.max(0, Math.min(100, score));

  if (warnings.length === 0 && unsupportedClaims.length === 0) {
    auditNotes.push("Report has a valid schema and no citation quality warnings.");
  } else {
    auditNotes.push("Report needs revision before it should be trusted as a final answer.");
  }

  return {
    verification_score: score,
    schema_valid: true,
    broken_links: [],
    unsupported_claims: unsupportedClaims,
    citation_warnings: warnings,
    audit_notes: auditNotes,
    recommended_action: score >= 80 ? "accept" : score >= 40 ? "revise" : "reject",
  };
}
```

- [ ] **Step 4: Run verifier tests**

Run: `npm test -- tests/verifier.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/verification/verifier.ts tests/verifier.test.ts
git commit -m "feat: add evidence verification engine"
```

---

### Task 6: Service Routing

**Files:**
- Create: `src/services/router.ts`
- Create: `tests/router.test.ts`

- [ ] **Step 1: Write failing router tests**

Create `tests/router.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { handleServiceRequest, resolveServiceKind } from "../src/services/router.js";

describe("service router", () => {
  it("resolves configured research service id", () => {
    expect(resolveServiceKind("svc_research", {
      researchServiceId: "svc_research",
      verificationServiceId: "svc_verify",
    })).toBe("research");
  });

  it("routes a research payload", async () => {
    const result = await handleServiceRequest({
      serviceId: "svc_research",
      payload: {
        question: "Does CAP use escrow?",
        domain: "croo",
        source_urls: [],
      },
      config: {
        researchServiceId: "svc_research",
        verificationServiceId: "svc_verify",
      },
      sources: [],
    });

    expect(result.kind).toBe("research");
    expect(result.deliverable.verdict).toBe("inconclusive");
  });

  it("routes a verification payload", async () => {
    const result = await handleServiceRequest({
      serviceId: "svc_verify",
      payload: {
        report: { invalid: true },
        strictness: "medium",
      },
      config: {
        researchServiceId: "svc_research",
        verificationServiceId: "svc_verify",
      },
    });

    expect(result.kind).toBe("verification");
    expect(result.deliverable.schema_valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/router.test.ts`

Expected: FAIL because `src/services/router.ts` does not exist.

- [ ] **Step 3: Implement router**

Create `src/services/router.ts`:

```ts
import type { ResearchReport, VerificationResult } from "../domain/types.js";
import { parseResearchRequest, parseVerificationRequest } from "../domain/validation.js";
import type { EvidenceSource } from "../research/evidence.js";
import { buildResearchReport } from "../research/report.js";
import { verifyResearchReport } from "../verification/verifier.js";

export type ServiceKind = "research" | "verification";

export interface ProofDeskServiceConfig {
  researchServiceId: string;
  verificationServiceId: string;
}

export interface HandleServiceRequestOptions {
  serviceId: string;
  payload: unknown;
  config: ProofDeskServiceConfig;
  sources?: EvidenceSource[];
}

export type ServiceHandlerResult =
  | { kind: "research"; deliverable: ResearchReport }
  | { kind: "verification"; deliverable: VerificationResult };

export function resolveServiceKind(serviceId: string, config: ProofDeskServiceConfig): ServiceKind {
  if (serviceId === config.researchServiceId) return "research";
  if (serviceId === config.verificationServiceId) return "verification";
  throw new Error(`Unsupported service id: ${serviceId}`);
}

export async function handleServiceRequest(options: HandleServiceRequestOptions): Promise<ServiceHandlerResult> {
  const kind = resolveServiceKind(options.serviceId, options.config);

  if (kind === "research") {
    const request = parseResearchRequest(options.payload);
    return {
      kind,
      deliverable: buildResearchReport({
        request,
        sources: options.sources ?? [],
      }),
    };
  }

  const request = parseVerificationRequest(options.payload);
  return {
    kind,
    deliverable: verifyResearchReport(request),
  };
}
```

- [ ] **Step 4: Run router tests**

Run: `npm test -- tests/router.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/router.ts tests/router.test.ts
git commit -m "feat: route ProofDesk service requests"
```

---

### Task 7: CROO Adapter And Provider Runtime

**Files:**
- Create: `src/croo/config.ts`
- Create: `src/croo/sdkAdapter.ts`
- Create: `src/provider/runProvider.ts`
- Modify: `src/index.ts`
- Create: `tests/provider-config.test.ts`
- Create: `tests/provider-runtime.test.ts`

- [ ] **Step 1: Write failing config tests**

Create `tests/provider-config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readProviderConfig } from "../src/croo/config.js";

describe("provider config", () => {
  it("reads required CROO env vars", () => {
    const config = readProviderConfig({
      CROO_API_URL: "https://api.croo.network",
      CROO_WS_URL: "wss://api.croo.network/ws",
      CROO_SDK_KEY: "croo_sk_test",
      CROO_RESEARCH_SERVICE_ID: "svc_research",
      CROO_VERIFICATION_SERVICE_ID: "svc_verify",
    });

    expect(config.sdkKey).toBe("croo_sk_test");
    expect(config.services.researchServiceId).toBe("svc_research");
  });

  it("fails fast when sdk key is missing", () => {
    expect(() => readProviderConfig({})).toThrow("CROO_SDK_KEY");
  });
});
```

- [ ] **Step 2: Write failing provider runtime test**

Create `tests/provider-runtime.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { runProvider } from "../src/provider/runProvider.js";

describe("provider runtime", () => {
  it("connects the SDK adapter and registers event handlers", async () => {
    const on = vi.fn();
    const onAny = vi.fn();
    const connectWebSocket = vi.fn(async () => ({ on, onAny, close: vi.fn() }));
    const adapter = {
      connectWebSocket,
      acceptNegotiation: vi.fn(),
      rejectNegotiation: vi.fn(),
      deliverOrder: vi.fn(),
      getOrder: vi.fn(),
      getNegotiation: vi.fn(),
    };

    await runProvider({
      adapter,
      services: {
        researchServiceId: "svc_research",
        verificationServiceId: "svc_verify",
      },
    });

    expect(connectWebSocket).toHaveBeenCalledOnce();
    expect(on).toHaveBeenCalledWith("order_negotiation_created", expect.any(Function));
    expect(on).toHaveBeenCalledWith("order_paid", expect.any(Function));
    expect(onAny).toHaveBeenCalledWith(expect.any(Function));
  });

  it("fetches order and negotiation details before delivery", async () => {
    const handlers = new Map<string, (event: unknown) => Promise<void> | void>();
    const on = vi.fn((eventName: string, handler: (event: unknown) => Promise<void> | void) => {
      handlers.set(eventName, handler);
    });
    const adapter = {
      connectWebSocket: vi.fn(async () => ({ on, onAny: vi.fn(), close: vi.fn() })),
      acceptNegotiation: vi.fn(),
      rejectNegotiation: vi.fn(),
      deliverOrder: vi.fn(),
      getOrder: vi.fn(async () => ({
        orderId: "order_1",
        negotiationId: "neg_1",
        serviceId: "svc_verify",
      })),
      getNegotiation: vi.fn(async () => ({
        negotiationId: "neg_1",
        serviceId: "svc_verify",
        requirements: JSON.stringify({
          report: { invalid: true },
          strictness: "medium",
        }),
      })),
    };

    await runProvider({
      adapter,
      services: {
        researchServiceId: "svc_research",
        verificationServiceId: "svc_verify",
      },
    });
    await handlers.get("order_paid")?.({ order_id: "order_1" });

    expect(adapter.getOrder).toHaveBeenCalledWith("order_1");
    expect(adapter.getNegotiation).toHaveBeenCalledWith("neg_1");
    expect(adapter.deliverOrder).toHaveBeenCalledWith(
      "order_1",
      expect.objectContaining({ schema_valid: false }),
    );
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- tests/provider-config.test.ts tests/provider-runtime.test.ts`

Expected: FAIL because provider config/runtime files do not exist.

- [ ] **Step 4: Implement provider config**

Create `src/croo/config.ts`:

```ts
import type { ProofDeskServiceConfig } from "../services/router.js";

export interface ProviderConfig {
  apiUrl: string;
  wsUrl: string;
  sdkKey: string;
  baseRpcUrl?: string;
  services: ProofDeskServiceConfig;
}

function required(env: NodeJS.ProcessEnv | Record<string, string | undefined>, key: string): string {
  const value = env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

export function readProviderConfig(env: NodeJS.ProcessEnv = process.env): ProviderConfig {
  return {
    apiUrl: env.CROO_API_URL?.trim() || "https://api.croo.network",
    wsUrl: env.CROO_WS_URL?.trim() || "wss://api.croo.network/ws",
    sdkKey: required(env, "CROO_SDK_KEY"),
    baseRpcUrl: env.BASE_RPC_URL?.trim() || undefined,
    services: {
      researchServiceId: required(env, "CROO_RESEARCH_SERVICE_ID"),
      verificationServiceId: required(env, "CROO_VERIFICATION_SERVICE_ID"),
    },
  };
}
```

- [ ] **Step 5: Implement SDK adapter**

Create `src/croo/sdkAdapter.ts`:

```ts
import type { ProviderConfig } from "./config.js";

export interface ProofDeskStream {
  on(event: string, handler: (event: unknown) => void | Promise<void>): void;
  onAny(handler: (event: unknown) => void | Promise<void>): void;
  close(): void;
}

export interface ProofDeskCrooAdapter {
  connectWebSocket(): Promise<ProofDeskStream>;
  acceptNegotiation(negotiationId: string): Promise<unknown>;
  rejectNegotiation(negotiationId: string, reason: string): Promise<unknown>;
  deliverOrder(orderId: string, deliverable: unknown): Promise<unknown>;
  getOrder(orderId: string): Promise<unknown>;
  getNegotiation(negotiationId: string): Promise<unknown>;
}

export async function createCrooAdapter(config: ProviderConfig): Promise<ProofDeskCrooAdapter> {
  const sdk = await import("@croo-network/sdk");
  const sdkConfig = {
    baseURL: config.apiUrl,
    wsURL: config.wsUrl,
    rpcURL: config.baseRpcUrl,
    logger: console,
  };
  const client = new sdk.AgentClient(sdkConfig, config.sdkKey);

  return {
    connectWebSocket: () => client.connectWebSocket(),
    acceptNegotiation: (negotiationId: string) => client.acceptNegotiation(negotiationId),
    rejectNegotiation: (negotiationId: string, reason: string) => client.rejectNegotiation(negotiationId, reason),
    deliverOrder: (orderId: string, deliverable: unknown) =>
      client.deliverOrder(orderId, {
        deliverableType: sdk.DeliverableType.Schema,
        deliverableSchema: JSON.stringify(deliverable),
      }),
    getOrder: (orderId: string) => client.getOrder(orderId),
    getNegotiation: (negotiationId: string) => client.getNegotiation(negotiationId),
  };
}
```

- [ ] **Step 6: Implement provider runtime**

Create `src/provider/runProvider.ts`:

```ts
import { readProviderConfig } from "../croo/config.js";
import { createCrooAdapter, type ProofDeskCrooAdapter } from "../croo/sdkAdapter.js";
import type { ProofDeskServiceConfig } from "../services/router.js";
import { handleServiceRequest, resolveServiceKind } from "../services/router.js";

interface RunProviderOptions {
  adapter: ProofDeskCrooAdapter;
  services: ProofDeskServiceConfig;
}

function readStringField(event: unknown, names: string[]): string | undefined {
  if (typeof event !== "object" || event === null) return undefined;
  const record = event as Record<string, unknown>;
  for (const name of names) {
    if (typeof record[name] === "string") return record[name] as string;
  }
  return undefined;
}

function readPayload(event: unknown): unknown {
  if (typeof event === "string" && event.trim().length > 0) {
    return JSON.parse(event);
  }
  if (typeof event !== "object" || event === null) return {};
  const record = event as Record<string, unknown>;
  const candidate = record.payload ?? record.requirements ?? record.input ?? {};
  return typeof candidate === "string" ? JSON.parse(candidate) : candidate;
}

function readNegotiationId(order: unknown): string | undefined {
  return readStringField(order, ["negotiationId", "negotiation_id"]);
}

export async function runProvider(options: RunProviderOptions): Promise<void> {
  const stream = await options.adapter.connectWebSocket();

  stream.on("order_negotiation_created", async (event: unknown) => {
    const negotiationId = readStringField(event, ["negotiation_id", "negotiationId", "id"]);
    if (!negotiationId) {
      console.warn("Skipping negotiation without id", event);
      return;
    }
    const negotiation = await options.adapter.getNegotiation(negotiationId);
    const serviceId = readStringField(negotiation, ["serviceId", "service_id"]);
    if (!serviceId) {
      await options.adapter.rejectNegotiation(negotiationId, "Missing service id");
      return;
    }
    try {
      resolveServiceKind(serviceId, options.services);
    } catch {
      await options.adapter.rejectNegotiation(negotiationId, `Unsupported ProofDesk service: ${serviceId}`);
      return;
    }
    await options.adapter.acceptNegotiation(negotiationId);
  });

  stream.on("order_paid", async (event: unknown) => {
    const orderId = readStringField(event, ["order_id", "orderId", "id"]);
    if (!orderId) {
      console.warn("Skipping paid order without order id", event);
      return;
    }
    const order = await options.adapter.getOrder(orderId);
    const negotiationId = readNegotiationId(order);
    if (!negotiationId) {
      console.warn("Skipping paid order without negotiation id", order);
      return;
    }
    const negotiation = await options.adapter.getNegotiation(negotiationId);
    const serviceId = readStringField(order, ["serviceId", "service_id"]) ?? readStringField(negotiation, ["serviceId", "service_id"]);
    if (!serviceId) {
      console.warn("Skipping paid order without service id", { order, negotiation });
      return;
    }

    const result = await handleServiceRequest({
      serviceId,
      payload: readPayload(negotiation),
      config: options.services,
    });
    await options.adapter.deliverOrder(orderId, result.deliverable);
  });

  stream.onAny((event: unknown) => {
    console.log("CROO event", event);
  });
}

export async function runProviderFromEnv(): Promise<void> {
  const config = readProviderConfig();
  const adapter = await createCrooAdapter(config);
  await runProvider({ adapter, services: config.services });
}
```

- [ ] **Step 7: Run provider tests**

Run: `npm test -- tests/provider-config.test.ts tests/provider-runtime.test.ts`

Expected: PASS.

- [ ] **Step 8: Run full build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/croo/config.ts src/croo/sdkAdapter.ts src/provider/runProvider.ts src/index.ts tests/provider-config.test.ts tests/provider-runtime.test.ts
git commit -m "feat: add CROO provider runtime"
```

---

### Task 8: Local Demo Runner And Example Outputs

**Files:**
- Create: `src/cli/demo.ts`
- Create: `examples/claim-input.json`
- Create: `examples/report-output.json`
- Create: `examples/verification-output.json`
- Create: `tests/demo.test.ts`

- [ ] **Step 1: Write failing demo test**

Create `tests/demo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { runLocalDemo } from "../src/cli/demo.js";

describe("local demo", () => {
  it("produces a report and verification result", async () => {
    const result = await runLocalDemo();
    expect(result.report.verdict).toBe("supported");
    expect(result.verification.recommended_action).toBe("accept");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/demo.test.ts`

Expected: FAIL because `src/cli/demo.ts` does not exist.

- [ ] **Step 3: Create demo input**

Create `examples/claim-input.json`:

```json
{
  "question": "Does CROO CAP support escrow-backed paid agent Orders on Base?",
  "domain": "croo",
  "required_source_count": 1,
  "freshness_days": 90,
  "output_style": "concise",
  "source_urls": [
    "https://docs.croo.network/developer-docs/core-concepts/order-lifecycle.md"
  ]
}
```

- [ ] **Step 4: Implement demo runner**

Create `src/cli/demo.ts`:

```ts
import { writeFile } from "node:fs/promises";
import { parseResearchRequest } from "../domain/validation.js";
import { buildResearchReport } from "../research/report.js";
import { verifyResearchReport } from "../verification/verifier.js";

const demoInput = {
  question: "Does CROO CAP support escrow-backed paid agent Orders on Base?",
  domain: "croo",
  required_source_count: 1,
  freshness_days: 90,
  output_style: "concise",
  source_urls: ["https://docs.croo.network/developer-docs/core-concepts/order-lifecycle.md"],
};

const demoSources = [
  {
    title: "Order Lifecycle",
    url: "https://docs.croo.network/developer-docs/core-concepts/order-lifecycle.md",
    publisher: "CROO Network",
    published_at: "2026-04-07",
    text: "Requester pays. USDC Escrow is locked in CAPVault. Provider delivers. Settlement is released after delivery.",
  },
];

export async function runLocalDemo() {
  const request = parseResearchRequest(demoInput);
  const report = buildResearchReport({
    request,
    sources: demoSources,
    accessedAt: "2026-06-26T00:00:00.000Z",
  });
  const verification = verifyResearchReport({
    report,
    strictness: "medium",
  });

  return { report, verification };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runLocalDemo();
  await writeFile("examples/report-output.json", `${JSON.stringify(result.report, null, 2)}\\n`);
  await writeFile("examples/verification-output.json", `${JSON.stringify(result.verification, null, 2)}\\n`);
  console.log(JSON.stringify(result, null, 2));
}
```

- [ ] **Step 5: Run demo command to generate outputs**

Run: `npm run demo`

Expected: command prints JSON and writes `examples/report-output.json` and `examples/verification-output.json`.

- [ ] **Step 6: Run demo test**

Run: `npm test -- tests/demo.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/cli/demo.ts examples/claim-input.json examples/report-output.json examples/verification-output.json tests/demo.test.ts
git commit -m "feat: add local ProofDesk demo"
```

---

### Task 9: README, Agent Store Setup, Demo Script, And License

**Files:**
- Create: `README.md`
- Create: `docs/agent-store-setup.md`
- Create: `docs/demo-script.md`
- Create: `LICENSE`

- [ ] **Step 1: Create README**

Create `README.md`:

```md
# ProofDesk

ProofDesk is a CROO Agent Store provider for paid, source-grounded research and evidence verification.

It exposes two composable services:

- **Claim Research Report** - turns a claim or research question into a structured report with verdict, confidence, citations, evidence hashes, and limitations.
- **Evidence Verification** - audits a report for schema validity, weak evidence, unsupported claims, citation quality, and recommended action.

ProofDesk is built for the CROO Agent Hackathon. It demonstrates the CAP flow: negotiate, lock, deliver, and clear with schema deliverables.

## Quick Start

```bash
npm install
npm test
npm run demo
```

The demo writes:

- `examples/report-output.json`
- `examples/verification-output.json`

## CROO Provider

Copy `.env.example` to `.env` and fill the Agent Store values:

```text
CROO_API_URL=https://api.croo.network
CROO_WS_URL=wss://api.croo.network/ws
CROO_SDK_KEY=croo_sk_replace_me
CROO_RESEARCH_SERVICE_ID=your_research_service_id
CROO_VERIFICATION_SERVICE_ID=your_verification_service_id
```

Run the provider:

```bash
npm run provider
```

## Service Schemas

### Claim Research Report Input

```json
{
  "question": "string",
  "domain": "string",
  "required_source_count": "number",
  "freshness_days": "number",
  "output_style": "string",
  "source_urls": ["string"]
}
```

### Claim Research Report Output

```json
{
  "verdict": "supported | contradicted | mixed | inconclusive",
  "confidence": 0.8,
  "summary": "string",
  "key_findings": ["string"],
  "citations": [
    {
      "title": "string",
      "url": "string",
      "publisher": "string",
      "published_at": "string",
      "accessed_at": "string",
      "relevance": "string",
      "content_hash": "string"
    }
  ],
  "limitations": ["string"],
  "evidence_bundle_hash": "string"
}
```

### Evidence Verification Input

```json
{
  "report": {},
  "strictness": "low | medium | high"
}
```

### Evidence Verification Output

```json
{
  "verification_score": 90,
  "schema_valid": true,
  "broken_links": [],
  "unsupported_claims": [],
  "citation_warnings": [],
  "audit_notes": ["string"],
  "recommended_action": "accept | revise | reject"
}
```

## License

MIT
```

- [ ] **Step 2: Create Agent Store setup guide**

Create `docs/agent-store-setup.md`:

```md
# ProofDesk Agent Store Setup

## Provider Agent

- Agent name: ProofDesk
- Description: Paid source-grounded research and evidence verification for humans and agents.
- Skill tags: AI Agents, Research, Verification, Data, Web3

## Service 1

- Service name: Claim Research Report
- Price: 1.00 USDC
- SLA: 0h 30m
- Requirements: Schema
- Deliverable: Schema
- Description: Produces a structured research report with verdict, citations, evidence hashes, confidence, and limitations.

## Service 2

- Service name: Evidence Verification
- Price: 0.50 USDC
- SLA: 0h 15m
- Requirements: Schema
- Deliverable: Schema
- Description: Audits a report for schema validity, citation quality, unsupported claims, and recommended action.

## Required Runtime Values

After creating both services, copy:

- Provider API key into `CROO_SDK_KEY`
- Claim Research Report service id into `CROO_RESEARCH_SERVICE_ID`
- Evidence Verification service id into `CROO_VERIFICATION_SERVICE_ID`
```

- [ ] **Step 3: Create demo script**

Create `docs/demo-script.md`:

```md
# ProofDesk 5-Minute Demo Script

## 0:00-0:30 - Problem

Agents can produce answers, but paid agent commerce needs verifiable deliverables. ProofDesk turns research into a paid CAP service with citations, hashes, and a second verifier service.

## 0:30-1:15 - Agent Store

Show ProofDesk in CROO Agent Store with two services: Claim Research Report and Evidence Verification.

## 1:15-2:15 - Provider Runtime

Run:

```bash
npm run provider
```

Explain that the provider accepts negotiations, waits for paid Orders, and delivers schema output.

## 2:15-3:30 - Research Service

Run:

```bash
npm run demo
```

Show `examples/report-output.json`: verdict, confidence, citations, content hashes, and evidence bundle hash.

## 3:30-4:30 - Verification Service

Show `examples/verification-output.json`: score, schema validity, citation warnings, unsupported claims, and recommended action.

## 4:30-5:00 - CAP Fit

Close with the CAP lifecycle: negotiate, lock, deliver, clear. ProofDesk is useful to humans and composable for other agents that need source-grounded answers or report verification.
```

- [ ] **Step 4: Create MIT license**

Create `LICENSE`:

```text
MIT License

Copyright (c) 2026 ProofDesk

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 5: Verify docs and build**

Run: `npm test`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add README.md docs/agent-store-setup.md docs/demo-script.md LICENSE
git commit -m "docs: add ProofDesk submission materials"
```

---

## Plan Self-Review

Coverage:

- Service schemas are covered in Tasks 2, 6, and 9.
- Evidence hashing is covered in Task 3.
- Research report behavior is covered in Task 4.
- Verification behavior is covered in Task 5.
- CROO SDK integration is isolated in Task 7.
- Local demo and submission artifacts are covered in Tasks 8 and 9.

Placeholder scan:

- The plan contains no unresolved markers or unspecified implementation sections.
- External values such as API keys and service ids are explicitly modeled as environment variables.

Type consistency:

- `ResearchRequest`, `ResearchReport`, `VerificationRequest`, and `VerificationResult` are defined once in Task 2.
- Later tasks import those same names and use matching field names.
