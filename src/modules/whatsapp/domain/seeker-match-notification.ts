import { formatCommissionForSeeker } from "./commission-display.js";
import { generateDirectWhatsAppLink } from "./generate-direct-whatsapp-link.js";
import type { StructuredPropertySummary } from "./models.js";

export type SeekerNotificationParts = {
  body: string;
  directLink: string;
};

export function buildSeekerMatchNotification(
  structured: StructuredPropertySummary,
  commissionScheme: unknown,
  responderWhatsapp: string,
): SeekerNotificationParts {
  const commission = formatCommissionForSeeker(commissionScheme);
  const prefilled = `Hola, te escribo por una propiedad que viste en Hommi.`;
  const directLink = generateDirectWhatsAppLink(responderWhatsapp, prefilled);

  const body = `Encontré una opción que puede hacer match con tu búsqueda.

Resumen:
${structured.shortSummary}

Comisión: ${commission}

Habla directo con el agente aquí:
${directLink}

También dejé este match registrado en Hommi.

¿Te interesa avanzar con este contacto? Responde por este chat sí o no.`;

  return { body, directLink };
}
