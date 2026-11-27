import { jwtVerify, SignJWT, type JWTPayload } from "jose";
import type { User } from "../contexts/users/domain/user.entity.js";

export type JWTOptions = {
  expiresIn: string | number;
  algorithm: string;
};

export async function createJWT(
  user: User,
  options?: Partial<JWTOptions>,
): Promise<string> {
  const optionsWithDefaults: JWTOptions = {
    expiresIn: options?.expiresIn || "1h",
    algorithm: options?.algorithm || "HS256",
  };

  // Explicit allow-list: the rows from login and refresh come from SELECT * /
  // RETURNING *, so they also hold the password and refresh token hashes,
  // which must never end up in the token.
  const payload = {
    sub: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: toISOString(readCreatedAt(user)),
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: optionsWithDefaults.algorithm })
    .setIssuedAt()
    .setExpirationTime(optionsWithDefaults.expiresIn)
    .sign(getJWTSecret());

  return token;
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getJWTSecret());
  return payload;
}

// pg-promise returns raw column names, so the row carries created_at rather
// than the createdAt declared on the entity.
function readCreatedAt(user: User): Date | string | undefined {
  return (
    user.createdAt ??
    (user as User & { created_at?: Date | string }).created_at
  );
}

function toISOString(value: Date | string | undefined): string | null {
  if (value === undefined || value === null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}
