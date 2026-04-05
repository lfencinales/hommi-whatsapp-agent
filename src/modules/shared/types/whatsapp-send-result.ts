export type SendTextMessageResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string; status?: number };
