import { Router } from "express";
import { PostgresDatabaseSingleton } from "../utils/db.js";

export function healthRoutes() {
  const router = Router();

  /**
   * @openapi
   * /health:
   *   get:
   *     tags: [Health]
   *     summary: Check that the API and database are reachable
   *     description: Runs a trivial query against the database. A scheduled job calls it to keep the Supabase project from being paused for inactivity.
   *     responses:
   *       200:
   *         description: API and database are up
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   *       503:
   *         description: Database unreachable
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get("/", async (_req, res) => {
    try {
      await PostgresDatabaseSingleton.getDB().one("SELECT 1");
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ message: "Database unreachable" });
    }
  });

  return router;
}
