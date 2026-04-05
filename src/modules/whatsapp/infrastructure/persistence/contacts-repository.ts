import type { Firestore } from "firebase-admin/firestore";
import type { Contact } from "../../domain/models.js";
import { mapContactDoc } from "./firestore-read-mappers.js";
import type { ContactsRepositoryPort } from "../../application/ports.js";
import { buildPhoneLookupVariants } from "./phone-variants.js";

const COLLECTION = "contacts";

export class ContactsRepository implements ContactsRepositoryPort {
  constructor(private readonly db: Firestore) {}

  async findByWhatsappOrPhoneValue(value: string): Promise<Contact | null> {
    const col = this.db.collection(COLLECTION);
    const byWhatsapp = await col.where("whatsapp", "==", value).limit(1).get();
    const waDoc = byWhatsapp.docs[0];
    if (waDoc) {
      return mapContactDoc(waDoc.id, waDoc.data());
    }
    const byPhone = await col.where("phone", "==", value).limit(1).get();
    const phoneDoc = byPhone.docs[0];
    if (phoneDoc) {
      return mapContactDoc(phoneDoc.id, phoneDoc.data());
    }
    return null;
  }

  async findByWhatsAppOrPhone(rawFrom: string): Promise<Contact | null> {
    for (const value of buildPhoneLookupVariants(rawFrom)) {
      const found = await this.findByWhatsappOrPhoneValue(value);
      if (found) {
        return found;
      }
    }
    return null;
  }

  async listByCity(city: string, limit: number): Promise<Contact[]> {
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
      .map((d) => mapContactDoc(d.id, d.data()))
      .filter((c): c is Contact => c !== null);
  }

  async listRecentForDistribution(limit: number): Promise<Contact[]> {
    const snap = await this.db.collection(COLLECTION).limit(limit).get();
    return snap.docs
      .map((d) => mapContactDoc(d.id, d.data()))
      .filter((c): c is Contact => c !== null);
  }
}
