import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ResearchReport, VerificationResult } from "../domain/types.js";
import { parseResearchRequest, parseVerificationRequest } from "../domain/validation.js";
import { buildResearchReport } from "../research/report.js";
import type { EvidenceSource } from "../research/evidence.js";
import { verifyResearchReport } from "../verification/verifier.js";

export interface LocalDemoResult {
  report: ResearchReport;
  verification: VerificationResult;
}

export const demoResearchInput = {
  question: "Does CROO CAP support escrow-backed paid agent Orders on Base?",
  domain: "croo",
  required_source_count: 2,
  freshness_days: 90,
  output_style: "concise",
  source_urls: [
    "https://docs.croo.network/developer-docs/core-concepts/order-lifecycle.md",
    "https://docs.croo.network/developer-docs/core-concepts/cap.md",
  ],
};

const demoSources: EvidenceSource[] = [
  {
    title: "Order Lifecycle",
    url: "https://docs.croo.network/developer-docs/core-concepts/order-lifecycle.md",
    publisher: "CROO Network",
    published_at: "2026-04-07",
    text:
      "CROO CAP on Base supports paid agent Orders. Requester pays, escrow is locked in CAPVault, " +
      "the provider delivers, and settlement is released after delivery.",
  },
  {
    title: "CAP Concepts",
    url: "https://docs.croo.network/developer-docs/core-concepts/cap.md",
    publisher: "CROO Network",
    published_at: "2026-04-08",
    text:
      "The CROO CAP protocol coordinates paid agent Orders with escrow-backed settlement on Base " +
      "so service providers can accept work and deliver results.",
  },
];

const accessedAt = "2026-06-26T00:00:00.000Z";

function projectRootFromModule(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

function toPrettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function isDirectCliInvocation(
  argv = process.argv,
  moduleUrl = import.meta.url,
): boolean {
  const modulePath = fileURLToPath(moduleUrl);
  const sourceEntrypoint = resolve(projectRootFromModule(), "src", "cli", "demo.ts");
  const builtEntrypoint = resolve(projectRootFromModule(), "dist", "src", "cli", "demo.js");

  return argv.slice(1).some((arg) => {
    const candidate = resolve(arg);
    return (
      candidate === modulePath ||
      candidate === sourceEntrypoint ||
      candidate === builtEntrypoint
    );
  });
}

export function runLocalDemo(): LocalDemoResult {
  const request = parseResearchRequest(demoResearchInput);
  const report = buildResearchReport({
    request,
    sources: demoSources,
    accessedAt,
  });
  const verificationRequest = parseVerificationRequest({
    report,
    strictness: "medium",
  });
  const verification = verifyResearchReport(verificationRequest);

  return { report, verification };
}

async function writeDemoOutputs(result: LocalDemoResult): Promise<void> {
  const examplesDir = resolve(projectRootFromModule(), "examples");

  await mkdir(examplesDir, { recursive: true });
  await writeFile(resolve(examplesDir, "report-output.json"), toPrettyJson(result.report), "utf8");
  await writeFile(
    resolve(examplesDir, "verification-output.json"),
    toPrettyJson(result.verification),
    "utf8",
  );
}

async function main(): Promise<void> {
  const result = runLocalDemo();

  await writeDemoOutputs(result);
  console.log(JSON.stringify(result, null, 2));
}

if (isDirectCliInvocation()) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
