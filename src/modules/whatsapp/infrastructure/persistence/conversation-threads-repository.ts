import { FieldValue, type Firestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import type { ConversationThread, NetworkMemberKind } from "../../domain/models.js";
import type {
  ConversationThreadPatch,
  ConversationThreadsRepositoryPort,
  CreateDistributionThreadInput,
} from "../../application/ports.js";
import { isProcessableThreadState } from "../../domain/conversation-state.js";
import { mapConversationThreadDoc } from "./firestore-read-mappers.js";
import {
  CHANNEL,
  CONVERSATION_THREAD_STATE,
  ConversationThreadDistributionCreateSchema,
  ConversationThreadPatchSchema,
} from "../../../shared-contracts/index.js";

const COLLECTION = "conversation_threads";

function sortKeyMillis(thread: ConversationThread): number {
  const updated = thread.updatedAt?.toMillis();
  if (updated !== undefined) {
    return updated;
  }
  const created = thread.createdAt?.toMillis();
  if (created !== undefined) {
    return created;
  }
  return 0;
}

function mergeThreadDocs(docs: QueryDocumentSnapshot[]): ConversationThread[] {
  const byId = new Map<string, ConversationThread>();
  for (const doc of docs) {
    const mapped = mapConversationThreadDoc(doc.id, doc.data());
    if (mapped) {
      byId.set(mapped.id, mapped);
    }
  }
  return [...byId.values()];
}

export class ConversationThreadsRepository implements ConversationThreadsRepositoryPort {
  constructor(private readonly db: Firestore) {}

  async findProcessableWhatsAppThreadForParticipant(participantId: string): Promise<ConversationThread | null> {
    const col = this.db.collection(COLLECTION);
    const [snapPid, snapLegacy] = await Promise.all([
      col.where("participantId", "==", participantId).where("channel", "==", CHANNEL.WHATSAPP).limit(25).get(),
      col.where("contactId", "==", participantId).where("channel", "==", CHANNEL.WHATSAPP).limit(25).get(),
    ]);

    const threads = mergeThreadDocs([...snapPid.docs, ...snapLegacy.docs]).filter((t) =>
      isProcessableThreadState(t.state),
    );

    if (threads.length === 0) {
      return null;
    }

    threads.sort((a, b) => sortKeyMillis(b) - sortKeyMillis(a));
    return threads[0] ?? null;
  }

  async findOpenThreadForSearchParticipant(
    searchId: string,
    participantId: string,
    participantType: NetworkMemberKind,
    channel: string,
  ): Promise<ConversationThread | null> {
    const col = this.db.collection(COLLECTION);
    const [snapPid, snapLegacy] = await Promise.all([
      col
        .where("searchId", "==", searchId)
        .where("participantId", "==", participantId)
        .where("channel", "==", channel)
        .limit(15)
        .get(),
      col
        .where("searchId", "==", searchId)
        .where("contactId", "==", participantId)
        .where("channel", "==", channel)
        .limit(15)
        .get(),
    ]);

    const pool = mergeThreadDocs([...snapPid.docs, ...snapLegacy.docs]).filter(
      (t) =>
        t.state !== CONVERSATION_THREAD_STATE.CLOSED &&
        t.participantId === participantId &&
        t.participantType === participantType,
    );

    if (pool.length === 0) {
      return null;
    }

    pool.sort((a, b) => sortKeyMillis(b) - sortKeyMillis(a));
    return pool[0] ?? null;
  }

  async createDistributionThread(input: CreateDistributionThreadInput): Promise<string> {
    const validated = ConversationThreadDistributionCreateSchema.parse({
      participantId: input.participantId,
      participantType: input.participantType,
      searchId: input.searchId,
      outreachId: input.outreachId,
      channel: input.channel,
      state: CONVERSATION_THREAD_STATE.AWAITING_YES_NO,
      lastMessageText: input.initialMessagePreview,
    });

    const ref = this.db.collection(COLLECTION).doc();
    const now = FieldValue.serverTimestamp();
    await ref.set({
      ...validated,
      lastOutboundAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  }

  async updateThread(threadId: string, patch: ConversationThreadPatch): Promise<void> {
    const patchBody: Record<string, unknown> = {};
    if (patch.state !== undefined) {
      patchBody["state"] = patch.state;
    }
    if (patch.lastMessageText !== undefined) {
      patchBody["lastMessageText"] = patch.lastMessageText;
    }
    if (patch.searchId !== undefined) {
      patchBody["searchId"] = patch.searchId;
    }
    if (patch.outreachId !== undefined) {
      patchBody["outreachId"] = patch.outreachId;
    }
    if (patch.provisionalPropertySummary !== undefined) {
      patchBody["provisionalPropertySummary"] = patch.provisionalPropertySummary;
    }
    if (Object.keys(patchBody).length > 0) {
      ConversationThreadPatchSchema.parse(patchBody);
    }

    const updatePayload: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (patch.state !== undefined) {
      updatePayload["state"] = patch.state;
    }
    if (patch.lastMessageText !== undefined) {
      updatePayload["lastMessageText"] = patch.lastMessageText;
    }
    if (patch.searchId !== undefined) {
      updatePayload["searchId"] = patch.searchId;
    }
    if (patch.outreachId !== undefined) {
      updatePayload["outreachId"] = patch.outreachId;
    }
    if (patch.provisionalPropertySummary !== undefined) {
      if (patch.provisionalPropertySummary === null) {
        updatePayload["provisionalPropertySummary"] = FieldValue.delete();
      } else {
        updatePayload["provisionalPropertySummary"] = patch.provisionalPropertySummary;
      }
    }
    if (patch.touchLastInboundAt) {
      updatePayload["lastInboundAt"] = FieldValue.serverTimestamp();
    }
    if (patch.touchLastOutboundAt) {
      updatePayload["lastOutboundAt"] = FieldValue.serverTimestamp();
    }

    await this.db.collection(COLLECTION).doc(threadId).update(updatePayload);
  }
}
