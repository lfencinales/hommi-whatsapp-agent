import type { Agent, Contact, NetworkMember } from "./models.js";

export function networkMemberFromContact(contact: Contact): NetworkMember {
  return {
    id: contact.id,
    type: "contact",
    fullName: contact.fullName ?? "",
    agencyName: contact.agencyName ?? "",
    phone: contact.phone ?? "",
    whatsapp: contact.whatsapp ?? "",
    directoryStatus: contact.directoryStatus ?? "",
    isPaused: contact.isPaused ?? false,
  };
}

export function networkMemberFromAgent(agent: Agent): NetworkMember {
  return {
    id: agent.id,
    type: "agent",
    fullName: agent.fullName ?? "",
    agencyName: agent.agencyName ?? "",
    phone: agent.phone ?? "",
    whatsapp: agent.whatsapp ?? "",
    directoryStatus: agent.directoryStatus ?? "",
    isPaused: false,
  };
}
