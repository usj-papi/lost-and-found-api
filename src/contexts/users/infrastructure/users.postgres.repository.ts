import type { IDatabase } from "pg-promise";
import { PostgresDatabaseSingleton } from "../../../utils/db.js";
import type { PublicUser, User } from "../domain/user.entity.js";
import type {
  NewUser,
  UserChanges,
  UsersRepository,
} from "./users-repository.contract.js";

// Every column except the password and refresh token hashes, which must never
// leave the API.
const PUBLIC_COLUMNS = "id, username, name, email, role, created_at";

// The only columns an update may touch. Keys outside this list are ignored,
// so the column names interpolated into the SQL are never user-controlled.
const UPDATABLE_COLUMNS = [
  "username",
  "name",
  "email",
  "password",
  "role",
] as const;

export class UsersPostgresRepository implements UsersRepository {
  private db: IDatabase<unknown>;

  constructor() {
    this.db = PostgresDatabaseSingleton.getDB();
  }

  findAll(): Promise<PublicUser[]> {
    return this.db.any<PublicUser>(
      `SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY created_at`,
    );
  }
  findById(id: string): Promise<User | null> {
    const user = this.db.oneOrNone<User>("SELECT * FROM users WHERE id = $1", [
      id,
    ]);
    return user;
  }
  findPublicById(id: string): Promise<PublicUser | null> {
    return this.db.oneOrNone<PublicUser>(
      `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`,
      [id],
    );
  }
  findByUsername(username: string): Promise<User | null> {
    const user = this.db.oneOrNone<User>(
      "SELECT * FROM users WHERE username = $1",
      [username],
    );
    return user;
  }
  create(entity: NewUser): Promise<PublicUser> {
    // Without a role, fall back to 'visitor', the column default.
    const user = this.db.one<PublicUser>(
      `INSERT INTO users (id, username, name, email, password, role)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'visitor'))
       RETURNING ${PUBLIC_COLUMNS}`,
      [
        entity.id,
        entity.username,
        entity.name,
        entity.email,
        entity.password,
        entity.role ?? null,
      ],
    );
    return user;
  }
  update(id: string, changes: UserChanges): Promise<PublicUser | null> {
    const columns = UPDATABLE_COLUMNS.filter(
      (column) => changes[column] !== undefined,
    );

    if (columns.length === 0) {
      return this.findPublicById(id);
    }

    const sets = columns.map((column) => `${column} = $(${column})`).join(", ");

    return this.db.oneOrNone<PublicUser>(
      `UPDATE users SET ${sets} WHERE id = $(id) RETURNING ${PUBLIC_COLUMNS}`,
      { ...changes, id },
    );
  }
  async setRefreshToken(
    userId: string,
    hash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.db.none(
      "UPDATE users SET refresh_token_hash = $2, refresh_token_expires_at = $3 WHERE id = $1",
      [userId, hash, expiresAt],
    );
  }
  async clearRefreshToken(userId: string): Promise<void> {
    await this.db.none(
      "UPDATE users SET refresh_token_hash = NULL, refresh_token_expires_at = NULL WHERE id = $1",
      [userId],
    );
  }
  rotateRefreshToken(
    oldHash: string,
    newHash: string,
    newExpiresAt: Date,
  ): Promise<User | null> {
    // A single statement, so two concurrent refreshes with the same token
    // cannot both succeed: the second no longer matches the old hash.
    return this.db.oneOrNone<User>(
      `UPDATE users
       SET refresh_token_hash = $2, refresh_token_expires_at = $3
       WHERE refresh_token_hash = $1 AND refresh_token_expires_at > now()
       RETURNING *`,
      [oldHash, newHash, newExpiresAt],
    );
  }
  async revokeRefreshTokenByHash(hash: string): Promise<boolean> {
    const result = await this.db.result(
      "UPDATE users SET refresh_token_hash = NULL, refresh_token_expires_at = NULL WHERE refresh_token_hash = $1",
      [hash],
    );
    return result.rowCount > 0;
  }
}
