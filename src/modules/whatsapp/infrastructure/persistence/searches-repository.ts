import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { Search } from "../../domain/models.js";
import type { SearchFindOutcome, SearchesRepositoryPort } from "../../application/ports.js";
import { mapSearchDoc } from "./firestore-read-mappers.js";
import { SearchStatusUpdateSchema } from "../../../shared-contracts/index.js";
import { createLogger } from "../../../shared/logger/logger.js";

const log = createLogger("repo:searches");
const COLLECTION = "searches";

export class SearchesRepository implements SearchesRepositoryPort {
  constructor(private readonly db: Firestore) {}

  async findByIdWithOutcome(id: string): Promise<SearchFindOutcome> {
    const doc = await this.db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) {
      log.info("search doc not found", { id, collection: COLLECTION });
      return { kind: "missing" };
    }
    const mapped = mapSearchDoc(doc.id, doc.data());
    if (!mapped) {
      log.warn("search doc exists but did not pass schema parse", { id, collection: COLLECTION });
      return { kind: "invalid" };
    }
    return { kind: "ok", search: mapped };
  }

  async findById(id: string): Promise<Search | null> {
    const o = await this.findByIdWithOutcome(id);
    return o.kind === "ok" ? o.search : null;
  }

  async updateStatus(searchId: string, status: string): Promise<void> {
    const validated = SearchStatusUpdateSchema.parse({ status });
    await this.db
      .collection(COLLECTION)
      .doc(searchId)
      .update({
        status: validated.status,
        updatedAt: FieldValue.serverTimestamp(),
      });
  }
}
