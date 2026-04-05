import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { ResponsesRepositoryPort, CreateResponseInput } from "../../application/ports.js";
import { CHANNEL, ResponseCreateSchema, ResponseStatusUpdateSchema } from "../../../shared-contracts/index.js";

const COLLECTION = "responses";

export class ResponsesRepository implements ResponsesRepositoryPort {
  constructor(private readonly db: Firestore) {}

  async create(input: CreateResponseInput): Promise<string> {
    const validated = ResponseCreateSchema.parse({
      searchId: input.searchId,
      receiverId: input.receiverId,
      receiverType: input.receiverType,
      interested: input.interested,
      propertySummaryRaw: input.propertySummaryRaw,
      propertySummaryStructured: input.propertySummaryStructured,
      originChannel: CHANNEL.WHATSAPP,
      initialStatus: input.initialStatus,
    });

    const ref = this.db.collection(COLLECTION).doc();
    await ref.set({
      searchId: validated.searchId,
      receiverId: validated.receiverId,
      receiverType: validated.receiverType,
      interested: validated.interested,
      propertySummaryRaw: validated.propertySummaryRaw,
      propertySummaryStructured: validated.propertySummaryStructured,
      originChannel: validated.originChannel,
      status: validated.initialStatus,
      createdAt: FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async updateStatus(responseId: string, status: string): Promise<void> {
    const validated = ResponseStatusUpdateSchema.parse({ status });
    await this.db.collection(COLLECTION).doc(responseId).update({
      status: validated.status,
    });
  }
}
