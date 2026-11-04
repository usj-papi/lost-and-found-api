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

  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
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

function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}
