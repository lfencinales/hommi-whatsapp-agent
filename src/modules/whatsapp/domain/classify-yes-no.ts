import type { YesNoClassification } from "./models.js";

function normalizeForMatch(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

const NO_PHRASES = ["no tengo", "no me aplica", "no gracias"] as const;

const YES_PHRASES = ["de una", "por supuesto", "claro que si", "claro que sí"] as const;

const YES_TOKENS = new Set([
  "si",
  "claro",
  "tengo",
  "yes",
  "correcto",
  "ok",
  "dale",
]);

const NO_TOKENS = new Set(["no", "nop", "negativa", "nada", "nah", "noup"]);

/**
 * Deterministic yes/no detection for Spanish short replies. Easy to extend or replace later.
 */
export function classifyYesNoReply(text: string): YesNoClassification {
  const raw = text.trim();
  if (!raw) {
    return "ambiguous";
  }

  const normalized = normalizeForMatch(raw);
  if (!normalized) {
    return "ambiguous";
  }

  for (const phrase of NO_PHRASES) {
    const p = normalizeForMatch(phrase);
    if (normalized.includes(p)) {
      return "no";
    }
  }

  for (const phrase of YES_PHRASES) {
    const p = normalizeForMatch(phrase);
    if (normalized.includes(p)) {
      return "yes";
    }
  }

  if (normalized === "negativa") {
    return "no";
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  const first = words[0] ?? "";

  if (NO_TOKENS.has(normalized) || NO_TOKENS.has(first)) {
    return "no";
  }

  if (YES_TOKENS.has(normalized) || YES_TOKENS.has(first)) {
    return "yes";
  }

  return "ambiguous";
}
