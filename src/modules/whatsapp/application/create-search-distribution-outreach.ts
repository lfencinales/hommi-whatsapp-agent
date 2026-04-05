import type { CreateSearchDistributionOutreachInput, SearchDistributionDeps } from "./ports.js";

export async function createSearchDistributionOutreach(
  deps: Pick<SearchDistributionDeps, "outreach">,
  input: CreateSearchDistributionOutreachInput,
): Promise<string> {
  return deps.outreach.createSearchDistributionOutreach(input);
}
