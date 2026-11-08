import { Router } from "express";
import type { UsersController } from "../contexts/users/application/users.controller.js";

/**
 * @openapi
 * components:
 *   schemas:
 *     Credentials:
 *       type: object
 *       required: [username, password]
 *       properties:
 *         username:
 *           type: string
 *           example: user
 *         password:
 *           type: string
 *           format: password
 *           example: pass
 *     Token:
 *       type: object
 *       required: [token]
 *       properties:
 *         token:
 *           type: string
 *           description: JWT valid for 15 minutes
 */
export function authRoutes(usersController: UsersController) {
  const router = Router();

  /**
   * @openapi
   * /auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Log in and get a JWT
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Credentials'
   *     responses:
   *       200:
   *         description: Authenticated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Token'
   *       400:
   *         description: Username or password missing
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: Invalid username or password
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post("/login", (req, res) => usersController.login(req, res));

  /**
   * @openapi
   * /auth/signup:
   *   post:
   *     tags: [Auth]
   *     summary: Create a visitor account
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Credentials'
   *     responses:
   *       201:
   *         description: User created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PublicUser'
   *       400:
   *         description: Username or password missing
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       409:
   *         description: Username already exists
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post("/signup", (req, res) => usersController.signup(req, res));

  return router;
}
