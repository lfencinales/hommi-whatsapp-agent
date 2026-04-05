import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { CreateMatchInput, MatchesRepositoryPort } from "../../application/ports.js";
import type { Match } from "../../domain/models.js";
import type { MatchSeekerOutcome } from "../../../shared-contracts/enums.js";
import { mapMatchDoc } from "./firestore-read-mappers.js";
import { MATCH_STATUS, MatchCreateSchema, MatchSeekerOutcomeUpdateSchema } from "../../../shared-contracts/index.js";

const COLLECTION = "matches";

export class MatchesRepository implements MatchesRepositoryPort {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<Match | null> {
    const doc = await this.db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return mapMatchDoc(doc.id, doc.data());
  }

  async create(input: CreateMatchInput): Promise<string> {
    const validated = MatchCreateSchema.parse({
      searchId: input.searchId,
      seekerAgentId: input.seekerAgentId,
      responderId: input.responderId,
      responderType: input.responderType,
      responseId: input.responseId,
      commissionSnapshot: input.commissionSnapshot ?? null,
      channel: input.channel,
      responderWhatsapp: input.responderWhatsapp,
    });

    const ref = this.db.collection(COLLECTION).doc();
    const now = FieldValue.serverTimestamp();
    await ref.set({
      searchId: validated.searchId,
      seekerAgentId: validated.seekerAgentId,
      responderId: validated.responderId,
      responderType: validated.responderType,
      responseId: validated.responseId,
      commissionSnapshot: validated.commissionSnapshot,
      channel: validated.channel,
      status: MATCH_STATUS.ABIERTO,
      responderWhatsapp: validated.responderWhatsapp,
      notificationSentAt: null,
      openedAt: null,
      closedAt: null,
      createdAt: now,
    });
    return ref.id;
  }

  async markSeekerNotificationSent(matchId: string): Promise<void> {
    await this.db.collection(COLLECTION).doc(matchId).update({
      notificationSentAt: FieldValue.serverTimestamp(),
    });
  }

  async updateSeekerOutcome(matchId: string, outcome: MatchSeekerOutcome): Promise<void> {
    const validated = MatchSeekerOutcomeUpdateSchema.parse({ status: outcome });
    await this.db.collection(COLLECTION).doc(matchId).update({
      status: validated.status,
      closedAt: FieldValue.serverTimestamp(),
    });
  }
}
