import { pathToFileURL } from "node:url";

const placeholderMessage =
  "ProofDesk demo runner is not implemented yet. Task 8 will add the local demo.";

export function getDemoPlaceholderMessage(): string {
  return placeholderMessage;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(placeholderMessage);
}
