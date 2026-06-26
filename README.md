# ProofDesk

ProofDesk is a CROO Agent Store provider for paid, source-grounded research and evidence verification.

It exposes two composable services:

- **Claim Research Report** - turns a claim or research question into a structured report with a verdict, confidence score, citations, source content hashes, an evidence bundle hash, and explicit limitations.
- **Evidence Verification** - audits a research report for schema validity, citation quality, unsupported claims, bundle hash integrity, and a recommended action.

ProofDesk is built for the CROO Agent Hackathon. It demonstrates a practical CAP flow: negotiate the service request, lock payment for the Order, deliver schema JSON, and clear settlement after delivery.

## Why ProofDesk

Paid agent work needs more than fluent text. A requester needs to know what was delivered, which sources support it, and whether another agent can verify it. ProofDesk keeps the deliverable machine-readable so humans and agents can inspect citations, hashes, scores, and limitations instead of trusting an opaque answer.

The local demo is offline and deterministic. It does not fabricate sources or require live credentials, which makes the evidence and verification path easy to test before connecting a live CROO provider.

## Quick Start

```bash
npm install
npm test
npm run demo
```

The demo prints a research report and verification result, and writes:

- `examples/report-output.json`
- `examples/verification-output.json`

## CROO Provider

Copy `.env.example` to `.env` and fill the values from the CROO dashboard and Agent Store service setup.

```text
CROO_API_URL=https://api.croo.network
CROO_WS_URL=wss://api.croo.network/ws
CROO_SDK_KEY=croo_sk_replace_me
CROO_RESEARCH_SERVICE_ID=your_claim_research_service_id
CROO_VERIFICATION_SERVICE_ID=your_evidence_verification_service_id
BASE_RPC_URL=optional_base_rpc_url
```

Environment variables:

- `CROO_API_URL` - CROO API base URL. Defaults to `https://api.croo.network`.
- `CROO_WS_URL` - CROO WebSocket URL. Defaults to `wss://api.croo.network/ws`.
- `CROO_SDK_KEY` - provider SDK key from the CROO dashboard.
- `CROO_RESEARCH_SERVICE_ID` - Agent Store service id for Claim Research Report.
- `CROO_VERIFICATION_SERVICE_ID` - Agent Store service id for Evidence Verification.
- `BASE_RPC_URL` - optional Base RPC URL for environments that need an explicit RPC endpoint.

Run the provider:

```bash
npm run provider
```

The provider listens for CROO events, accepts supported negotiations, waits for paid Orders, routes each Order to the matching local service, and delivers schema JSON back through the CROO SDK.

## Service Schemas

### Claim Research Report

Input schema:

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

Output schema:

```json
{
  "verdict": "supported | contradicted | mixed | inconclusive",
  "confidence": 0.8,
  "summary": "string",
  "key_findings": ["string"],
  "citations": [
    {
      "title": "string",
      "url": "https://example.com/source",
      "publisher": "string",
      "published_at": "YYYY-MM-DD",
      "accessed_at": "ISO-8601 timestamp",
      "relevance": "source excerpt or evidence note",
      "content_hash": "sha256 hex string"
    }
  ],
  "limitations": ["string"],
  "evidence_bundle_hash": "sha256 hex string"
}
```

Verdicts are intentionally conservative. If sources are missing, weak, or contradictory, ProofDesk returns `inconclusive` or `mixed` and explains the limitation.

### Evidence Verification

Input schema:

```json
{
  "report": {
    "verdict": "supported",
    "confidence": 0.8,
    "summary": "string",
    "key_findings": ["string"],
    "citations": [],
    "limitations": [],
    "evidence_bundle_hash": "sha256 hex string"
  },
  "strictness": "low | medium | high"
}
```

Output schema:

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

The verifier checks report shape, citation URLs, citation hashes, evidence bundle hash consistency, confidence claims, and obvious evidence gaps. It is offline by default, so it does not require live HTTP access to run tests or the local demo.

## Development

Run the full test suite:

```bash
npm test
```

Run the TypeScript build:

```bash
npm run build
```

Run the deterministic local demo:

```bash
npm run demo
```

## License

MIT. See [LICENSE](LICENSE).
