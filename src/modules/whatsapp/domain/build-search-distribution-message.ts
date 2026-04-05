import { formatCommissionForSeeker } from "./commission-display.js";
import type { Search } from "./models.js";

function pickLocationSuffix(search: Search): string {
  const pd = search.parsedData;
  const city = typeof pd?.["city"] === "string" ? pd["city"].trim() : "";
  const zone = typeof pd?.["zone"] === "string" ? pd["zone"].trim() : "";
  if (city && zone) {
    return ` en ${city} (${zone})`;
  }
  if (city) {
    return ` en ${city}`;
  }
  if (zone) {
    return ` (${zone})`;
  }
  return "";
}

function pickSummaryLine(search: Search): string {
  const raw = search.rawText?.replace(/\s+/g, " ").trim() ?? "";
  if (raw.length > 0) {
    return raw.length > 220 ? `${raw.slice(0, 217).trimEnd()}…` : raw;
  }
  return "Nueva búsqueda registrada en Hommi.";
}

/**
 * Outbound copy for the first WhatsApp touch of a search distribution (MVP).
 */
export function buildSearchDistributionMessage(search: Search): string {
  const location = pickLocationSuffix(search);
  const summary = pickSummaryLine(search);
  const commission = formatCommissionForSeeker(search.commissionScheme);
  return `Hola, te comparto una búsqueda activa${location}:
${summary}
Comisión: ${commission}.
¿Tienes una opción que aplique? Responde sí o no.`;
}
