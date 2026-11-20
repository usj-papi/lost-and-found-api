import { compare, hash } from "bcrypt";
import type { Request, Response } from "express";
import type { JWTPayload } from "jose";
import { createJWT } from "../../../utils/jwt.js";
import {
  generateRefreshToken,
  hashRefreshToken,
} from "../../../utils/refresh-token.js";
import type { User } from "../domain/user.entity.js";
import type { UserChanges } from "../infrastructure/users-repository.contract.js";
import type { UsersService } from "./users.service.js";

// PostgreSQL error code for a UNIQUE constraint violation. Returns the name of
// the violated constraint or index, or null if it is not such an error.
function uniqueViolation(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  ) {
    return "constraint" in error && typeof error.constraint === "string"
      ? error.constraint
      : "";
  }
  return null;
}

// Deliberately loose: one "@", no spaces, and a dot in the domain.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rejects malformed ids before they reach PostgreSQL, which would fail with 22P02.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ROLES: readonly User["role"][] = ["visitor", "admin"];

const BCRYPT_ROUNDS = 10;

const ACCESS_TOKEN_TTL = "15m";

function readRefreshToken(body: Record<string, unknown>): string | null {
  const { refreshToken } = body;
  return typeof refreshToken === "string" && refreshToken ? refreshToken : null;
}

type NewUserFields = Pick<User, "username" | "password" | "name"> & {
  email: string;
};

type Validation<T> = { value: T } | { error: string };

function isRole(value: unknown): value is User["role"] {
  return ROLES.includes(value as User["role"]);
}

function normalizeEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  return EMAIL_PATTERN.test(normalized) ? normalized : null;
}

// Validation shared by public sign-up and admin creation.
function validateNewUser(body: Record<string, unknown>): Validation<NewUserFields> {
  const { username, password, name, email } = body;

  if (!username || !password || !name || !email) {
    return { error: "Username, password, name and email are required" };
  }

  if (typeof name !== "string" || typeof email !== "string" || !name.trim()) {
    return { error: "Name and email must be strings" };
  }

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return { error: "Invalid email" };
  }

  return {
    value: {
      username: username as string,
      password: password as string,
      name: name.trim(),
      email: normalizedEmail,
    },
  };
}

// Validation for a partial update. Unknown fields are ignored.
function validateUserChanges(
  body: Record<string, unknown>,
): Validation<UserChanges> {
  const fields = ["username", "password", "name", "email", "role"] as const;
  const provided = fields.filter((field) => body[field] !== undefined);

  if (provided.length === 0) {
    return { error: "At least one field is required" };
  }

  const changes: UserChanges = {};

  for (const field of provided) {
    const value = body[field];
    const text = typeof value === "string" ? value : "";
    // The password is kept as typed; every other field is trimmed.
    const cleaned = field === "password" ? text : text.trim();

    if (!cleaned) {
      return { error: `${field} must be a non-empty string` };
    }

    if (field === "email") {
      const normalizedEmail = normalizeEmail(cleaned);
      if (!normalizedEmail) {
        return { error: "Invalid email" };
      }
      changes.email = normalizedEmail;
    } else if (field === "role") {
      if (!isRole(cleaned)) {
        return { error: "Role must be 'visitor' or 'admin'" };
      }
      changes.role = cleaned;
    } else {
      changes[field] = cleaned;
    }
  }

  return { value: changes };
}

export class UsersController {
  constructor(private usersService: UsersService) {}

  async login(req: Request, res: Response) {
    const { username, password } = req.body ?? {};

    if (!username || !password) {
      res.status(400).json({ message: "Username and password are required" });
      return;
    }

    const user = await this.usersService.findByUsername(username);

    if (!user || !(await compare(password, user.password))) {
      res.status(401).json({ message: "Invalid username or password" });
      return;
    }

    // A new login replaces any previous refresh token: one session per user.
    const refresh = generateRefreshToken();
    await this.usersService.setRefreshToken(
      user.id,
      refresh.hash,
      refresh.expiresAt,
    );
    const token = await createJWT(user, { expiresIn: ACCESS_TOKEN_TTL });

    res.status(200).json({ token, refreshToken: refresh.token });
  }

  // Swaps a refresh token for a new JWT and a new refresh token. Works with an
  // expired JWT, and the new JWT carries the user's current username and role.
  async refresh(req: Request, res: Response) {
    const refreshToken = readRefreshToken(req.body ?? {});

    if (!refreshToken) {
      res.status(400).json({ message: "Refresh token is required" });
      return;
    }

    const next = generateRefreshToken();
    const user = await this.usersService.rotateRefreshToken(
      hashRefreshToken(refreshToken),
      next.hash,
      next.expiresAt,
    );

    if (!user) {
      res.status(401).json({ message: "Invalid or expired refresh token" });
      return;
    }

    const token = await createJWT(user, { expiresIn: ACCESS_TOKEN_TTL });

    res.status(200).json({ token, refreshToken: next.token });
  }

  // Ends the session of the given refresh token. Always 204, so callers cannot
  // probe whether a token was valid.
  async logout(req: Request, res: Response) {
    const refreshToken = readRefreshToken(req.body ?? {});

    if (!refreshToken) {
      res.status(400).json({ message: "Refresh token is required" });
      return;
    }

    await this.usersService.revokeRefreshTokenByHash(
      hashRefreshToken(refreshToken),
    );

    res.status(204).end();
  }

  // Public sign-up: always creates a visitor.
  async signup(req: Request, res: Response) {
    const result = validateNewUser(req.body ?? {});

    if ("error" in result) {
      res.status(400).json({ message: result.error });
      return;
    }

    await this.insertUser(res, result.value);
  }

  // Admin only.
  async getAllUsers(_req: Request, res: Response) {
    const users = await this.usersService.findAll();
    res.status(200).json(users);
  }

  // Admin only.
  async getUserById(req: Request, res: Response) {
    const id = this.parseId(req, res);
    if (!id) return;

    const user = await this.usersService.findPublicById(id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(user);
  }

  // Admin only: like sign-up, but the role can be chosen.
  async createUser(req: Request, res: Response) {
    const body = req.body ?? {};
    const result = validateNewUser(body);

    if ("error" in result) {
      res.status(400).json({ message: result.error });
      return;
    }

    const role = body.role ?? "visitor";

    if (!isRole(role)) {
      res.status(400).json({ message: "Role must be 'visitor' or 'admin'" });
      return;
    }

    await this.insertUser(res, { ...result.value, role });
  }

  // Admin only: partial update of any of username, password, name, email, role.
  async updateUser(req: Request, res: Response) {
    const id = this.parseId(req, res);
    if (!id) return;

    const result = validateUserChanges(req.body ?? {});

    if ("error" in result) {
      res.status(400).json({ message: result.error });
      return;
    }

    const changes = result.value;
    const current = await this.usersService.findPublicById(id);

    if (!current) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Stops an admin from demoting themselves and losing access to this API.
    const payload = res.locals.jwtPayload as JWTPayload | undefined;
    if (payload?.sub === id && changes.role && changes.role !== current.role) {
      res.status(400).json({ message: "You cannot change your own role" });
      return;
    }

    if (changes.password) {
      changes.password = await hash(changes.password, BCRYPT_ROUNDS);
    }

    try {
      const user = await this.usersService.update(id, changes);

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      // A new password ends the current session, so the user must log in again.
      if (changes.password) {
        await this.usersService.clearRefreshToken(id);
      }

      res.status(200).json(user);
    } catch (error) {
      if (!this.handleUniqueViolation(res, error)) throw error;
    }
  }

  private parseId(req: Request, res: Response): string | null {
    const id = req.params.id;

    if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
      res.status(400).json({ message: "Invalid id" });
      return null;
    }

    return id;
  }

  private async insertUser(
    res: Response,
    fields: NewUserFields & { role?: User["role"] },
  ) {
    const hashedPassword = await hash(fields.password, BCRYPT_ROUNDS);

    try {
      const user = await this.usersService.create({
        ...fields,
        id: crypto.randomUUID(),
        password: hashedPassword,
      });

      res.status(201).json(user);
    } catch (error) {
      if (!this.handleUniqueViolation(res, error)) throw error;
    }
  }

  // Maps a duplicate username or email to a 409. Returns false for other errors.
  private handleUniqueViolation(res: Response, error: unknown): boolean {
    const constraint = uniqueViolation(error);

    if (constraint === null) return false;

    const message =
      constraint === "users_email_key"
        ? "Email already exists"
        : "Username already exists";
    res.status(409).json({ message });
    return true;
  }
}
