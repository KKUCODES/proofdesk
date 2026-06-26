# ProofDesk Submission Checklist

Hackathon deadline: July 12, 2026 at 17:00 HKT.

## Local Verification

- [x] `npm test` passes.
- [x] `npm run build` passes.
- [x] `npm run demo` prints JSON and writes example outputs.
- [x] MIT license exists.
- [x] README includes setup, service schemas, and CROO provider usage.
- [x] Demo script exists at `docs/demo-script.md`.
- [x] Agent Store setup guide exists at `docs/agent-store-setup.md`.

## GitHub

- [x] Create public repository `KKUCODES/proofdesk`.
- [x] Push the local branch contents.
- [x] Confirm README renders on GitHub.
- [x] Confirm `LICENSE` is visible and detected as MIT.
- [x] Use `https://github.com/KKUCODES/proofdesk` in DoraHacks.

## CROO Agent Store

- [x] Create provider agent named `ProofDesk`.
- [x] Add Service 1: `Claim Research Report`.
- [x] Add Service 2: `Evidence Verification`.
- [x] Use schemas and descriptions from `docs/agent-store-setup.md`.
- [x] Copy provider SDK key into `.env` as `CROO_SDK_KEY`.
- [x] Copy service IDs into `.env` as `CROO_RESEARCH_SERVICE_ID` and `CROO_VERIFICATION_SERVICE_ID`.
- [x] Run `npm run provider` and confirm it connects.
- [x] Save the public Agent Store listing URL: `https://agent.croo.network/agents/ee0428c4-63d9-4ee2-9a06-1239a8fb1b34`.

## Demo Video

- [ ] Keep video under 5 minutes.
- [ ] Follow `docs/demo-script.md`.
- [ ] Show the Agent Store listing.
- [ ] Show provider runtime or explain the CROO event flow.
- [ ] Run `npm run demo`.
- [ ] Show `examples/report-output.json`.
- [ ] Show `examples/verification-output.json`.
- [ ] Upload video publicly or unlisted with a shareable URL.

## DoraHacks BUIDL

- [x] Register as hacker for the CROO Agent Hackathon.
- [ ] Submit BUIDL before July 12, 2026 at 17:00 HKT.
- [ ] Use `docs/dorahacks-buidl-draft.md` for title, tagline, and descriptions.
- [ ] Select tracks: Research & Intelligence Agents; Data & Verification Agents.
- [ ] Add GitHub URL.
- [ ] Add CROO Agent Store listing URL.
- [ ] Add demo video URL.
- [ ] Confirm all required fields are complete.
