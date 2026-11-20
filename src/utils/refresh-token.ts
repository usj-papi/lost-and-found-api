import { createHash, randomBytes } from "node:crypto";

// How long a refresh token stays valid after it is issued or rotated.
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type GeneratedRefreshToken = {
  // Sent to the client once. Never stored.
  token: string;
  // SHA-256 of the token. This is what the database keeps.
  hash: string;
  expiresAt: Date;
};

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateRefreshToken(): GeneratedRefreshToken {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    hash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  };
}
