import type { NextFunction, Request, Response } from "express";

const defaultOrigins = ["http://localhost:4200", "http://127.0.0.1:4200"];

// Extra origins can be added with CORS_ORIGINS="https://a.com,https://b.com".
const allowedOrigins = new Set([
  ...defaultOrigins,
  ...(process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ??
    []),
]);

export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] ??
        "Content-Type,Authorization",
    );
    res.setHeader("Access-Control-Max-Age", "600");
  }

  // Answer preflight requests before they reach auth or routes.
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
}
