const MIN_LEN = 28;

const LOW_SIGNAL = new Set([
  "si",
  "sí",
  "no",
  "ok",
  "hola",
  "buenos dias",
  "buenas tardes",
  "buenas noches",
  "listo",
  "dale",
  "ya",
  "mmm",
]);

const LOW_SIGNAL_PHRASES = [
  "te la mando",
  "te lo mando",
  "luego te",
  "después te",
  "ahorita te",
  "en un rato",
  "sin detalle",
  "sin mas",
  "sin más",
];

/**
 * Pragmatic gate before creating formal responses/matches (no LLM).
 */
export function hasUsefulPropertySummary(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < MIN_LEN) {
    return false;
  }

  const normalized = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  if (LOW_SIGNAL.has(normalized)) {
    return false;
  }

  for (const phrase of LOW_SIGNAL_PHRASES) {
    if (normalized.includes(phrase)) {
      return false;
    }
  }

  const wordish = normalized.replace(/[^\p{L}\p{N}\s]/gu, " ");
  const tokens = wordish.split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length < 4) {
    return false;
  }

  return true;
}
