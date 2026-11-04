import type { NextFunction, Request, Response } from "express";

function getClientErrorStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const { status, statusCode } = err as {
    status?: unknown;
    statusCode?: unknown;
  };
  const code = typeof status === "number" ? status : statusCode;
  return typeof code === "number" && code >= 400 && code < 500
    ? code
    : undefined;
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const message = err instanceof Error ? err.message : String(err);

  const clientStatus = getClientErrorStatus(err);
  if (clientStatus) {
    res.status(clientStatus).json({ error: message });
    return;
  }

  console.error(err instanceof Error ? err.stack : err);
  res.status(500).json({ error: message });
}
