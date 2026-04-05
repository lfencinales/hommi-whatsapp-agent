/**
 * Human-readable commission line for outbound WhatsApp (MVP).
 */
export function formatCommissionForSeeker(commissionScheme: unknown): string {
  if (commissionScheme === null || commissionScheme === undefined) {
    return "Por definir con Hommi";
  }
  if (typeof commissionScheme === "string") {
    const s = commissionScheme.trim();
    return s.length > 0 ? s : "Por definir con Hommi";
  }
  if (typeof commissionScheme === "object") {
    const o = commissionScheme as Record<string, unknown>;
    const label = o["label"];
    if (typeof label === "string" && label.trim().length > 0) {
      return label.trim();
    }
    const summary = o["summary"];
    if (typeof summary === "string" && summary.trim().length > 0) {
      return summary.trim();
    }
    try {
      return JSON.stringify(commissionScheme);
    } catch {
      return "Ver detalle en Hommi";
    }
  }
  return String(commissionScheme);
}
