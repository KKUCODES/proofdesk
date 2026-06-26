# ProofDesk Design

## Decision

ProofDesk is the CROO Agent Hackathon submission.

It is a paid, source-grounded research and verification agent for the CROO Agent Store. It turns a claim or research question into a structured report with citations, evidence hashes, confidence scoring, and audit notes. It also exposes a second verification service that can review a report produced by ProofDesk or another agent.

The goal is to demonstrate CROO Agent Protocol value clearly: a requester buys a service, the provider accepts an Order, payment is locked, the provider delivers a verifiable schema result, and a verifier service can be called as a composable A2A dependency.

## Hackathon Fit

Primary tracks:

- Research & Intelligence Agents
- Data & Verification Agents

Secondary fit:

- Open - Any A2A Agents
- Developer Tooling Agents, if the verifier is later extended to grade BUIDL submissions

ProofDesk targets the judging surface directly:

- It is callable as a paid CROO service.
- It uses structured input and structured deliverables.
- It produces verifiable evidence rather than only prose.
- It supports an A2A flow where one service can call or review the output of another.
- It can be demonstrated in under five minutes with one high-signal example.

## Product Scope

ProofDesk has two services.

### Service 1: Claim Research Report

Purpose: answer a claim or research question with a compact, evidence-backed report.

Requester input schema:

```json
{
  "question": "string",
  "domain": "string",
  "required_source_count": "number",
  "freshness_days": "number",
  "output_style": "string"
}
```

Provider deliverable schema:

```json
{
  "verdict": "supported | contradicted | mixed | inconclusive",
  "confidence": 0.0,
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

### Service 2: Evidence Verification

Purpose: audit a report for broken sources, unsupported claims, weak evidence, and schema integrity.

Requester input schema:

```json
{
  "report": "object",
  "strictness": "low | medium | high"
}
```

Provider deliverable schema:

```json
{
  "verification_score": 0,
  "schema_valid": true,
  "broken_links": ["string"],
  "unsupported_claims": ["string"],
  "citation_warnings": ["string"],
  "audit_notes": ["string"],
  "recommended_action": "accept | revise | reject"
}
```

## Architecture

The implementation will be a TypeScript Node.js project because CROO provides a documented Node.js SDK, Node 18+ is supported, and the demo can be kept simple.

Main units:

- Provider runtime: connects to CROO WebSocket, accepts negotiations, waits for paid Orders, runs the matching service, and submits deliveries.
- Research engine: gathers sources, extracts useful snippets, computes content hashes, and builds the structured research report.
- Verification engine: validates report schema, checks links where possible, scores citation quality, and returns audit output.
- CLI demo runner: runs local examples without needing a live paid Order for development and README screenshots.
- Docs: README, service configuration guide, Agent Store listing copy, and demo script.

The provider runtime will keep CROO SDK integration isolated from the research logic. This lets tests cover report and verification behavior without network access or CROO credentials.

## Data Flow

Claim Research Report:

1. CROO sends a negotiation event for the service.
2. Provider accepts the negotiation.
3. CROO creates an Order and waits for payment.
4. CROO sends `order_paid`.
5. Provider reads the request payload.
6. Research engine fetches and normalizes source evidence.
7. Report builder returns structured JSON.
8. Provider calls `deliverOrder` with the schema deliverable.

Evidence Verification:

1. CROO sends a paid Order with a report payload.
2. Provider validates the report shape.
3. Verifier checks citation URLs, required fields, source count, confidence consistency, and unsupported-claim signals.
4. Provider delivers the verification schema.

## Evidence Strategy

The first version will avoid pretending to be an all-knowing fact checker. It will make evidence boundaries explicit:

- Prefer user-provided URLs when available.
- Support live web fetching only when API credentials or network access are configured.
- Compute SHA-256 hashes for normalized source snippets.
- Include limitations when source count, freshness, or retrieval quality is weak.
- Mark outputs as `inconclusive` when evidence is insufficient.

This avoids fake certainty and gives judges a concrete verification artifact.

## CROO Integration

The live submission will use official CROO setup:

- Register a Provider Agent in Agent Store.
- Add two services with schema requirements and schema deliverables.
- Store `CROO_SDK_KEY` locally as an environment variable.
- Run the Provider process with `@croo-network/sdk`.
- Use a second Requester Agent for the demo flow if USDC funding is available.

Required environment variables:

```text
CROO_API_URL=https://api.croo.network
CROO_WS_URL=wss://api.croo.network/ws
CROO_SDK_KEY=<provider-api-key>
CROO_TARGET_SERVICE_ID=<optional-requester-target-service-id>
BASE_RPC_URL=<optional-base-rpc-url>
```

Human-controlled setup required:

- DoraHacks account and BUIDL submission.
- CROO Agent Store login.
- Agent registration and API key copy.
- Optional Base USDC funding for requester-side live demo.
- GitHub repository creation and public visibility.

## Error Handling

Provider runtime:

- Reject negotiations only when payload is missing required fields or the service is unsupported.
- On retryable delivery failures, log the Order ID and retry according to SDK behavior.
- On missing credentials, fail fast with a clear setup message.

Research engine:

- Return `inconclusive` when sources cannot be retrieved.
- Include source retrieval failures in `limitations`.
- Never fabricate citations.

Verification engine:

- Treat malformed reports as `schema_valid: false`.
- Return `recommended_action: revise` for partial evidence and `reject` for broken or unsupported evidence.

## Testing

Minimum test coverage:

- Report schema builder returns all required fields.
- Evidence hashing is deterministic.
- Research report handles empty evidence as `inconclusive`.
- Verification catches malformed reports.
- Verification flags broken or missing citation URLs.
- Provider routing maps CROO service identifiers to the right local handler.

Live CROO SDK calls will be separated behind an adapter and validated manually once API keys exist.

## Demo Plan

Demo story:

1. Show ProofDesk listed as an Agent Store provider with two services.
2. Start the provider process and show it online.
3. Submit a claim such as: "Does CROO CAP support escrow-backed paid agent Orders on Base?"
4. Show a structured report with citations, hashes, confidence, and limitations.
5. Send the report into Evidence Verification.
6. Show a verification score and recommended action.
7. Show README and open-source repo.

The demo should be under five minutes and should emphasize the CAP lifecycle: negotiate, lock, deliver, clear.

## Submission Assets

Repository deliverables:

- MIT or Apache-2.0 license.
- README with setup, Agent Store configuration, service schemas, and demo commands.
- Source code for provider, research engine, verifier, and demo runner.
- Example input/output JSON files.
- Demo script.

DoraHacks submission deliverables:

- Public GitHub repo.
- Demo video link, maximum five minutes.
- CROO Agent Store listing link.
- Short explanation of CAP integration and A2A composability.

## Risks

- CROO SDK package or API behavior may differ from docs. Mitigation: keep the SDK adapter small and verify with the official examples before final demo.
- Live USDC requester flow may require wallet funding. Mitigation: build local demo runner plus live provider readiness; use live order flow once funding is available.
- Web retrieval quality can vary. Mitigation: support user-provided source URLs and include transparent limitations.
- LLM credentials may be unavailable. Mitigation: build deterministic report assembly first, then add optional model summarization.

## Success Criteria

ProofDesk is successful when:

- It runs locally from the README.
- It has passing tests for core research and verification logic.
- It can be configured as at least one CROO Agent Store service.
- It can deliver schema output for a paid or simulated Order.
- It has a clear 5-minute demo showing verifiable output and A2A verification.
- It is submitted to DoraHacks before July 12, 2026.
