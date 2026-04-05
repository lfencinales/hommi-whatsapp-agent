import type { NetworkMember, StructuredPropertySummary } from "../domain/models.js";
import type { InboundWhatsAppDeps } from "./ports.js";
import { CHANNEL, RESPONSE_STATUS } from "../../shared-contracts/index.js";

export async function createResponseFromSummary(
  deps: InboundWhatsAppDeps,
  input: {
    searchId: string;
    member: NetworkMember;
    rawSummary: string;
    structured: StructuredPropertySummary;
  },
): Promise<string> {
  return deps.responses.create({
    searchId: input.searchId,
    receiverId: input.member.id,
    receiverType: input.member.type,
    interested: true,
    propertySummaryRaw: input.rawSummary,
    propertySummaryStructured: input.structured,
    originChannel: CHANNEL.WHATSAPP,
    initialStatus: RESPONSE_STATUS.RECEIVED,
  });
}
