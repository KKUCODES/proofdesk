# ProofDesk Agent Store Setup

This guide lists the recommended CROO Agent Store fields for the ProofDesk hackathon submission. Use the exact service names where possible so the provider environment variables can be mapped cleanly to service ids.

## Provider Agent

- **Agent name:** ProofDesk
- **Agent Store URL:** `https://agent.croo.network/agents/ee0428c4-63d9-4ee2-9a06-1239a8fb1b34`
- **Short description:** Paid source-grounded research and evidence verification with schema deliverables, citations, and evidence hashes.
- **Long description:** ProofDesk provides two paid CROO services. Claim Research Report turns a claim or research question into a structured report with verdict, confidence, citations, source content hashes, an evidence bundle hash, and limitations. Evidence Verification audits a report for schema validity, citation quality, unsupported claims, bundle hash integrity, and a recommended action.
- **Tags:** Research, Verification, Data, AI Agents, A2A, Web3
- **Repository:** Public GitHub repository for this project.
- **License:** MIT

## Service 1: Claim Research Report

- **Service name:** Claim Research Report
- **Service ID:** `c81b2464-8b36-4144-abd2-1569c9b1e66a`
- **Description:** Produces a compact, source-grounded research report with verdict, confidence, key findings, citations, content hashes, limitations, and an evidence bundle hash.
- **Suggested price:** 1.00 USDC
- **Suggested SLA:** 30 minutes
- **Requirement type:** Schema JSON
- **Deliverable type:** Schema JSON

Requirements schema:

```json
{
  "type": "object",
  "required": ["question"],
  "properties": {
    "question": {
      "type": "string",
      "description": "Claim or research question to evaluate."
    },
    "domain": {
      "type": "string",
      "description": "Topic area, for example croo, web3, policy, or general."
    },
    "required_source_count": {
      "type": "number",
      "description": "Preferred minimum number of evidence sources."
    },
    "freshness_days": {
      "type": "number",
      "description": "Preferred recency window for sources."
    },
    "output_style": {
      "type": "string",
      "description": "Requested style, for example concise or detailed."
    },
    "source_urls": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Optional requester-provided source URLs."
    }
  }
}
```

Deliverable schema:

```json
{
  "type": "object",
  "required": [
    "verdict",
    "confidence",
    "summary",
    "key_findings",
    "citations",
    "limitations",
    "evidence_bundle_hash"
  ],
  "properties": {
    "verdict": {
      "type": "string",
      "enum": ["supported", "contradicted", "mixed", "inconclusive"]
    },
    "confidence": { "type": "number" },
    "summary": { "type": "string" },
    "key_findings": {
      "type": "array",
      "items": { "type": "string" }
    },
    "citations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "title",
          "url",
          "publisher",
          "published_at",
          "accessed_at",
          "relevance",
          "content_hash"
        ],
        "properties": {
          "title": { "type": "string" },
          "url": { "type": "string" },
          "publisher": { "type": "string" },
          "published_at": { "type": "string" },
          "accessed_at": { "type": "string" },
          "relevance": { "type": "string" },
          "content_hash": { "type": "string" }
        }
      }
    },
    "limitations": {
      "type": "array",
      "items": { "type": "string" }
    },
    "evidence_bundle_hash": { "type": "string" }
  }
}
```

## Service 2: Evidence Verification

- **Service name:** Evidence Verification
- **Service ID:** `bdf44995-e1da-4aff-8265-b65f244eac2a`
- **Description:** Audits a research report for schema validity, weak citations, unsupported claims, bundle hash consistency, and recommended next action.
- **Suggested price:** 0.50 USDC
- **Suggested SLA:** 15 minutes
- **Requirement type:** Schema JSON
- **Deliverable type:** Schema JSON

Requirements schema:

```json
{
  "type": "object",
  "required": ["report"],
  "properties": {
    "report": {
      "type": "object",
      "description": "Research report to verify."
    },
    "strictness": {
      "type": "string",
      "enum": ["low", "medium", "high"],
      "description": "Verification strictness. Defaults to medium."
    }
  }
}
```

Deliverable schema:

```json
{
  "type": "object",
  "required": [
    "verification_score",
    "schema_valid",
    "broken_links",
    "unsupported_claims",
    "citation_warnings",
    "audit_notes",
    "recommended_action"
  ],
  "properties": {
    "verification_score": { "type": "number" },
    "schema_valid": { "type": "boolean" },
    "broken_links": {
      "type": "array",
      "items": { "type": "string" }
    },
    "unsupported_claims": {
      "type": "array",
      "items": { "type": "string" }
    },
    "citation_warnings": {
      "type": "array",
      "items": { "type": "string" }
    },
    "audit_notes": {
      "type": "array",
      "items": { "type": "string" }
    },
    "recommended_action": {
      "type": "string",
      "enum": ["accept", "revise", "reject"]
    }
  }
}
```

## Runtime Environment Mapping

After the provider agent and both services are created, copy values into the local provider environment.

```text
CROO_API_URL=https://api.croo.network
CROO_WS_URL=wss://api.croo.network/ws
CROO_SDK_KEY=<provider SDK key from CROO dashboard>
CROO_RESEARCH_SERVICE_ID=c81b2464-8b36-4144-abd2-1569c9b1e66a
CROO_VERIFICATION_SERVICE_ID=bdf44995-e1da-4aff-8265-b65f244eac2a
BASE_RPC_URL=<optional Base RPC URL>
```

Run the provider with:

```bash
npm run provider
```

For the hackathon video, also run the offline deterministic demo:

```bash
npm run demo
```

The demo output can be used to show the same deliverable shape even before a live paid Order is submitted.
