import type { NextFunction, Request, Response } from "express";
import { verifyJWT } from "../utils/jwt.js";

export function adminAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  authMiddleware(req, res, next, "admin");
}

export function visitorAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  authMiddleware(req, res, next, "visitor");
}

export function visitorOrAdminAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  authMiddleware(req, res, next);
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
  expectedRole?: "visitor" | "admin",
) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header missing" });
  }

  const regex = /^Bearer\s+(.+)$/i;
  const match = authHeader.match(regex);
  if (!match) {
    return res
      .status(401)
      .json({ message: "Invalid authorization header format" });
  }

  const token = match[1];

  if (!token) {
    return res.status(401).json({ message: "Token missing" });
  }

  verifyJWT(token)
    .then((payload) => {
      if (expectedRole && payload.role !== expectedRole) {
        return res
          .status(403)
          .json({ message: "Forbidden: Insufficient role" });
      }
      next();
    })
    .catch((error) => {
      console.error("JWT verification failed:", error);
      return res
        .status(401)
        .json({ message: "Invalid token", error: error.message });
    });
}
