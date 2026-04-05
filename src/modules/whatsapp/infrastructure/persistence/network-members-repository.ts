import type { NetworkMember } from "../../domain/models.js";
import type {
  AgentsRepositoryPort,
  ContactsRepositoryPort,
  NetworkMembersRepositoryPort,
} from "../../application/ports.js";
import { networkMemberFromAgent, networkMemberFromContact } from "../../domain/network-member.js";
import { buildPhoneLookupVariants } from "./phone-variants.js";

/**
 * Resolves an inbound WhatsApp sender to a unified {@link NetworkMember}.
 * Builds phone variants once, tries every variant on contacts, then on agents.
 */
export class NetworkMembersRepository implements NetworkMembersRepositoryPort {
  constructor(
    private readonly contacts: ContactsRepositoryPort,
    private readonly agents: AgentsRepositoryPort,
  ) {}

  async findByWhatsAppOrPhone(rawFrom: string): Promise<NetworkMember | null> {
    const variants = buildPhoneLookupVariants(rawFrom);

    for (const value of variants) {
      const contact = await this.contacts.findByWhatsappOrPhoneValue(value);
      if (contact) {
        return networkMemberFromContact(contact);
      }
    }

    for (const value of variants) {
      const agent = await this.agents.findByWhatsappOrPhoneValue(value);
      if (agent) {
        return networkMemberFromAgent(agent);
      }
    }

    return null;
  }
}
