# ProofDesk DoraHacks BUIDL Draft

Use this draft when filing the CROO Agent Hackathon BUIDL on DoraHacks.

## Basic Info

- **BUIDL name:** ProofDesk
- **Tagline:** Paid source-grounded research and evidence verification for CROO CAP.
- **Website:** Agent Store listing URL after publishing.
- **Repository:** `https://github.com/KKUCODES/proofdesk`
- **License:** MIT
- **Demo video:** Public video URL after recording.
- **Tracks:** Research & Intelligence Agents; Data & Verification Agents

## Short Description

ProofDesk is a CROO Agent Store provider that sells two composable schema services: Claim Research Report and Evidence Verification. It turns paid research requests into structured reports with verdicts, confidence, citations, source hashes, limitations, and an evidence bundle hash, then provides an independent verifier service that audits reports for schema validity, citation quality, unsupported claims, and recommended action.

## Long Description

Paid agent commerce needs deliverables that are inspectable by humans and reusable by other agents. ProofDesk demonstrates this through a CROO CAP provider with two services:

1. **Claim Research Report** accepts a claim or research question and returns a schema JSON report with verdict, confidence, summary, key findings, citations, content hashes, limitations, and an evidence bundle hash.
2. **Evidence Verification** accepts a report and returns a schema JSON audit with verification score, schema validity, citation warnings, unsupported claims, audit notes, and recommended action.

The provider listens for CROO negotiation and paid order events, validates request payloads before accepting negotiations, routes paid orders to the correct local service, and delivers schema JSON through the CROO SDK. The local demo is offline and deterministic so judges can reproduce the same supported report and accepted verification result without live credentials.

## CROO / CAP Integration Notes

- Uses `@croo-network/sdk`.
- Registers the CROO event names `order_negotiation_created` and `order_paid`.
- Validates supported service IDs and payload schemas before accepting negotiations.
- Rejects unsupported or malformed negotiations before payment.
- Fetches order and negotiation details for paid orders.
- Delivers results with `DeliverableType.Schema` and `deliverableSchema` JSON.
- Runtime configuration is provided by `CROO_SDK_KEY`, `CROO_RESEARCH_SERVICE_ID`, `CROO_VERIFICATION_SERVICE_ID`, `CROO_API_URL`, `CROO_WS_URL`, and optional `BASE_RPC_URL`.

## Demo Flow

1. Show ProofDesk Agent Store listing with the two schema services.
2. Run `npm test` and `npm run build`.
3. Run `npm run demo`.
4. Open `examples/report-output.json` and show `verdict`, `confidence`, citations, `content_hash`, and `evidence_bundle_hash`.
5. Open `examples/verification-output.json` and show `verification_score`, `schema_valid`, warnings, and `recommended_action`.
6. Explain CAP lifecycle: negotiate, lock, deliver, clear.

## Suggested BUIDL Links

- **GitHub:** `https://github.com/KKUCODES/proofdesk`
- **Agent Store:** Replace with the published CROO Agent Store URL.
- **Demo video:** Replace with the uploaded public video URL.

