import type { DocumentData } from "firebase-admin/firestore";
import type { Agent, Contact, ConversationThread, Match, Outreach, Search } from "../../domain/models.js";
import { createLogger } from "../../../shared/logger/logger.js";
import {
  parseAgentFromFirestore,
  parseContactFromFirestore,
  parseConversationThreadFromFirestore,
  parseMatchFromFirestore,
  parseOutreachFromFirestore,
  parseSearchFromFirestore,
} from "../../../shared-contracts/index.js";

const log = createLogger("firestore-map");

function asRecord(data: DocumentData | undefined): Record<string, unknown> | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  return data as Record<string, unknown>;
}

export function mapContactDoc(id: string, data: DocumentData | undefined): Contact | null {
  const rec = asRecord(data);
  if (!rec) {
    return null;
  }
  const parsed = parseContactFromFirestore(id, rec);
  if (!parsed) {
    log.warn("contact document failed schema validation", { id });
  }
  return parsed;
}

export function mapConversationThreadDoc(id: string, data: DocumentData | undefined): ConversationThread | null {
  const rec = asRecord(data);
  if (!rec) {
    return null;
  }
  const parsed = parseConversationThreadFromFirestore(id, rec);
  if (!parsed) {
    log.warn("conversation_thread document failed schema validation", { id });
  }
  return parsed;
}

export function mapOutreachDoc(id: string, data: DocumentData | undefined): Outreach | null {
  const rec = asRecord(data);
  if (!rec) {
    return null;
  }
  const parsed = parseOutreachFromFirestore(id, rec);
  if (!parsed) {
    log.warn("outreach document failed schema validation", { id });
  }
  return parsed;
}

export function mapAgentDoc(id: string, data: DocumentData | undefined): Agent | null {
  const rec = asRecord(data);
  if (!rec) {
    return null;
  }
  const parsed = parseAgentFromFirestore(id, rec);
  if (!parsed) {
    log.warn("agent document failed schema validation", { id });
  }
  return parsed;
}

export function mapSearchDoc(id: string, data: DocumentData | undefined): Search | null {
  const rec = asRecord(data);
  if (!rec) {
    return null;
  }
  const parsed = parseSearchFromFirestore(id, rec);
  if (!parsed) {
    log.warn("search document failed schema validation", { id });
  }
  return parsed;
}

export function mapMatchDoc(id: string, data: DocumentData | undefined): Match | null {
  const rec = asRecord(data);
  if (!rec) {
    return null;
  }
  const parsed = parseMatchFromFirestore(id, rec);
  if (!parsed) {
    log.warn("match document failed schema validation", { id });
  }
  return parsed;
}
