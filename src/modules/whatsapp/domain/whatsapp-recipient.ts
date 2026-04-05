/**
 * Returns a string suitable for WhatsApp Cloud API `to` field, or null if unusable.
 */
export function resolveWhatsAppRecipient(
  whatsapp?: string | null | undefined,
  phone?: string | null | undefined,
): string | null {
  const raw = (whatsapp ?? "").trim() || (phone ?? "").trim();
  if (!raw) {
    return null;
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    return null;
  }
  return digits;
}
