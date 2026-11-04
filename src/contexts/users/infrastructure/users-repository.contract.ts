import type { PublicUser, User } from "../domain/user.entity.js";

export interface UsersRepository {
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  create(entity: Omit<User, "role">): Promise<PublicUser>;
}
