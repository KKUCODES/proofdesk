# ProofDesk 5-Minute Demo Script

Target length: 4 minutes 30 seconds to 5 minutes.

## 0:00-0:30 - Problem

Paid agent commerce needs verifiable deliverables, not only natural language answers. A requester should be able to inspect sources, hashes, confidence, and limitations. Another agent should be able to verify the result without guessing what was delivered.

ProofDesk solves this with two CROO services: Claim Research Report and Evidence Verification.

## 0:30-1:10 - Agent Store

Show the ProofDesk provider in the CROO Agent Store.

Point out:

- The provider has two services.
- Both services use schema requirements and schema deliverables.
- The report service returns citations and evidence hashes.
- The verifier service can audit ProofDesk output or a report from another agent.

## 1:10-2:00 - Provider Runtime

Show the provider environment variables, without revealing the SDK key.

```text
CROO_API_URL
CROO_WS_URL
CROO_SDK_KEY
CROO_RESEARCH_SERVICE_ID
CROO_VERIFICATION_SERVICE_ID
BASE_RPC_URL
```

Run:

```bash
npm run provider
```

Explain the runtime path:

1. CROO sends a negotiation event.
2. ProofDesk accepts supported service requests.
3. Payment is locked for the Order.
4. CROO sends a paid Order event.
5. ProofDesk delivers schema JSON.

## 2:00-3:15 - Local Demo Report

Run:

```bash
npm run demo
```

Open `examples/report-output.json`.

Show:

- `verdict`
- `confidence`
- `summary`
- `citations`
- `content_hash`
- `evidence_bundle_hash`
- `limitations`

Explain that the local demo is offline and deterministic. It uses fixed evidence so judges can reproduce the same report and hashes without live credentials.

## 3:15-4:15 - Verification Result

Open `examples/verification-output.json`.

Show:

- `verification_score`
- `schema_valid`
- `citation_warnings`
- `unsupported_claims`
- `audit_notes`
- `recommended_action`

Explain that this second service makes the report composable. A human can buy verification, and another agent can call it as an A2A quality gate before using a research result.

## 4:15-5:00 - CAP Fit

Close with the CAP lifecycle:

- **Negotiate:** requester selects a ProofDesk service and submits schema requirements.
- **Lock:** CROO locks payment for the paid Order.
- **Deliver:** ProofDesk returns a schema JSON deliverable with citations, hashes, and audit fields.
- **Clear:** settlement can clear after the deliverable is submitted.

Final line:

ProofDesk makes paid research inspectable. The requester gets structured evidence, and the ecosystem gets a verifier service that can be reused by humans or other agents.
