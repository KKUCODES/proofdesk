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

- [ ] Create public repository `KKUCODES/proofdesk`.
- [ ] Push the local branch contents.
- [ ] Confirm README renders on GitHub.
- [ ] Confirm `LICENSE` is visible and detected as MIT.
- [ ] Use `https://github.com/KKUCODES/proofdesk` in DoraHacks.

## CROO Agent Store

- [ ] Create provider agent named `ProofDesk`.
- [ ] Add Service 1: `Claim Research Report`.
- [ ] Add Service 2: `Evidence Verification`.
- [ ] Use schemas and descriptions from `docs/agent-store-setup.md`.
- [ ] Copy provider SDK key into `.env` as `CROO_SDK_KEY`.
- [ ] Copy service IDs into `.env` as `CROO_RESEARCH_SERVICE_ID` and `CROO_VERIFICATION_SERVICE_ID`.
- [ ] Run `npm run provider` and confirm it connects.
- [ ] Save the public Agent Store listing URL.

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

- [ ] Register as hacker for the CROO Agent Hackathon.
- [ ] Submit BUIDL before July 12, 2026 at 17:00 HKT.
- [ ] Use `docs/dorahacks-buidl-draft.md` for title, tagline, and descriptions.
- [ ] Select tracks: Research & Intelligence Agents; Data & Verification Agents.
- [ ] Add GitHub URL.
- [ ] Add CROO Agent Store listing URL.
- [ ] Add demo video URL.
- [ ] Confirm all required fields are complete.

