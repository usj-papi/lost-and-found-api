import type { PublicUser, User } from "../domain/user.entity.js";
import type { UsersRepository } from "../infrastructure/users-repository.contract.js";

export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findByUsername(username);
  }

  create(entity: Omit<User, "role">): Promise<PublicUser> {
    return this.usersRepository.create(entity);
  }
}
