/** Build likely phone string variants to match Firestore `whatsapp` / `phone` fields. */

export function buildPhoneLookupVariants(rawFrom: string): string[] {
  const trimmed = rawFrom.trim();
  const digitsOnly = trimmed.replaceAll(/\D/g, "");
  const variants = new Set<string>();
  if (trimmed.length > 0) {
    variants.add(trimmed);
  }
  if (digitsOnly.length > 0) {
    variants.add(digitsOnly);
    variants.add(`+${digitsOnly}`);
  }
  return [...variants];
}
