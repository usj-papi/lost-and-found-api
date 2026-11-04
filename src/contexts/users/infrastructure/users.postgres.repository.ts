import type { IDatabase } from "pg-promise";
import { PostgresDatabaseSingleton } from "../../../utils/db.js";
import type { PublicUser, User } from "../domain/user.entity.js";
import type { UsersRepository } from "./users-repository.contract.js";

export class UsersPostgresRepository implements UsersRepository {
  private db: IDatabase<unknown>;

  constructor() {
    this.db = PostgresDatabaseSingleton.getDB();
  }

  findAll(): Promise<User[]> {
    const users = this.db.any<User>("SELECT * FROM users");
    return users;
  }
  findById(id: string): Promise<User | null> {
    const user = this.db.oneOrNone<User>("SELECT * FROM users WHERE id = $1", [
      id,
    ]);
    return user;
  }
  findByUsername(username: string): Promise<User | null> {
    const user = this.db.oneOrNone<User>(
      "SELECT * FROM users WHERE username = $1",
      [username],
    );
    return user;
  }
  create(entity: Omit<User, "role">): Promise<PublicUser> {
    const user = this.db.one<PublicUser>(
      "INSERT INTO users (id, username, password) VALUES ($1, $2, $3) RETURNING id, username, role, created_at",
      [entity.id, entity.username, entity.password],
    );
    return user;
  }
}
