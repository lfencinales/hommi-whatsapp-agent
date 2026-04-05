import type { Recipient } from "../domain/models.js";
import type { ConversationThreadsRepositoryPort } from "./ports.js";
import { CHANNEL, CONVERSATION_THREAD_STATE } from "../../shared-contracts/index.js";

export async function createOrUpdateConversationThreadForDistribution(
  threads: ConversationThreadsRepositoryPort,
  params: {
    searchId: string;
    recipient: Recipient;
    outreachId: string;
    messagePreview: string;
  },
): Promise<{ threadId: string; reused: boolean }> {
  const { searchId, recipient, outreachId, messagePreview } = params;

  const existing = await threads.findOpenThreadForSearchParticipant(
    searchId,
    recipient.id,
    recipient.type,
    CHANNEL.WHATSAPP,
  );

  if (existing) {
    await threads.updateThread(existing.id, {
      searchId,
      outreachId,
      state: CONVERSATION_THREAD_STATE.AWAITING_YES_NO,
      lastMessageText: messagePreview,
      touchLastOutboundAt: true,
    });
    return { threadId: existing.id, reused: true };
  }

  const threadId = await threads.createDistributionThread({
    searchId,
    participantId: recipient.id,
    participantType: recipient.type,
    outreachId,
    channel: CHANNEL.WHATSAPP,
    initialMessagePreview: messagePreview,
  });
  return { threadId, reused: false };
}
