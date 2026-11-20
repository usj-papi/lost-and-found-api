import type { PublicUser, User } from "../domain/user.entity.js";

export type NewUser = Omit<User, "role"> & { role?: User["role"] };

export type UserChanges = Partial<
  Pick<User, "username" | "name" | "email" | "password" | "role">
>;

export interface UsersRepository {
  findAll(): Promise<PublicUser[]>;
  findById(id: string): Promise<User | null>;
  findPublicById(id: string): Promise<PublicUser | null>;
  findByUsername(username: string): Promise<User | null>;
  create(entity: NewUser): Promise<PublicUser>;
  update(id: string, changes: UserChanges): Promise<PublicUser | null>;
  setRefreshToken(userId: string, hash: string, expiresAt: Date): Promise<void>;
  clearRefreshToken(userId: string): Promise<void>;
  // Atomically swaps a valid, unexpired refresh token for a new one and returns
  // the user, or null if the old token is unknown, expired or already used.
  rotateRefreshToken(
    oldHash: string,
    newHash: string,
    newExpiresAt: Date,
  ): Promise<User | null>;
  // Returns whether a session was revoked.
  revokeRefreshTokenByHash(hash: string): Promise<boolean>;
}
