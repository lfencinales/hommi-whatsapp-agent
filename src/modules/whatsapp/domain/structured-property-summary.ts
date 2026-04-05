import type { StructuredPropertySummary } from "./models.js";

function pickFirstInt(text: string, pattern: RegExp): number | null {
  const m = pattern.exec(text);
  if (!m || !m[1]) {
    return null;
  }
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Lightweight structuring for MVP: trimmed short text plus a few numeric hints when obvious.
 */
export function buildStructuredPropertySummary(rawText: string): StructuredPropertySummary {
  const cleaned = rawText.replace(/\s+/g, " ").trim();
  const lower = cleaned.toLowerCase();

  const bedrooms =
    pickFirstInt(lower, /(\d{1,2})\s*(?:hab|hab\.|habitaciones?)/i) ??
    pickFirstInt(lower, /(\d{1,2})\s*h\b/i);

  const bathrooms =
    pickFirstInt(lower, /(\d{1,2})\s*(?:baños?|banos?|ba\.)/i) ??
    pickFirstInt(lower, /(\d{1,2})\s*b\b/i);

  const area =
    pickFirstInt(lower, /(\d{2,5})\s*(?:m2|m²|mts2|metros)/i) ??
    pickFirstInt(lower, /(\d{2,5})\s*mt\b/i);

  let price: number | null = null;
  const priceMatch = /(?:\$|cop|pesos)\s*([\d]{5,})/i.exec(lower);
  if (priceMatch?.[1]) {
    price = Number.parseInt(priceMatch[1].replaceAll(/\D/g, ""), 10);
    if (!Number.isFinite(price)) {
      price = null;
    }
  }
  if (price === null) {
    const millions = /(\d{1,3}(?:[.,]\d+)?)\s*(?:millones?|mm)/i.exec(lower);
    if (millions?.[1]) {
      const base = Number.parseFloat(millions[1].replace(",", "."));
      if (Number.isFinite(base)) {
        price = Math.round(base * 1_000_000);
      }
    }
  }

  const shortSummary =
    cleaned.length > 420 ? `${cleaned.slice(0, 417).trimEnd()}…` : cleaned;

  return {
    shortSummary,
    extractedHints: {
      bedrooms: bedrooms ?? null,
      bathrooms: bathrooms ?? null,
      area: area ?? null,
      price: price ?? null,
    },
  };
}
