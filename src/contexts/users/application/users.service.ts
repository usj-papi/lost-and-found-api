import type { PublicUser, User } from "../domain/user.entity.js";
import type {
  NewUser,
  UserChanges,
  UsersRepository,
} from "../infrastructure/users-repository.contract.js";

export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  findAll(): Promise<PublicUser[]> {
    return this.usersRepository.findAll();
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  findPublicById(id: string): Promise<PublicUser | null> {
    return this.usersRepository.findPublicById(id);
  }

  findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findByUsername(username);
  }

  create(entity: NewUser): Promise<PublicUser> {
    return this.usersRepository.create(entity);
  }

  update(id: string, changes: UserChanges): Promise<PublicUser | null> {
    return this.usersRepository.update(id, changes);
  }

  setRefreshToken(userId: string, hash: string, expiresAt: Date): Promise<void> {
    return this.usersRepository.setRefreshToken(userId, hash, expiresAt);
  }

  clearRefreshToken(userId: string): Promise<void> {
    return this.usersRepository.clearRefreshToken(userId);
  }

  rotateRefreshToken(
    oldHash: string,
    newHash: string,
    newExpiresAt: Date,
  ): Promise<User | null> {
    return this.usersRepository.rotateRefreshToken(
      oldHash,
      newHash,
      newExpiresAt,
    );
  }

  revokeRefreshTokenByHash(hash: string): Promise<boolean> {
    return this.usersRepository.revokeRefreshTokenByHash(hash);
  }
}
