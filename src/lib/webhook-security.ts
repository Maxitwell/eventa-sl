import crypto from "crypto";
import { getAdminDb } from "./firebase-admin";

function timingSafeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

// PawaPay does not send a secret header — the secret is embedded in the callback URL
// as a query parameter (?secret=<token>). This is the standard approach for providers
// that don't support webhook signing headers.
export function assertWebhookSecret(requestSecret: string | null): boolean {
  const expected = process.env.PAWAPAY_WEBHOOK_SECRET;
  if (!expected) {
    console.error("[Webhook] PAWAPAY_WEBHOOK_SECRET is not set — rejecting all webhook calls until configured");
    return false;
  }
  if (!requestSecret) return false;
  return timingSafeCompare(requestSecret, expected);
}

// Fix 7: wrap check+write in a transaction to eliminate TOCTOU race
// Two simultaneous deliveries of the same webhook can no longer both slip through.
export async function isWebhookReplay(idempotencyKey: string): Promise<boolean> {
  const adminDb = getAdminDb();
  const ref = adminDb.collection("webhookEvents").doc(idempotencyKey);
  let isReplay = false;
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      isReplay = true;
    } else {
      tx.set(ref, { processedAt: new Date().toISOString() });
    }
  });
  return isReplay;
}
