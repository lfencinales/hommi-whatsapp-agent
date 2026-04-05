/**
 * Builds a wa.me deep link. `responderWhatsapp` may include spaces or +; digits are extracted.
 */
export function generateDirectWhatsAppLink(
  responderWhatsapp: string,
  prefilledText?: string | undefined,
): string {
  const digits = responderWhatsapp.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  if (prefilledText !== undefined && prefilledText.trim().length > 0) {
    return `${base}?text=${encodeURIComponent(prefilledText.trim())}`;
  }
  return base;
}
