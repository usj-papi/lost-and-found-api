import { compare, hash } from "bcrypt";
import type { Request, Response } from "express";
import { createJWT } from "../../../utils/jwt.js";
import type { UsersService } from "./users.service.js";

// PostgreSQL error code for a UNIQUE constraint violation.
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
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

    const token = await createJWT(user, { expiresIn: "15m" });

    res.status(200).json({ token });
  }

  async signup(req: Request, res: Response) {
    const { username, password } = req.body ?? {};

    if (!username || !password) {
      res.status(400).json({ message: "Username and password are required" });
      return;
    }

    const hashedPassword = await hash(password, 10);

    try {
      const user = await this.usersService.create({
        id: crypto.randomUUID(),
        username,
        password: hashedPassword,
      });

      res.status(201).json(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({ message: "Username already exists" });
        return;
      }
      throw error;
    }
  }
}
