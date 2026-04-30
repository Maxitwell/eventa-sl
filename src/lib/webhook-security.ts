import crypto from "crypto";
import { getAdminDb } from "./firebase-admin";

function timingSafeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function assertWebhookSecret(requestSecret: string | null): boolean {
  const expected = process.env.PAWAPAY_WEBHOOK_SECRET;
  // If no secret is configured, allow through (set PAWAPAY_WEBHOOK_SECRET to lock down)
  if (!expected) return true;
  if (!requestSecret) return false;
  return timingSafeCompare(requestSecret, expected);
}

export async function isWebhookReplay(idempotencyKey: string): Promise<boolean> {
  const adminDb = getAdminDb();
  const ref = adminDb.collection("webhookEvents").doc(idempotencyKey);
  const snap = await ref.get();
  if (snap.exists) return true;
  await ref.set({ processedAt: new Date().toISOString() });
  return false;
}
