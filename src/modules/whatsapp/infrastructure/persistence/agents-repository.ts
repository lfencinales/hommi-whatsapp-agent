import type { Firestore } from "firebase-admin/firestore";
import type { Agent } from "../../domain/models.js";
import type { AgentsRepositoryPort } from "../../application/ports.js";
import { mapAgentDoc } from "./firestore-read-mappers.js";
import { buildPhoneLookupVariants } from "./phone-variants.js";

const COLLECTION = "agents";

export class AgentsRepository implements AgentsRepositoryPort {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<Agent | null> {
    const doc = await this.db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return mapAgentDoc(doc.id, doc.data());
  }

  async findByWhatsappOrPhoneValue(value: string): Promise<Agent | null> {
    const col = this.db.collection(COLLECTION);
    const byWhatsapp = await col.where("whatsapp", "==", value).limit(1).get();
    const waDoc = byWhatsapp.docs[0];
    if (waDoc) {
      return mapAgentDoc(waDoc.id, waDoc.data());
    }
    const byPhone = await col.where("phone", "==", value).limit(1).get();
    const phoneDoc = byPhone.docs[0];
    if (phoneDoc) {
      return mapAgentDoc(phoneDoc.id, phoneDoc.data());
    }
    return null;
  }

  async findByWhatsAppOrPhone(rawFrom: string): Promise<Agent | null> {
    for (const value of buildPhoneLookupVariants(rawFrom)) {
      const found = await this.findByWhatsappOrPhoneValue(value);
      if (found) {
        return found;
      }
    }
    return null;
  }

  async listByCity(city: string, limit: number): Promise<Agent[]> {
    const normalized = city.trim();
    if (!normalized) {
      return [];
    }
    const snap = await this.db
      .collection(COLLECTION)
      .where("city", "==", normalized)
      .limit(limit)
      .get();
    return snap.docs
      .map((d) => mapAgentDoc(d.id, d.data()))
      .filter((a): a is Agent => a !== null);
  }

  async listRecentForDistribution(limit: number): Promise<Agent[]> {
    const snap = await this.db.collection(COLLECTION).limit(limit).get();
    return snap.docs
      .map((d) => mapAgentDoc(d.id, d.data()))
      .filter((a): a is Agent => a !== null);
  }
}
