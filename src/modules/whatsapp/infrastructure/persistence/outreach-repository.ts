import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type {
  CreateMatchNotificationOutreachInput,
  CreateSearchDistributionOutreachInput,
  OutreachRepositoryPort,
} from "../../application/ports.js";
import type { Outreach } from "../../domain/models.js";
import { mapOutreachDoc } from "./firestore-read-mappers.js";
import {
  OUTREACH_DELIVERY_STATUS,
  OUTREACH_RESPONSE_STATUS,
  OUTREACH_TYPE,
  OutreachDeliveryUpdateSchema,
  OutreachResponseStatusSchema,
  MatchNotificationOutreachCreateSchema,
  SearchDistributionOutreachCreateSchema,
} from "../../../shared-contracts/index.js";

const COLLECTION = "outreach";

export class OutreachRepository implements OutreachRepositoryPort {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<Outreach | null> {
    const doc = await this.db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return mapOutreachDoc(doc.id, doc.data());
  }

  async findLatestPendingMatchNotificationForReceiver(receiverId: string): Promise<Outreach | null> {
    const snap = await this.db.collection(COLLECTION).where("receiverId", "==", receiverId).limit(40).get();
    const pending: Outreach[] = [];
    for (const doc of snap.docs) {
      const o = mapOutreachDoc(doc.id, doc.data());
      if (!o) {
        continue;
      }
      if (o.type !== OUTREACH_TYPE.MATCH_NOTIFICATION) {
        continue;
      }
      if (o.responseStatus !== OUTREACH_RESPONSE_STATUS.PENDING) {
        continue;
      }
      pending.push(o);
    }
    if (pending.length === 0) {
      return null;
    }
    pending.sort((a, b) => {
      const ma = a.sentAt && typeof a.sentAt.toMillis === "function" ? a.sentAt.toMillis() : 0;
      const mb = b.sentAt && typeof b.sentAt.toMillis === "function" ? b.sentAt.toMillis() : 0;
      return mb - ma;
    });
    return pending[0] ?? null;
  }

  async updateResponseStatus(outreachId: string, responseStatus: string): Promise<void> {
    const status = OutreachResponseStatusSchema.parse(responseStatus);
    await this.db
      .collection(COLLECTION)
      .doc(outreachId)
      .update({
        responseStatus: status,
        respondedAt: FieldValue.serverTimestamp(),
      });
  }

  async createMatchNotificationOutreach(input: CreateMatchNotificationOutreachInput): Promise<string> {
    const validated = MatchNotificationOutreachCreateSchema.parse({
      searchId: input.searchId,
      receiverId: input.receiverId,
      receiverType: input.receiverType,
      relatedResponseId: input.relatedResponseId,
      relatedMatchId: input.relatedMatchId,
      channel: input.channel,
      deliveryStatus: input.deliveryStatus,
      messageId: input.messageId,
    });

    const ref = this.db.collection(COLLECTION).doc();
    const payload: Record<string, unknown> = {
      type: OUTREACH_TYPE.MATCH_NOTIFICATION,
      searchId: validated.searchId,
      receiverId: validated.receiverId,
      receiverType: validated.receiverType,
      relatedResponseId: validated.relatedResponseId,
      relatedMatchId: validated.relatedMatchId,
      channel: validated.channel,
      deliveryStatus: validated.deliveryStatus,
      sentAt: FieldValue.serverTimestamp(),
    };
    if (validated.messageId !== undefined) {
      payload["messageId"] = validated.messageId;
    }
    await ref.set(payload);
    return ref.id;
  }

  async createSearchDistributionOutreach(input: CreateSearchDistributionOutreachInput): Promise<string> {
    const validated = SearchDistributionOutreachCreateSchema.parse({
      searchId: input.searchId,
      receiverId: input.receiverId,
      receiverType: input.receiverType,
      channel: input.channel,
    });

    const ref = this.db.collection(COLLECTION).doc();
    const now = FieldValue.serverTimestamp();
    await ref.set({
      type: OUTREACH_TYPE.SEARCH_DISTRIBUTION,
      searchId: validated.searchId,
      receiverId: validated.receiverId,
      receiverType: validated.receiverType,
      channel: validated.channel,
      deliveryStatus: OUTREACH_DELIVERY_STATUS.PENDING,
      responseStatus: OUTREACH_RESPONSE_STATUS.PENDING,
      sentAt: now,
    });
    return ref.id;
  }

  async updateDistributionDelivery(
    outreachId: string,
    input: { deliveryStatus: string; messageId?: string | undefined },
  ): Promise<void> {
    const validated = OutreachDeliveryUpdateSchema.parse({
      deliveryStatus: input.deliveryStatus,
      messageId: input.messageId,
    });
    const payload: Record<string, unknown> = {
      deliveryStatus: validated.deliveryStatus,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (validated.messageId !== undefined) {
      payload["messageId"] = validated.messageId;
    }
    await this.db.collection(COLLECTION).doc(outreachId).update(payload);
  }
}
