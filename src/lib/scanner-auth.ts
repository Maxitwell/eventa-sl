import jwt from "jsonwebtoken";

export type ScannerSessionClaims = {
  eventId: string;
  role: "scanner";
};

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET missing or too short");
  }
  return secret;
}

export function signScannerSession(eventId: string): string {
  return jwt.sign({ eventId, role: "scanner" }, getSecret(), {
    expiresIn: "12h",
  });
}

export function verifyScannerSession(token: string): ScannerSessionClaims {
  const decoded = jwt.verify(token, getSecret()) as ScannerSessionClaims;
  if (!decoded?.eventId || decoded.role !== "scanner") {
    throw new Error("Invalid scanner token");
  }
  return decoded;
}
