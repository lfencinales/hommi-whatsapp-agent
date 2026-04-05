import type { Timestamp } from "firebase-admin/firestore";

export function isFirestoreTimestamp(val: unknown): val is Timestamp {
  return (
    val !== null &&
    typeof val === "object" &&
    "toMillis" in val &&
    typeof (val as Timestamp).toMillis === "function"
  );
}
